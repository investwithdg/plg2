# Full site audit — PropertyListingGenerator.com

Findings below are verified against the current code, the live dev server, and the
security scanners. Ordered by impact.

## 1. Critical: every page tells Google it is the homepage

`src/routes/__root.tsx` sets a sitewide `canonical` of
`https://propertylistinggenerator.com` and a sitewide `og:url` of the same.
Because those tags apply to every route, all 30+ pages (blog posts, 18 compare
pages, pricing, features) declare themselves duplicates of the homepage. That
alone can suppress indexing of the entire content library.

Fix: remove canonical and `og:url` from the root, and add a self-referencing
canonical + `og:url` to each leaf route.

## 2. Sitemap is missing most of the site

`public/sitemap.xml` lists 18 URLs. The app has roughly 35 public routes: 16 of
the 18 compare pages, `/features`, and `/docs/claude` are absent. A static file
also cannot stay in sync as blog posts are added.

Fix: replace the static file with a generated `/sitemap.xml` server route that
enumerates the real route tree plus the blog article list.

## 3. Homepage has no H1

The homepage renders `RetroGenerator`, which has no `<h1>`. Every other content
page has one. Search engines and screen readers get no page-level heading for
the most important page on the site.

Fix: wrap the main headline in an `<h1>`, styled to match the Win95 look, with no
visual change.

## 4. Hydration mismatch on the homepage

The server renders the anonymous Turnstile widget and the client does not — the
flag depends on the signed-in user, which the server cannot know. React logs
"Hydration failed" on every visit and re-renders the whole tree, which costs
interactivity time and buries real errors.

Fix: render the Turnstile block only after hydration so server and client agree.

## 5. Security and dependencies

- Critical advisory in `seroval`, pulled in through `@tanstack/react-router`,
  `@tanstack/react-start`, and `@tanstack/router-plugin`. Needs a version bump.
- Supabase Auth has leaked-password protection disabled (a dashboard toggle).
- `VITE_GOOGLE_MAPS_API_KEY` ships in the browser bundle, which is normal — but
  it must be HTTP-referrer restricted in Google Cloud or it can be used from any
  site at your expense. Worth confirming; not checkable from here.

## 6. Google Maps integration warnings

The Places script loads without `loading=async`, and the code uses
`AutocompleteService`, which Google closed to new customers in March 2025. Both
warnings appear in the console on every page load.

Fix: async-load the script and migrate to `AutocompleteSuggestion`.

## 7. Accessibility gaps

- The close "x" buttons in `OutputTabsWindow.tsx` and the paywall modal have no
  accessible name.
- `ResearchDossier` uses a literal "x" character as a failure marker with no text
  alternative.

## 8. SEO content opportunities

- No `WebSite`/`Organization` JSON-LD anywhere, no `Article` schema on blog
  posts, no `FAQPage` on pricing.
- The compare pages are the strongest untapped asset: 18 pages already written,
  but half are missing from the sitemap and all of them canonicalize to the
  homepage. Fixing items 1 and 2 is the highest-leverage SEO work available.

## Suggested order of work

1. Canonical/og:url per route; strip them from the root. (Biggest win.)
2. Dynamic sitemap route covering every public page.
3. Homepage `<h1>` plus the hydration fix.
4. Accessible names on icon buttons.
5. JSON-LD: Organization/WebSite sitewide, Article on blog posts.
6. Dependency bump for the seroval advisory.
7. Google Maps async load and Autocomplete migration.

Items 1-5 are frontend-only and low risk. Item 6 touches package versions and
needs a build verification pass. Item 7 changes address autocomplete behaviour,
so it deserves its own round of testing.

Two things need you rather than me: enabling leaked-password protection in the
Supabase dashboard, and confirming the Google Maps key is referrer-restricted.

## Not audited

Backend behaviour (edge functions, Stripe, MCP) was read but not exercised — you
asked for a site audit, and I avoided anything that would create data or spend
API credits. Say the word if you want that covered too.