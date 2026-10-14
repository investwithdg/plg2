// Smoke tests for the OAuth authorization server edge function. Real
// network/Supabase calls are never exercised — handleRequest() takes an
// injectable OAuthDeps so these test the request/response contract, PKCE/expiry
// validation, and (most importantly) the Pro/Elite plan gate, not the live
// services behind it.
import { assertEquals } from "../_shared/testAssert.ts";
import {
  ACCESS_TOKEN_TTL_MS,
  AUTH_CODE_TTL_MS,
  buildAuthorizationServerMetadata,
  handleRequest,
  validateRegistration,
  type NewClientInput,
  type OAuthConfig,
  type OAuthDeps,
  type SavedClientResult,
  type StoredAuthorizationCode,
  type StoredClient,
} from "./handler.ts";
import { generateOpaqueToken, sha256Hex, verifyPkceS256 } from "../_shared/oauthCrypto.ts";

const CONFIG: OAuthConfig = {
  issuer: "https://project.supabase.co/functions/v1/oauth",
  authorizationEndpoint: "https://propertylistinggenerator.com/oauth/authorize",
  resource: "https://project.supabase.co/functions/v1/mcp",
};

const REGISTERED_CLIENT: StoredClient = {
  clientId: "client-1",
  clientSecretHash: null,
  clientName: "Test MCP Client",
  clientUri: "https://claude.ai",
  logoUri: null,
  redirectUris: ["https://claude.ai/api/mcp/callback"],
  grantTypes: ["authorization_code"],
  responseTypes: ["code"],
  tokenEndpointAuthMethod: "none",
  scope: "mcp",
};

function fakeDeps(overrides: Partial<OAuthDeps> = {}, clock = { now: 1_000_000 }): OAuthDeps {
  const clients = new Map<string, StoredClient>([[REGISTERED_CLIENT.clientId, REGISTERED_CLIENT]]);
  const codes = new Map<string, StoredAuthorizationCode & { used: boolean }>();
  const tokens: {
    tokenHash: string;
    userId: string;
    clientId: string;
    scope: string | null;
    expiresAt: number;
  }[] = [];

  return {
    async getClient(clientId) {
      return clients.get(clientId) ?? null;
    },
    async saveClient(input: NewClientInput): Promise<SavedClientResult> {
      const clientId = "client-new";
      const stored: StoredClient = {
        clientId,
        clientSecretHash: null,
        clientName: input.clientName,
        clientUri: input.clientUri,
        logoUri: input.logoUri,
        redirectUris: input.redirectUris,
        grantTypes: input.grantTypes,
        responseTypes: input.responseTypes,
        tokenEndpointAuthMethod: input.tokenEndpointAuthMethod,
        scope: input.scope,
      };
      clients.set(clientId, stored);
      return {
        ...stored,
        clientIdIssuedAt: 1234,
        clientSecret: input.wantsSecret ? "generated-secret" : null,
        clientSecretExpiresAt: 0,
      };
    },
    async verifySessionUser(authHeader) {
      if (authHeader === "Bearer valid-session") return { userId: "user-1" };
      return null;
    },
    async getUserPlan(userId) {
      return userId === "user-1" ? "pro" : "free";
    },
    async saveAuthorizationCode(record) {
      codes.set(record.codeHash, { ...record, used: false });
    },
    async getAuthorizationCode(codeHash) {
      const record = codes.get(codeHash);
      if (!record || record.used) return null;
      return record;
    },
    async markAuthorizationCodeUsed(codeHash) {
      const record = codes.get(codeHash);
      if (!record || record.used) return false;
      record.used = true;
      return true;
    },
    async saveAccessToken(record) {
      tokens.push(record);
    },
    now: () => clock.now,
    ...overrides,
  };
}

function req(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

// ---------- Metadata ----------

Deno.test(
  "metadata: GET .well-known/oauth-authorization-server returns the expected shape",
  async () => {
    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/.well-known/oauth-authorization-server"),
      fakeDeps(),
      CONFIG,
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.issuer, CONFIG.issuer);
    assertEquals(body.authorization_endpoint, CONFIG.authorizationEndpoint);
    assertEquals(body.token_endpoint, `${CONFIG.issuer}/token`);
    assertEquals(body.registration_endpoint, `${CONFIG.issuer}/register`);
    assertEquals(body.grant_types_supported, ["authorization_code"]);
    assertEquals(body.response_types_supported, ["code"]);
    assertEquals(body.code_challenge_methods_supported, ["S256"]);
  },
);

Deno.test("buildAuthorizationServerMetadata is a pure function of config", () => {
  const metadata = buildAuthorizationServerMetadata(CONFIG);
  assertEquals(metadata.issuer, CONFIG.issuer);
});

