# PLG Reach Infrastructure

**Infrastructure, not features. The core generate flow is untouched.** Every file
here is new and imported by nothing in the current build, so it cannot break the app.
It extends PLG's *reach* and *durability* — the three locks that stop it from being
commoditized.

## What this adds
- **Action layer (A):** `supabase/functions/mcp/` — an MCP server exposing
  `generate_listing`, `compliance_check`, `rewrite_for_channel` so agents call PLG directly.
- **Cornered data (D):** `supabase/migrations/..._reach_compliance_ledger.sql` adds
  `mls_rules` (fair-housing/board rulepack), `compliance_checks`, and `listing_outcomes`
  (which copy converts). `src/lib/compliance/` and `src/lib/ledger/` are the helpers.
- **Switching cost (S):** `src/lib/export/` — Pro-tier export; PLG becomes the system of
  record you export from. (Listing history already lives in `copy_generations`.)

## Apply / wire (when ready)
1. Migration: `supabase db push` (or paste the SQL in the dashboard). Additive + idempotent.
2. Compliance: call `checkListing(text, { board })` before/after generation; store via `compliance_checks`.
3. Ledger: call `recordOutcome({...})` on view/lead/publish. PostHog mirror is automatic if `posthog` is present.
4. MCP: `supabase functions deploy mcp`, then wire `runTool()` to the real generate pipeline.

## Notes
- Import path `@/integrations/supabase/client` assumed — adjust if your client is elsewhere.
- Respects `AGENTS.md`: additive, feature branch + PR, no history rewrite, `main` stays working.
