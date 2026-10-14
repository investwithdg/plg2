// PLG OAuth 2.1 authorization server backing the MCP connector flow. Supabase
// Edge Function (Deno). Deploy: `supabase functions deploy oauth`.
//
// Request handling lives in handler.ts (no Supabase import, unit-testable in
// isolation); this file just wires the real Supabase-backed deps (deps.ts) and
// runtime config (from env vars) into it.
import { handleRequest, type OAuthConfig } from "./handler.ts";
import { defaultDeps } from "./deps.ts";

const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const siteUrl = (Deno.env.get("SITE_URL") || "https://propertylistinggenerator.com").replace(
  /\/$/,
  "",
);

// OAUTH_PUBLIC_URL/MCP_PUBLIC_URL point at this app's own domain-fronted proxy paths (see
// src/lib/mcpProxy.ts) instead of the raw <project-ref>.supabase.co URL, so every URL an MCP
// client sees — issuer, token/registration endpoints, and the resource identifier — stays
// under propertylistinggenerator.com. Falls back to the direct Supabase URL if unset, so this
// keeps working correctly before/without the proxy in place. Must stay in sync with
// getProtectedResourceMetadata()'s resolution in supabase/functions/mcp/deps.ts — both derive
// the SAME resource identity, just from two different functions.
const issuer = (Deno.env.get("OAUTH_PUBLIC_URL") || `${supabaseUrl}/functions/v1/oauth`).replace(
  /\/$/,
  "",
);
const resource = (Deno.env.get("MCP_PUBLIC_URL") || `${supabaseUrl}/functions/v1/mcp`).replace(
  /\/$/,
  "",
);

const config: OAuthConfig = {
  issuer,
  authorizationEndpoint: `${siteUrl}/oauth/authorize`,
  resource,
};

Deno.serve((req) => handleRequest(req, defaultDeps(), config));
