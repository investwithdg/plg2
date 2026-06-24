## Problem

The preview blank screen is caused by `createClient("", "")` throwing `supabaseUrl is required.` at module load. The previous CSS fix is in, but `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` aren't set in the sandbox `.env`, so the Supabase client crashes the whole React tree on import.

## Fix

1. **Make `src/integrations/supabase/client.ts` crash-safe.** When env vars are missing, export a lazy proxy that throws only when actually used (e.g. on `.from(...)` / `.functions.invoke(...)`), with a clear message. Module import no longer throws, so the UI renders.

2. **Add a visible Win95 "Backend not connected" banner** in `RetroGenerator` that appears when the env vars are missing. It tells the user exactly what to do: copy `.env.example` → `.env` and paste `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase dashboard. The Generate button is disabled while this is the case.

3. **No backend/edge-function changes**, no schema changes, no new env wiring beyond what's already documented in `.env.example`.

## Result

- Preview renders the full retro UI immediately, even before credentials are added.
- Once the user fills in `.env` and restarts the dev server, the banner disappears and Generate works against the existing Supabase project.
