// PLG MCP server (action-layer lock): exposes PLG as callable tools so agents /
// ChatGPT apps invoke it directly. Supabase Edge Function (Deno).
// Deploy: `supabase functions deploy mcp`.
//
// tools/call requires the same Supabase user Bearer JWT as the browser flow.
// generate_listing forwards straight into receive-property (the already-hardened
// entry point with free-tier caps, Pro-tier gating, and dedupe) rather than
// re-implementing any of that here — MCP is a transport, not a second front door.
//
// Request handling lives in handler.ts (no Supabase import, unit-testable in
// isolation); this file just wires the real Supabase-backed deps (deps.ts) into it.
import { handleRequest } from "./handler.ts";
import { defaultDeps } from "./deps.ts";

Deno.serve((req) => handleRequest(req, defaultDeps()));
