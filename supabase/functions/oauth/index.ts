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

const config: OAuthConfig = {
  issuer: `${supabaseUrl}/functions/v1/oauth`,
  authorizationEndpoint: `${siteUrl}/oauth/authorize`,
  resource: `${supabaseUrl}/functions/v1/mcp`,
};

Deno.serve((req) => handleRequest(req, defaultDeps(), config));
