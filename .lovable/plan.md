## Goal

Swap the current `?` Legend popover — which mostly just spells out abbreviations already visible on-screen — for a short, genuinely useful "How it works" popover.

## What changes

File: `src/components/RetroLegend.tsx` (keep the file, keep the `?` button and its placement in `AppNav`; only the popover contents and title change).

- Rename the titlebar from **Legend** → **How PLG works**.
- Replace the abbreviation list with 4 short, scannable sections in Win95-styled rows:

  1. **What you get** — Every generation produces 3 pieces of copy:
     - **MLS** — long-form listing description for the MLS/Zillow/Redfin
     - **Social** — short Instagram/Facebook caption with hashtags
     - **Email** — buyer-list email blurb
  2. **FHA-compliant** — Copy avoids protected-class language (race, religion, familial status, disability, etc.) so it's safe to publish on the MLS.
  3. **Free vs Pro** — 10 free generations. Single Family (SFR) and FSBO are always free. Property types marked with `*` (Multi-Family, STR, MTR, LTR, Estate, Commercial, Lease) require Pro.
  4. **How generation works** — Paste an address or Zillow/Redfin/Realtor URL → we research the property + neighborhood → we write all 3 pieces in ~15 seconds.

- Bump popover width from `w-56` to `w-72` and raise `max-h` from `52` to `80` to fit the richer content comfortably without scrolling on desktop.
- Keep the outside-click backdrop, close button, and z-index behavior unchanged.

## Out of scope

- No changes to `AppNav.tsx` — the `?` button stays where it is.
- No tooltips on the property-type buttons.
- No copy/tone changes to the homepage itself.

## Technical notes

- Pure presentational change inside `RetroLegend.tsx`. Replace the `LEGEND_ITEMS` array with a small `SECTIONS` array of `{ title, body: ReactNode }` and render each as a titled block inside the existing `win95-inset` container.
- Reuse existing `text-win95-11` / `font-bold` / `text-muted-foreground` classes so it visually matches the rest of the retro UI. No new dependencies.