// ---------- Dynamic client registration (RFC 7591) ----------

Deno.test("validateRegistration rejects a missing redirect_uris", () => {
  const result = validateRegistration({});
  assertEquals(result.ok, false);
  assertEquals((result as { error: string }).error, "invalid_redirect_uri");
});

Deno.test("validateRegistration rejects a non-https, non-localhost redirect_uri", () => {
  const result = validateRegistration({ redirect_uris: ["http://evil.example.com/cb"] });
  assertEquals(result.ok, false);
  assertEquals((result as { error: string }).error, "invalid_redirect_uri");
});

Deno.test(
  "validateRegistration accepts a well-formed public-client request and defaults grant/response types",
  () => {
    const result = validateRegistration({
      redirect_uris: ["https://claude.ai/api/mcp/callback"],
      client_name: "Claude",
    });
    assertEquals(result.ok, true);
    const value = (result as { ok: true; value: NewClientInput }).value;
    assertEquals(value.grantTypes, ["authorization_code"]);
    assertEquals(value.responseTypes, ["code"]);
    assertEquals(value.tokenEndpointAuthMethod, "none");
    assertEquals(value.wantsSecret, false);
  },
);

Deno.test("POST /register returns a 201 with client_id and echoes redirect_uris", async () => {
  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/register", {
      method: "POST",
      body: JSON.stringify({ redirect_uris: ["https://claude.ai/api/mcp/callback"] }),
    }),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.client_id, "client-new");
  assertEquals(body.redirect_uris, ["https://claude.ai/api/mcp/callback"]);
  assertEquals(body.client_secret, undefined);
});

Deno.test("POST /register with malformed JSON returns invalid_client_metadata", async () => {
  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/register", {
      method: "POST",
      body: "not json",
    }),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "invalid_client_metadata");
});

// ---------- Client info (consent-screen identity disclosure) ----------
//
// Dynamic client registration (above) is unauthenticated, so anyone can register a client
// pointing at their own redirect_uri. Without a way for the consent screen to show *which*
// app is asking, a phishing page could register its own client and get a signed-in user to
// approve it under a blank "an app wants access" prompt. These tests cover the fix: a public,
// pre-consent lookup of the client's display identity only (never its secret hash).

Deno.test(
  "POST /client-info returns the client's display identity for a known client_id",
  async () => {
    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/client-info", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: REGISTERED_CLIENT.clientId }),
      }),
      fakeDeps(),
      CONFIG,
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.client_id, REGISTERED_CLIENT.clientId);
    assertEquals(body.client_name, REGISTERED_CLIENT.clientName);
    assertEquals(body.client_uri, REGISTERED_CLIENT.clientUri);
    // Never the secret hash or anything else from the row.
    assertEquals(Object.prototype.hasOwnProperty.call(body, "client_secret_hash"), false);
    assertEquals(Object.prototype.hasOwnProperty.call(body, "redirect_uris"), false);
  },
);

Deno.test(
  "POST /client-info 404s for an unknown client_id rather than leaking existence info",
  async () => {
    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/client-info", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: "does-not-exist" }),
      }),
      fakeDeps(),
      CONFIG,
    );
    assertEquals(res.status, 404);
    const body = await res.json();
    assertEquals(body.error, "invalid_client");
  },
);

Deno.test("POST /client-info requires a client_id", async () => {
  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/client-info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(res.status, 400);
});

// ---------- Authorize (plan gate is the important part) ----------

Deno.test("POST /authorize without a session is rejected with access_denied", async () => {
  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/authorize", {
      method: "POST",
      body: JSON.stringify({
        client_id: REGISTERED_CLIENT.clientId,
        redirect_uri: REGISTERED_CLIENT.redirectUris[0],
        code_challenge: "abc",
        code_challenge_method: "S256",
      }),
    }),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "access_denied");
});

Deno.test(
  "POST /authorize for a free-tier user returns upgradeRequired and mints NO code",
  async () => {
    const deps = fakeDeps({
      verifySessionUser: async (h) =>
        h === "Bearer valid-session" ? { userId: "free-user" } : null,
      getUserPlan: async () => "free",
    });
    let codeSaved = false;
    const wrapped: OAuthDeps = {
      ...deps,
      saveAuthorizationCode: async (r) => {
        codeSaved = true;
        return deps.saveAuthorizationCode(r);
      },
    };

    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/authorize", {
        method: "POST",
        headers: { Authorization: "Bearer valid-session" },
        body: JSON.stringify({
          client_id: REGISTERED_CLIENT.clientId,
          redirect_uri: REGISTERED_CLIENT.redirectUris[0],
          code_challenge: "abc",
          code_challenge_method: "S256",
        }),
      }),
      wrapped,
      CONFIG,
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.upgradeRequired, true);
    assertEquals(body.plan, "free");
    assertEquals(body.redirectUrl, undefined);
    assertEquals(codeSaved, false);
  },
);

