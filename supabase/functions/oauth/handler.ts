// Pure request-handling logic for the PLG OAuth 2.1 authorization server that
// backs the MCP connector flow (claude.ai "Add custom connector" and other
// spec-compliant MCP clients). No Supabase/network imports — only the
// dependency-free crypto/validation helpers in _shared/oauthCrypto.ts and the
// CORS helpers in _shared/cors.ts, both local files with no remote resolution —
// so this is unit-testable without any external module resolution. The real
// Supabase-backed implementation of OAuthDeps lives in deps.ts.
//
// Implements (see PR description for spec-ambiguity judgment calls):
//   - RFC 8414 Authorization Server Metadata:  GET  <issuer>/.well-known/oauth-authorization-server
//   - RFC 7591 Dynamic Client Registration:    POST <issuer>/register
//   - Authorization ("consent approved") step: POST <issuer>/authorize   (called by our own
//     frontend /oauth/authorize page after the user logs in via Supabase Auth and
//     approves the connector — NOT called directly by the MCP client's browser)
//   - Authorization Code -> Access Token:      POST <issuer>/token
import { getCorsHeaders, getPublicCorsHeaders } from "../_shared/cors.ts";
import {
  canonicalizeResourceUri,
  generateOpaqueToken,
  isAllowedRedirectUri,
  sha256Hex,
  verifyPkceS256,
} from "../_shared/oauthCrypto.ts";
import { isMcpEligiblePlan, type PlanTier } from "../_shared/planTier.ts";

// Authorization codes are short-lived per the MCP authorization spec's security
// guidance ("~10 min" per the task brief).
export const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

// TODO(follow-up): no refresh-token grant yet (see oauth_refresh_tokens TODO in
// the migration). Access tokens are opaque and reasonably long-lived (30 days)
// as a v1 tradeoff so a connected MCP client doesn't need to re-run the full
// browser consent flow constantly. Once refresh tokens exist, shorten this
// substantially (spec: "Authorization servers SHOULD issue short-lived access
// tokens") and rotate refresh tokens per OAuth 2.1 §4.3.1.
export const ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface StoredClient {
  clientId: string;
  clientSecretHash: string | null;
  clientName: string | null;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  tokenEndpointAuthMethod: string;
  scope: string | null;
}

export interface NewClientInput {
  redirectUris: string[];
  clientName: string | null;
  grantTypes: string[];
  responseTypes: string[];
  tokenEndpointAuthMethod: string;
  scope: string | null;
  clientUri: string | null;
  logoUri: string | null;
  contacts: string[] | null;
  tosUri: string | null;
  policyUri: string | null;
  softwareId: string | null;
  softwareVersion: string | null;
  /** true unless the client explicitly asked for token_endpoint_auth_method "none". */
  wantsSecret: boolean;
}

export interface SavedClientResult extends StoredClient {
  clientIdIssuedAt: number; // unix seconds
  clientSecret: string | null; // plaintext, returned to the caller exactly once
  clientSecretExpiresAt: number; // unix seconds; 0 = never expires
}

export interface StoredAuthorizationCode {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string | null;
  scope: string | null;
  expiresAt: number; // ms epoch
}

