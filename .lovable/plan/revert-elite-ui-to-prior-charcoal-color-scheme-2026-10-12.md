# Revert Elite UI to Prior Charcoal Color Scheme

Goal: remove the gold "premium" styling added with the Elite rollout and restore the neutral charcoal/slate Elite look the app had before. Elite stays fully live as a feature — pricing, checkout, Vision+, Brand Voice, and the Elite theme activation are untouched.

## 1. `src/styles.css` — Elite theme block
Restore the pre-rollout values (verified against the prior commit):
- `--win95-blue: #404040`, `--win95-blue-light: #808080`
- `--primary: #404040`, `--primary-foreground: #f8f8f8`
- `--accent: #404040`, `--accent-foreground: #f8f8f8`
- `--ring: #404040`
- Remove `--win95-gold` and `--win95-gold-dark`
- Delete the `body[data-plan="elite"] .win95-titlebar` gold-text override so Elite titlebars use the standard navy gradient again

## 2. `src/components/AppNav.tsx` — nav badge
Remove the plan badge block (gold "ELITE" / red "PRO") — it did not exist before the rollout. The nav returns to: email text, Member Hub, Sign Out.

## 3. `src/routes/pricing.tsx` — Elite card
Keep the card live at $99/mo / $79/mo annual with working checkout, but recolor to the prior charcoal scheme:
- Titlebar: drop the hardcoded black-to-charcoal gradient with gold text; use the standard `win95-titlebar` styling like the Free and Pro cards
- Feature bullets: `+` marks from gold `#B8860B` to the same bold dark color the Pro card uses
- "Go Elite" button: remove the gold text override so it matches the "Go Pro" button styling

## Out of scope (unchanged)
- `ResearchDossier.tsx` walkability score color, generator tier `★`/`🔒` markers, and the Vision+ photo tray star — these predate the rollout and are not part of the Elite gold scheme
- All Elite functionality: pricing, Stripe checkout, webhook plan mapping, Vision+ gating, Brand Voice panel, theme activation

## Verification
- `bunx vitest run src` still passes
- Visual check of the pricing page and generator (elite styling is attribute-driven; confirmed via the stylesheet diff)