Deno.test(
  "POST /authorize for a Pro user with an unknown client_id fails closed (no redirect leak)",
  async () => {
    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/authorize", {
        method: "POST",
        headers: { Authorization: "Bearer valid-session" },
        body: JSON.stringify({
          client_id: "does-not-exist",
          redirect_uri: "https://evil.example.com/cb",
          code_challenge: "abc",
          code_challenge_method: "S256",
        }),
      }),
      fakeDeps(),
      CONFIG,
    );
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "invalid_client");
  },
);

Deno.test(
  "POST /authorize rejects a redirect_uri not registered for the client (no redirect leak)",
  async () => {
    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/authorize", {
        method: "POST",
        headers: { Authorization: "Bearer valid-session" },
        body: JSON.stringify({
          client_id: REGISTERED_CLIENT.clientId,
          redirect_uri: "https://attacker.example.com/cb",
          code_challenge: "abc",
          code_challenge_method: "S256",
        }),
      }),
      fakeDeps(),
      CONFIG,
    );
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "invalid_request");
  },
);

Deno.test(
  "POST /authorize for a Pro user with a valid request returns a redirectUrl carrying code + state",
  async () => {
    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/authorize", {
        method: "POST",
        headers: { Authorization: "Bearer valid-session" },
        body: JSON.stringify({
          client_id: REGISTERED_CLIENT.clientId,
          redirect_uri: REGISTERED_CLIENT.redirectUris[0],
          code_challenge: "abc",
          code_challenge_method: "S256",
          state: "xyz123",
        }),
      }),
      fakeDeps(),
      CONFIG,
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    const url = new URL(body.redirectUrl);
    assertEquals(url.origin + url.pathname, REGISTERED_CLIENT.redirectUris[0]);
    assertEquals(url.searchParams.get("state"), "xyz123");
    assertEquals(typeof url.searchParams.get("code"), "string");
  },
);

// ---------- Token exchange ----------

async function seedAuthorizedCode(
  deps: OAuthDeps,
  overrides: Partial<StoredAuthorizationCode> = {},
) {
  const verifier = "test-code-verifier-with-enough-entropy-1234567890";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const code = generateOpaqueToken();
  const codeHash = await sha256Hex(code);
  await deps.saveAuthorizationCode({
    codeHash,
    clientId: REGISTERED_CLIENT.clientId,
    userId: "user-1",
    redirectUri: REGISTERED_CLIENT.redirectUris[0],
    codeChallenge: challenge,
    codeChallengeMethod: "S256",
    resource: null,
    scope: "mcp",
    expiresAt: 1_000_000 + AUTH_CODE_TTL_MS,
    ...overrides,
  });
  return { code, verifier };
}

Deno.test(
  "PKCE: verifyPkceS256 accepts the matching verifier and rejects a wrong one",
  async () => {
    const verifier = "correct-verifier";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    assertEquals(await verifyPkceS256(verifier, challenge), true);
    assertEquals(await verifyPkceS256("wrong-verifier", challenge), false);
  },
);

Deno.test("POST /token exchanges a valid code + verifier for an access token", async () => {
  const deps = fakeDeps();
  const { code, verifier } = await seedAuthorizedCode(deps);

  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REGISTERED_CLIENT.redirectUris[0],
        client_id: REGISTERED_CLIENT.clientId,
        code_verifier: verifier,
      }),
    }),
    deps,
    CONFIG,
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.token_type, "Bearer");
  assertEquals(body.expires_in, Math.floor(ACCESS_TOKEN_TTL_MS / 1000));
  assertEquals(typeof body.access_token, "string");
});

Deno.test("POST /token rejects code reuse (replay)", async () => {
  const deps = fakeDeps();
  const { code, verifier } = await seedAuthorizedCode(deps);
  const makeReq = () =>
    req("https://project.supabase.co/functions/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REGISTERED_CLIENT.redirectUris[0],
        client_id: REGISTERED_CLIENT.clientId,
        code_verifier: verifier,
      }),
    });

  const first = await handleRequest(makeReq(), deps, CONFIG);
  assertEquals(first.status, 200);

  const second = await handleRequest(makeReq(), deps, CONFIG);
  assertEquals(second.status, 400);
  const secondBody = await second.json();
  assertEquals(secondBody.error, "invalid_grant");
});

