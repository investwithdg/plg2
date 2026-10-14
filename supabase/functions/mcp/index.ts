// PLG MCP server (action-layer lock): exposes PLG as callable tools so agents /
// ChatGPT apps invoke it directly. Supabase Edge Function (Deno).
// Deploy: `supabase functions deploy mcp`.
//
// tools/call accepts either a Supabase user Bearer JWT (browser-style session) or a
// long-lived `plg_live_...` API key issued via manage-api-keys/. Either way, MCP access
// is a Pro/Elite paid-tier gate enforced in deps.ts's verifyCaller — free-tier callers are
// rejected even with an otherwise-valid token/session.
// generate_listing forwards straight into receive-property (the already-hardened
// entry point with free-tier caps, Pro-tier gating, and dedupe) rather than
// re-implementing any of that here — MCP is a transport, not a second front door.
//
// Request handling lives in handler.ts (no Supabase import, unit-testable in
// isolation); this file just wires the real Supabase-backed deps (deps.ts) into it.
import { handleRequest } from "./handler.ts";
import { defaultDeps } from "./deps.ts";

Deno.serve((req) => handleRequest(req, defaultDeps()));