export interface OAuthDeps {
  getClient: (clientId: string) => Promise<StoredClient | null>;
  saveClient: (input: NewClientInput) => Promise<SavedClientResult>;
  /** Validates a Supabase user session JWT (the browser's existing PLG login). */
  verifySessionUser: (authHeader: string | null) => Promise<{ userId: string } | null>;
  getUserPlan: (userId: string) => Promise<PlanTier>;
  saveAuthorizationCode: (record: {
    codeHash: string;
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    resource: string | null;
    scope: string | null;
    expiresAt: number; // ms epoch
  }) => Promise<void>;
  /** Non-destructive lookup: returns the code record if it exists and is unused, else null.
   * Does NOT mark it used — callers must validate the request fully (client_id, redirect_uri,
   * expiry, PKCE) before calling markAuthorizationCodeUsed, so a mismatched/invalid exchange
   * attempt never burns a code the legitimate client hasn't redeemed yet. */
  getAuthorizationCode: (codeHash: string) => Promise<StoredAuthorizationCode | null>;
  /** Atomically marks the code used, but ONLY if it still exists and is unused — this is what
   * makes redemption replay-safe under concurrent attempts. Returns whether the claim
   * succeeded; false means it was already consumed (e.g. a race with another request). */
  markAuthorizationCodeUsed: (codeHash: string) => Promise<boolean>;
  saveAccessToken: (record: {
    tokenHash: string;
    userId: string;
    clientId: string;
    scope: string | null;
    expiresAt: number; // ms epoch
  }) => Promise<void>;
  /** Injectable clock so expiry logic is deterministic in tests. */
  now: () => number;
}

export interface OAuthConfig {
  /** e.g. https://<project>.supabase.co/functions/v1/oauth */
  issuer: string;
  /** The frontend's consent-screen URL, e.g. https://propertylistinggenerator.com/oauth/authorize */
  authorizationEndpoint: string;
  /** Canonical URI of the MCP resource server (RFC 8707), e.g. https://<project>.supabase.co/functions/v1/mcp */
  resource: string;
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function buildAuthorizationServerMetadata(config: OAuthConfig): Record<string, unknown> {
  return {
    issuer: config.issuer,
    authorization_endpoint: config.authorizationEndpoint,
    token_endpoint: `${config.issuer}/token`,
    registration_endpoint: `${config.issuer}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    scopes_supported: ["mcp"],
    service_documentation: "https://propertylistinggenerator.com/pricing",
  };
}

type RegistrationValidation =
  | { ok: true; value: NewClientInput }
  | { ok: false; error: string; description: string };

export function validateRegistration(body: unknown): RegistrationValidation {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description: "Request body must be a JSON object.",
    };
  }
  const b = body as Record<string, unknown>;

  const redirectUrisRaw = b.redirect_uris;
  if (!Array.isArray(redirectUrisRaw) || redirectUrisRaw.length === 0) {
    return {
      ok: false,
      error: "invalid_redirect_uri",
      description: "redirect_uris is required and must be a non-empty array.",
    };
  }
  const redirectUris: string[] = [];
  for (const u of redirectUrisRaw) {
    if (typeof u !== "string" || !isAllowedRedirectUri(u)) {
      return {
        ok: false,
        error: "invalid_redirect_uri",
        description: `Redirect URI "${String(u)}" must be https:// (or http://localhost for local dev clients).`,
      };
    }
    redirectUris.push(u);
  }

  const tokenEndpointAuthMethod =
    typeof b.token_endpoint_auth_method === "string" ? b.token_endpoint_auth_method : "none";
  if (!["none", "client_secret_post", "client_secret_basic"].includes(tokenEndpointAuthMethod)) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description:
        "Unsupported token_endpoint_auth_method; use 'none', 'client_secret_post', or 'client_secret_basic'.",
    };
  }

  const grantTypes =
    Array.isArray(b.grant_types) && b.grant_types.every((g) => typeof g === "string")
      ? (b.grant_types as string[])
      : ["authorization_code"];
  if (!grantTypes.includes("authorization_code")) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description: "Only the authorization_code grant type is supported.",
    };
  }

  const responseTypes =
    Array.isArray(b.response_types) && b.response_types.every((r) => typeof r === "string")
      ? (b.response_types as string[])
      : ["code"];

  return {
    ok: true,
    value: {
      redirectUris,
      clientName: typeof b.client_name === "string" ? b.client_name : null,
      grantTypes,
      responseTypes,
      tokenEndpointAuthMethod,
      scope: typeof b.scope === "string" ? b.scope : null,
      clientUri: typeof b.client_uri === "string" ? b.client_uri : null,
      logoUri: typeof b.logo_uri === "string" ? b.logo_uri : null,
      contacts: Array.isArray(b.contacts)
        ? b.contacts.filter((c): c is string => typeof c === "string")
        : null,
      tosUri: typeof b.tos_uri === "string" ? b.tos_uri : null,
      policyUri: typeof b.policy_uri === "string" ? b.policy_uri : null,
      softwareId: typeof b.software_id === "string" ? b.software_id : null,
      softwareVersion: typeof b.software_version === "string" ? b.software_version : null,
      wantsSecret: tokenEndpointAuthMethod !== "none",
    },
  };
}