Deno.test("POST /token rejects an expired code", async () => {
  const deps = fakeDeps();
  const { code, verifier } = await seedAuthorizedCode(deps, { expiresAt: 500 }); // already before now() = 1_000_000

  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REGISTERED_CLIENT.redirectUris[0],
        client_id: REGISTERED_CLIENT.clientId,
        code_verifier: verifier,
      }),
    }),
    deps,
    CONFIG,
  );
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "invalid_grant");
});

Deno.test("POST /token rejects a mismatched code_verifier (PKCE failure)", async () => {
  const deps = fakeDeps();
  const { code } = await seedAuthorizedCode(deps);

  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REGISTERED_CLIENT.redirectUris[0],
        client_id: REGISTERED_CLIENT.clientId,
        code_verifier: "totally-wrong-verifier",
      }),
    }),
    deps,
    CONFIG,
  );
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "invalid_grant");
});

Deno.test(
  "POST /token: a mismatched PKCE verifier does NOT burn the code — the legitimate client can still redeem it",
  async () => {
    const deps = fakeDeps();
    const { code, verifier } = await seedAuthorizedCode(deps);

    const badAttempt = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: REGISTERED_CLIENT.redirectUris[0],
          client_id: REGISTERED_CLIENT.clientId,
          code_verifier: "wrong-verifier",
        }),
      }),
      deps,
      CONFIG,
    );
    assertEquals(badAttempt.status, 400);

    // The code must still be redeemable with the correct verifier — a failed exchange
    // attempt must validate before it consumes, never after.
    const goodAttempt = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: REGISTERED_CLIENT.redirectUris[0],
          client_id: REGISTERED_CLIENT.clientId,
          code_verifier: verifier,
        }),
      }),
      deps,
      CONFIG,
    );
    assertEquals(goodAttempt.status, 200);
    const body = await goodAttempt.json();
    assertEquals(typeof body.access_token, "string");
  },
);

Deno.test(
  "POST /token: a wrong client_id/redirect_uri does NOT burn the code — the legitimate client can still redeem it",
  async () => {
    const deps = fakeDeps();
    const { code, verifier } = await seedAuthorizedCode(deps);

    const badAttempt = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: "https://attacker.example.com/cb",
          client_id: REGISTERED_CLIENT.clientId,
          code_verifier: verifier,
        }),
      }),
      deps,
      CONFIG,
    );
    assertEquals(badAttempt.status, 400);

    const goodAttempt = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: REGISTERED_CLIENT.redirectUris[0],
          client_id: REGISTERED_CLIENT.clientId,
          code_verifier: verifier,
        }),
      }),
      deps,
      CONFIG,
    );
    assertEquals(goodAttempt.status, 200);
  },
);

Deno.test(
  "POST /token re-checks the plan at redemption and rejects a since-downgraded user",
  async () => {
    const deps = fakeDeps({ getUserPlan: async () => "free" }); // downgraded after /authorize approved it
    const { code, verifier } = await seedAuthorizedCode(deps);

    const res = await handleRequest(
      req("https://project.supabase.co/functions/v1/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: REGISTERED_CLIENT.redirectUris[0],
          client_id: REGISTERED_CLIENT.clientId,
          code_verifier: verifier,
        }),
      }),
      deps,
      CONFIG,
    );
    assertEquals(res.status, 403);
    const body = await res.json();
    assertEquals(body.error, "access_denied");
  },
);

Deno.test("POST /token rejects an unsupported grant_type", async () => {
  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials" }),
    }),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "unsupported_grant_type");
});

Deno.test("POST /token accepts application/x-www-form-urlencoded bodies", async () => {
  const deps = fakeDeps();
  const { code, verifier } = await seedAuthorizedCode(deps);
  const formBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REGISTERED_CLIENT.redirectUris[0],
    client_id: REGISTERED_CLIENT.clientId,
    code_verifier: verifier,
  });

  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    }),
    deps,
    CONFIG,
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(typeof body.access_token, "string");
});

// ---------- Misc ----------

Deno.test("unknown route returns 404", async () => {
  const res = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/bogus"),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(res.status, 404);
});

Deno.test("OPTIONS preflight is handled for both public and /authorize routes", async () => {
  const publicPreflight = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/register", { method: "OPTIONS" }),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(publicPreflight.status, 200);

  const authorizePreflight = await handleRequest(
    req("https://project.supabase.co/functions/v1/oauth/authorize", { method: "OPTIONS" }),
    fakeDeps(),
    CONFIG,
  );
  assertEquals(authorizePreflight.status, 200);
});
