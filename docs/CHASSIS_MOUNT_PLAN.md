# PropertyListingGenerator — Chassis Mount Plan

> Status: **proposal** (docs-only, non-breaking). Merge to adopt; close to discard.
> Placed here by the Genesis Lumina strategy pass. Nothing in `src/` changed.

## Why this exists

The listing-*generation* function is commoditizing — foundation models write
listings natively, so "generate a listing" alone gets **rolled over**. The moat
is never the phrase; it's what sits **behind** it. This plan mounts three locks
onto PLG so it becomes a defensible system of record instead of a wrapper:

- **D — Cornered data** the model can't see
- **S — Switching costs / system of record**
- **A — Action layer** (the tool agents *call*)

(Regulated-trust is out of reach for PLG; three locks is the target.)

## Observed stack (so mounts fit reality)

- **App:** TanStack Start (React 19) + Vite + Tailwind v4 + shadcn/Radix
- **Server/API:** `src/server.ts`, `src/start.ts`, `src/routes/`
- **Data + auth:** Supabase (`src/integrations/`, top-level `supabase/` migrations + edge functions)
- **Analytics:** PostHog (already wired — the outcome-ledger feed)
- **Connected to Lovable** (see `AGENTS.md`)

## The six mounts, mapped to this repo

### Lock A — Action layer
1. **Public API** — TanStack Start server routes under `src/routes/api/*` (via `server.ts`):
   `POST /api/generate`, `/api/compliance-check`, `/api/rewrite`.
2. **MCP server** — expose `generate_listing`, `compliance_check`,
   `rewrite_for_channel(mls|social|print)` as callable tools.
   Home: `supabase/functions/mcp/` (edge function) or `packages/mcp/` wrapping the API.
   *The tool name + description is the new meta description — agents read it to decide to call PLG.*

### Lock D — Cornered data
3. **MLS compliance rulepack** — `src/lib/compliance/` + Supabase table `mls_rules`
   (per-board fair-housing / prohibited-language rules, versioned; Zod-validated).
   Powers `compliance_check`. Doubles as a **GEO-citable** reference asset.
4. **Listing-outcome ledger** — Supabase table `listing_events` + PostHog events
   (views → leads → days-on-market). Feedback loop learns which copy converts per market.
   *Cheapest lock to start — PostHog is already installed.*

### Lock S — Switching costs / system of record
5. **Listing workspace** — Supabase tables `listings`, `listing_versions` + Supabase Auth
   + routes `/listings`, `/listings/$id`. PLG becomes where an agent's listings **live**
   (saved, versioned, re-generatable, team seats) — not a one-shot toy.
6. **Outbound push** — `src/integrations/{mls,crm,social}/` (+ edge functions) to push
   finished listings out. Extends the existing Zillow/Redfin "in" webhook to "out."

## Chassis spines this reuses (extract to `genesis-lumina-chassis`)

| Spine | Here in plg2 | Extract as shared |
|---|---|---|
| Data + Auth | Supabase schema + Supabase Auth | shared schema patterns, RLS, auth helpers |
| Monetization | (to add) Stripe | `stripe` client + `supabase/functions/stripe-webhook` |
| Distribution | routes + (to add) schema/GEO | SEO/GEO helpers + the MCP scaffold |
| Control | PostHog | shared event taxonomy → the outcome ledger |

PLG is the **reference build** that calibrates the mounting contract every other
engine (`franky-franchise`, `theleadcoach`, …) then reuses.

## Suggested sequence

1. **Compliance rulepack + outcome ledger (D)** — the moat; cheap given Supabase + PostHog.
2. **MCP server + public API (A)** — own the action before a proxy claims the slot.
3. **Listing workspace + outbound push (S)** — the system of record.

## Contribution rules (from `AGENTS.md`)

- Lovable-connected: **do not rewrite published history** (no force-push / rebase /
  squash of pushed commits). Work on **feature branches + PRs**; keep the connected
  branch in a working state (it syncs to Lovable).

## ⚠️ Security & hygiene flags

- **`.env` is committed to this public repo.** Rotate anything sensitive (Supabase
  `service_role`, API keys), remove the file, and confirm `.gitignore` excludes it.
  History rewrite is discouraged here, so **rotation is the real fix**, not just deletion.
- **`recent_merge.diff`** is a stray artifact — safe to delete.