async function handleRegister(req: Request, deps: OAuthDeps): Promise<Response> {
  const corsHeaders = getPublicCorsHeaders();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(
      { error: "invalid_client_metadata", error_description: "Request body must be JSON." },
      400,
      corsHeaders,
    );
  }

  const validated = validateRegistration(body);
  if (!validated.ok) {
    return json(
      { error: validated.error, error_description: validated.description },
      400,
      corsHeaders,
    );
  }

  const saved = await deps.saveClient(validated.value);
  const response: Record<string, unknown> = {
    client_id: saved.clientId,
    client_id_issued_at: saved.clientIdIssuedAt,
    redirect_uris: saved.redirectUris,
    token_endpoint_auth_method: saved.tokenEndpointAuthMethod,
    grant_types: saved.grantTypes,
    response_types: saved.responseTypes,
  };
  if (saved.clientName) response.client_name = saved.clientName;
  if (saved.scope) response.scope = saved.scope;
  if (saved.clientSecret) {
    response.client_secret = saved.clientSecret;
    response.client_secret_expires_at = saved.clientSecretExpiresAt;
  }
  return json(response, 201, corsHeaders);
}

async function handleAuthorize(
  req: Request,
  deps: OAuthDeps,
  config: OAuthConfig,
): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const caller = await deps.verifySessionUser(authHeader);
  if (!caller) {
    return json(
      { error: "access_denied", error_description: "Sign in to your PLG account first." },
      401,
      corsHeaders,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(
      { error: "invalid_request", error_description: "Body must be JSON." },
      400,
      corsHeaders,
    );
  }
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const clientId = typeof b.client_id === "string" ? b.client_id : "";
  const redirectUri = typeof b.redirect_uri === "string" ? b.redirect_uri : "";
  const codeChallenge = typeof b.code_challenge === "string" ? b.code_challenge : "";
  const codeChallengeMethod =
    typeof b.code_challenge_method === "string" ? b.code_challenge_method : "";
  const state = typeof b.state === "string" ? b.state : null;
  const resource = typeof b.resource === "string" ? b.resource : null;
  const scope = typeof b.scope === "string" ? b.scope : null;

  if (!clientId || !redirectUri) {
    return json(
      { error: "invalid_request", error_description: "client_id and redirect_uri are required." },
      400,
      corsHeaders,
    );
  }

  const client = await deps.getClient(clientId);
  if (!client) {
    return json(
      { error: "invalid_client", error_description: "Unknown client_id." },
      400,
      corsHeaders,
    );
  }
  if (!client.redirectUris.includes(redirectUri)) {
    // Do NOT redirect on a redirect_uri mismatch — that's the exact open-redirect
    // this check exists to prevent (OAuth 2.1 / MCP spec "Open Redirection").
    return json(
      {
        error: "invalid_request",
        error_description: "redirect_uri is not registered for this client.",
      },
      400,
      corsHeaders,
    );
  }

  // From here on redirect_uri is a trusted, pre-registered value, so request
  // errors are reported by handing the frontend a redirect URL carrying
  // `error=`/`error_description=` (the standard OAuth Authorization Response
  // error shape) rather than a bare JSON error — EXCEPT the plan gate below,
  // which deliberately stays on our own page instead of bouncing back to the
  // client (see "upgradeRequired" below).
  if (codeChallengeMethod !== "S256" || !codeChallenge) {
    return json(
      {
        redirectUrl: buildErrorRedirect(
          redirectUri,
          state,
          "invalid_request",
          "PKCE S256 code_challenge is required.",
        ),
      },
      200,
      corsHeaders,
    );
  }
  if (resource) {
    const canonicalResource = canonicalizeResourceUri(resource);
    if (!canonicalResource || canonicalResource !== config.resource) {
      return json(
        {
          redirectUrl: buildErrorRedirect(
            redirectUri,
            state,
            "invalid_target",
            "resource does not match this server.",
          ),
        },
        200,
        corsHeaders,
      );
    }
  }

  // --- Paid-tier gate: MCP access requires Pro or Elite. This is the primary
  // gate (nicer UX per the product requirement) — reject BEFORE a code is ever
  // minted, so a free-tier user can never complete the OAuth dance. deps.ts's
  // real getUserPlan() re-reads the subscriptions table live (not a claim
  // baked into the session JWT), so this reflects the user's plan right now.
  const plan = await deps.getUserPlan(caller.userId);
  if (!isMcpEligiblePlan(plan)) {
    return json({ upgradeRequired: true, plan }, 200, corsHeaders);
  }

  const code = generateOpaqueToken();
  const codeHash = await sha256Hex(code);
  await deps.saveAuthorizationCode({
    codeHash,
    clientId,
    userId: caller.userId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    resource,
    scope,
    expiresAt: deps.now() + AUTH_CODE_TTL_MS,
  });

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  return json({ redirectUrl: redirectUrl.toString() }, 200, corsHeaders);
}

