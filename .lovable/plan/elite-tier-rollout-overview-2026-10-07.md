# Elite Tier Rollout — Overview

Goal: turn Elite from "Coming Soon" into a live, paid tier with real features, a distinct visual identity, and working checkout.

## 1. Pricing & Checkout
- Activate Elite on `/pricing` (price point TBD — e.g. $99/mo, $79/mo annual).
- New Stripe price IDs: `STRIPE_PRICE_ELITE_MONTHLY`, `STRIPE_PRICE_ELITE_ANNUAL` (secrets).
- Update `create-checkout` to accept a `plan` param ("pro" | "elite") and pick the right price.
- Update `stripe-webhook` to write `plan: "elite"` based on the Stripe price ID (currently hardcodes `"pro"`).
- `usePlanTier` and `_shared/planTier.ts` already resolve elite — no change needed.

## 2. Vision+ Photo Analysis (Elite-exclusive)
- `analyze-property-photos` edge function already exists and gates on Elite (`isEliteOnlyPlan`).
- Wire the frontend: `PhotoAttachmentTray` in the generator, enabled only for Elite users; Pro sees an upgrade prompt.
- Photo insights feed into the listing copy prompt (architectural style, finishes, condition).

## 3. Custom Brand Voice & Directives (Elite)
- New `brand_profiles` table (user_id, tone, banned words, brokerage signature, custom directives) with owner-only RLS.
- Settings panel in the Hub to edit the profile.
- `process-property` merges the profile into the generation prompt for Elite users.

## 4. Elite Visual Identity
- `PlanThemeProvider` already sets `data-plan="elite"` on `<body>`.
- Add the elite theme variant in `src/styles.css` (charcoal/slate palette + gold accents).
- Gold/black "ELITE" badge in `AppNav` and the generator titlebar.

## 5. Verification
- Unit tests: plan-tier resolution, checkout plan param, webhook plan mapping, brand profile merge.
- End-to-end: free → upgrade to Elite → theme shifts → photo analysis unlocked → brand voice applied to output.

## Suggested build order
1. Stripe prices + checkout/webhook plan support (money path first)
2. Elite theme + badge (visible immediately)
3. Vision+ frontend wiring
4. Brand profiles (table + Hub panel + prompt merge)

## Open decisions
- Elite price points (monthly / annual)
- Whether Pro keeps any photo analysis teaser or stays fully gated
