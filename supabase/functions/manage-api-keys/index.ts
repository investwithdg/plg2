// manage-api-keys: lets a logged-in dashboard user create/list/revoke their own long-lived
// MCP API keys (see supabase/migrations/*_add_api_keys.sql and supabase/functions/mcp/deps.ts).
// Deploy: `supabase functions deploy manage-api-keys`.
//
// Auth here is always the normal Supabase user session JWT (the browser's own login) — this
// is for managing keys, not for the MCP tool-call surface that the keys unlock.
//
// Request handling lives in handler.ts (no Supabase import, unit-testable in isolation);
// this file just wires the real Supabase-backed deps (deps.ts) into it.
import { handleRequest } from "./handler.ts";
import { defaultDeps } from "./deps.ts";

Deno.serve((req) => handleRequest(req, defaultDeps()));
