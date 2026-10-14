// analyze-property-photos: Vision+ (Elite-only). Takes the photos an Elite user attached to
// one of their listings, extracts objective physical features from each with a vision model
// (gpt-4o-mini), and then triggers ONE process-property regeneration that folds those
// visually-verified facts into the listing copy.
//
// Called directly by the browser with the user's own session JWT
// (Authorization: Bearer <access_token>) — NOT internal-secret gated.
// Deploy: `supabase functions deploy analyze-property-photos`.
//
// Request handling lives in handler.ts (no Supabase import, unit-testable in isolation);
// this file just wires the real Supabase-backed deps (deps.ts) into it.
import { handleRequest } from "./handler.ts";
import { defaultDeps } from "./deps.ts";

Deno.serve((req) => handleRequest(req, defaultDeps()));