function buildErrorRedirect(
  redirectUri: string,
  state: string | null,
  error: string,
  description: string,
): string {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  u.searchParams.set("error_description", description);
  if (state) u.searchParams.set("state", state);
  return u.toString();
}

async function parseTokenRequestBody(req: Request): Promise<Record<string, string> | null> {
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (typeof body !== "object" || body === null) return null;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    }
    // OAuth 2.1 / RFC 6749 §4.1.3: token requests are application/x-www-form-urlencoded.
    // We accept that as the default (and JSON above as a permissive fallback).
    const text = await req.text();
    const out: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(text)) out[k] = v;
    return out;
  } catch {
    return null;
  }
}

function extractBasicAuthSecret(req: Request, expectedClientId: string): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice("Basic ".length));
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    const id = decodeURIComponent(decoded.slice(0, idx));
    const secret = decodeURIComponent(decoded.slice(idx + 1));
    return id === expectedClientId ? secret : null;
  } catch {
    return null;
  }
}

async function handleToken(req: Request, deps: OAuthDeps, config: OAuthConfig): Promise<Response> {
  const corsHeaders = getPublicCorsHeaders();
  const params = await parseTokenRequestBody(req);
  if (!params) {
    return json(
      {
        error: "invalid_request",
        error_description: "Body must be application/x-www-form-urlencoded or JSON.",
      },
      400,
      corsHeaders,
    );
  }

  if (params.grant_type !== "authorization_code") {
    return json({ error: "unsupported_grant_type" }, 400, corsHeaders);
  }

  const {
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  } = params;
  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return json(
      {
        error: "invalid_request",
        error_description: "code, redirect_uri, client_id, and code_verifier are required.",
      },
      400,
      corsHeaders,
    );
  }

  const client = await deps.getClient(clientId);
  if (!client) return json({ error: "invalid_client" }, 401, corsHeaders);

  if (client.tokenEndpointAuthMethod !== "none") {
    const clientSecret = params.client_secret ?? extractBasicAuthSecret(req, clientId);
    const providedHash = clientSecret ? await sha256Hex(clientSecret) : null;
    if (!providedHash || !client.clientSecretHash || providedHash !== client.clientSecretHash) {
      return json({ error: "invalid_client" }, 401, corsHeaders);
    }
  }

  // Peek the code WITHOUT consuming it yet. Validate everything about this exchange request
  // first (expiry, client_id/redirect_uri, PKCE, resource, plan) and only atomically mark the
  // code used once the request is fully valid — otherwise a single malformed/mismatched
  // exchange attempt (a client bug, a proxy retry, or an attacker who merely observed the
  // code) would permanently burn a code the legitimate client hasn't redeemed yet, since
  // marking it used is irreversible.
  const codeHash = await sha256Hex(code);
  const record = await deps.getAuthorizationCode(codeHash);
  if (!record) {
    return json(
      {
        error: "invalid_grant",
        error_description: "Authorization code is invalid, expired, or already used.",
      },
      400,
      corsHeaders,
    );
  }
  if (record.expiresAt <= deps.now()) {
    return json(
      { error: "invalid_grant", error_description: "Authorization code expired." },
      400,
      corsHeaders,
    );
  }
  if (record.clientId !== clientId || record.redirectUri !== redirectUri) {
    return json(
      { error: "invalid_grant", error_description: "client_id/redirect_uri mismatch." },
      400,
      corsHeaders,
    );
  }
  if (
    record.codeChallengeMethod !== "S256" ||
    !(await verifyPkceS256(codeVerifier, record.codeChallenge))
  ) {
    return json(
      { error: "invalid_grant", error_description: "PKCE verification failed." },
      400,
      corsHeaders,
    );
  }
  if (params.resource) {
    const canonicalResource = canonicalizeResourceUri(params.resource);
    if (!canonicalResource || canonicalResource !== config.resource) {
      return json({ error: "invalid_target" }, 400, corsHeaders);
    }
  }

  // Re-check the plan at redemption time too (defense in depth alongside the
  // /authorize gate above) — covers the narrow window where a user's plan
  // changes between approving the connector and the client redeeming the code.
  const plan = await deps.getUserPlan(record.userId);
  if (!isMcpEligiblePlan(plan)) {
    return json(
      { error: "access_denied", error_description: "MCP access requires a Pro or Elite plan." },
      403,
      corsHeaders,
    );
  }

  // Every check passed — NOW atomically consume the code. Still conditional on it being
  // unused, so this remains replay-safe under a concurrent redemption attempt (the loser
  // gets false here rather than a duplicate token).
  const claimed = await deps.markAuthorizationCodeUsed(codeHash);
  if (!claimed) {
    return json(
      {
        error: "invalid_grant",
        error_description: "Authorization code was already redeemed.",
      },
      400,
      corsHeaders,
    );
  }

  const accessToken = generateOpaqueToken();
  const tokenHash = await sha256Hex(accessToken);
  const expiresAt = deps.now() + ACCESS_TOKEN_TTL_MS;
  await deps.saveAccessToken({
    tokenHash,
    userId: record.userId,
    clientId,
    scope: record.scope,
    expiresAt,
  });

  return json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      ...(record.scope ? { scope: record.scope } : {}),
    },
    200,
    corsHeaders,
  );
}

export async function handleRequest(
  req: Request,
  deps: OAuthDeps,
  config: OAuthConfig,
): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: path.endsWith("/authorize") ? getCorsHeaders(req) : getPublicCorsHeaders(),
    });
  }

  if (req.method === "GET" && path.endsWith("/.well-known/oauth-authorization-server")) {
    return json(buildAuthorizationServerMetadata(config), 200, getPublicCorsHeaders());
  }
  if (req.method === "POST" && path.endsWith("/register")) {
    return handleRegister(req, deps);
  }
  if (req.method === "POST" && path.endsWith("/authorize")) {
    return handleAuthorize(req, deps, config);
  }
  if (req.method === "POST" && path.endsWith("/token")) {
    return handleToken(req, deps, config);
  }

  return json({ error: "not_found" }, 404, getPublicCorsHeaders());
}
