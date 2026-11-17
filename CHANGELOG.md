# Changelog — PropertyListingGenerator.com (PLG)

All notable changes across the complete **PropertyListingGenerator.com** commit and pull-request tree are documented in this file.

This project adheres to [Semantic Versioning 2.0.0](https://semver.org/):

- **Era 2 (`v2.x` — `investwithdg/plg2`)**: TanStack Start SSR + React 19 + Supabase Edge Functions + Perplexity `sonar-pro` + OpenAI + Claude MCP + FHA Compliance Audit Engine.
- **Era 1 (`v1.x` — `investwithdg/propertylistinggenerator`)**: Original Vite React SPA + Make.com webhook → initial Edge Function prototype.

---

## [2.7.1] — 2026-11-16 (`06dd742`, PR #28)

### Fixed

- **Free-Tier Generations Restored**:
  - Restored anonymous and authenticated `SELECT` RLS policies on `public.properties`, `public.copy_generations`, and `public.enrichments` (`20261116191500_restore_public_read_policies.sql`) while keeping client-side mutations (`INSERT`, `UPDATE`, `DELETE`) revoked.
  - Fixed malformed PostgREST `.not("property_type", "in", ...)` filter syntax in `supabase/functions/receive-property/index.ts`, excluded `status = "error"` rows from 30-day usage counts, and added `refund_anonymous_generation` RPC rollback when property row inserts fail.
  - Synced signed-in free-user 30-day generation counts in `src/components/RetroGenerator.tsx` and gated unlimited generation mode strictly on `devBypassActive || isProUser`.
- **Pro Account Access to Research+ Intelligence & Certificates**:
  - Fixed stale `isProUser` prop freezing in `src/components/OutputTabsWindow.tsx` by dynamically injecting live `isProUser` state into `outputs.research`.
  - Hardened `src/hooks/usePlanTier.ts` with case-insensitive prefix normalization (`pro*`, `elite*`), active/trialing/`current_period_end` window validation, and `app_metadata` / `user_metadata` fallback.
  - Removed redundant Section 2 auto-mitigation filler card from `src/components/ResearchDossier.tsx` while preserving the compliance status badge, toggleable original listing remarks viewer, and Official Certificate trigger.
  - Hardened audit date formatting in `src/components/FhaComplianceCertificateModal.tsx`, unblocked Pro users for direct printing, and wrapped `window.print()` to handle iframe sandbox `DOMException` errors with a toast fallback.
- **Rich Amenities Procurement & Cache Anti-Poisoning**:
  - Relaxed `nearby_amenities.distance` schema in `supabase/functions/_shared/llm.ts` to optional/nullable (`["string", "null"]`) and added `buildAnchoredAddress` with token-boundary matching and `US_STATE_MAP` deduplication.
  - Expanded neighborhood search radius and amenity category instructions across urban, suburban, and rural markets in `supabase/functions/_shared/propertyProfiles.ts`, and added the `land` / `lot` profile plus common property-type aliases (`multi_family`, `vacation_rental`, `residential`).
  - Gated `enrichment_cache` reads and writes in `supabase/functions/process-property/index.ts` via `isValidAmenityList` to bypass and prevent caching empty amenity responses.

### Added

- **4-Tier Automated Verification & Canonical Versioning**:
  - Added 4-tier Vitest suite (22 test files, 165 tests) covering feature coverage, boundary/corner cases, pairwise interactions, and end-to-end application scenarios.
  - Established canonical semantic versioning across `package.json`, `src/lib/version.ts`, `AppFooter.tsx`, `supabase/functions/mcp/handler.ts`, and `CHANGELOG.md` with automated drift assertions (`src/lib/version.test.ts`).

---

## [2.7.0] — 2026-11-05 (`81c703b`, PRs #24, #25, #27)

### Added

- **Official Printable FHA Fair Housing Compliance Audit Certificate (`143c732`, PR #27)**:
  - Designed and implemented `FhaComplianceCertificateModal.tsx` with deterministic `PLG-FHA-*` audit IDs, category-by-category pass/fail verification tables, and print/PDF export.
  - Upgraded property extraction and neighborhood enrichment to Perplexity `sonar-pro` with full original listing description extraction and 4-stage "Show Our Work" audit protocol breakdown in `ResearchDossier.tsx`.
- **Listing Copy `.txt` Export (`b40f53f`, PR #25)**:
  - Added single-tab (`MLS`, `Social`, `Email`) and bundled (`Download All`) `.txt` file export (`src/lib/export/listing-export.ts`).
- **Stripe Elite Checkout (`a0d97c4`, PR #24)**:
  - Wired Stripe checkout for Elite monthly ($99/mo) and annual ($79/mo) plans.
- **CI & PR Review Workflow Hardening (`c1eabc5`..`81c703b`)**:
  - Added `@cto` / `@claude` / `@gemini` PR review workflow (`agent-pr.yml`), upgraded CI to Node 22, formatted codebase with Prettier 3.9.10, and granted `--allow-read` for Deno MCP handler tests.

---

## [2.6.0] — 2026-10-14 (`4446b0b`, PR #26)

### Added

- **Interactive WordPad Workbench & MLS Character Presets (`61a82fb`)**:
  - Transformed output tabs into an interactive WordPad editor with live character/word counters, state-aware MLS character limit presets (Bright MLS 1024, Standard 1000, Compact 500), and one-click smart sentence auto-trim (`src/lib/mlsLimits.ts`).
- **Elite Plan Feature Set & Brand Profiles (`2061ba6`, `911d216`)**:
  - Rolled out `brand_profiles` table and `BrandVoicePanel.tsx` (custom tone, banned words, signature), bilingual English/Spanish generation, ProductHunt promo code support (`b0ae3ee`), and navigation subscription plan badge (`911d216`).
- **Distribution Share Infrastructure & SEO Content (`4446b0b`, PR #26)**:
  - Added social share banners, one-click distribution triggers, and high-intent SEO blog articles.

---

## [2.5.1] — 2026-08-16 (`4e66267`)

### Changed

- **Deep Module Edge Function Decomposition & NIST AI RMF Defenses (`413a504`, `6325156`, `9cc7f95`)**:
  - Decomposed monolithic `process-property` into `_shared` deep modules (`http.ts`, `llm.ts`, `fha.ts`, `security.ts`) with `sanitizeForLLM` prompt-injection defense and retry/timeout resilience.
- **Sitewide Persistent Footer (`4e66267`)**:
  - Added `AppFooter.tsx` across all routes with product, resource, and competitor comparison navigation.

---

## [2.5.0] — 2026-08-05 (`145c01c`, PRs #21, #22)

### Added

- **Vision+ Property Photo Intelligence (`b8389ae`, PR #21)**:
  - Added Elite-only `PhotoAttachmentTray.tsx`, `property_photos` table and storage bucket (`20260802120000_add_property_photos.sql`), `photo_analysis_*` cost tracking (`20260802120100_add_photo_analysis_costs.sql`), and `analyze-property-photos` GPT-4o-mini vision Edge Function that folds extracted visual features into listing copy.

### Fixed

- **Copy Quality & Research Radius Guardrails (`145c01c`, PR #22)**:
  - Eliminated references to missing walkability scores, prohibited repeating listing price inside narrative copy, and widened neighborhood research radius.

---

## [2.4.0] — 2026-08-02 (`912adc4`, PRs #15, #16, #17, #18, #19, #20)

### Added

- **Claude MCP Connector & OAuth 2.1 Server (`326e3f4`, `565f456`, `645563e`, `e9ac50d`, `912adc4`)**:
  - Added long-lived MCP API keys (`manage-api-keys` Edge Function, `ApiKeysPanel.tsx`) and full OAuth 2.1 authorization server (`oauth` Edge Function) for `claude.ai` connector, unified under a Pro/Elite entitlement gate.
  - Fronted MCP and OAuth endpoints under first-party domain routes, implemented JSON-RPC `initialize` handshake, added per-user MCP rate limiting (`mcp_tool_calls`), added `list_listings` and `get_property_research` MCP tools, and published `/docs/claude`.
- **Google Maps Places Address Autocomplete & Centralized Property Profiles (`5fbb29c`, `08c3cf6`)**:
  - Added `useGoogleAutocomplete.ts` hook and centralized all property-type extraction, enrichment, and copy directives into `supabase/functions/_shared/propertyProfiles.ts`.

---

## [2.3.0] — 2026-07-28 (`2f3962b`, PR #14)

### Added

- **Research+ Dossier Overhaul & Category-Level FHA Auditing (`aa46924`, `754a435`, `2f3962b`)**:
  - Overhauled Research+ tab with structured enrichment schema, Win95 dossier cards, and live web source citations (`aa46924`, PR #14).
  - Added category-level FHA compliance metadata (`fha_categories`), Member Hub dashboard route (`754a435`), Townhouse/Condo/Rowhouse (`row`) profile, and property-type mismatch warning dialog (`2f3962b`).

---

## [2.2.0] — 2026-07-12 (`92fe6c7`, PR #13)

### Added

- **Reach Infrastructure — MCP v1, Compliance/Outcome Ledger & Pro Export (`92fe6c7`, PR #13)**:
  - Introduced initial Model Context Protocol (`mcp`) Edge Function (`generate_listing`, `compliance_check`), Fair Housing compliance and listing outcome ledger (`20260712160000_reach_compliance_ledger.sql`), Pro listing export, and Deno Edge Function unit test runner in CI.

---

## [2.1.1] — 2026-07-10 (`3f8d800`, PRs #9, #10, #11)

### Added

- **CI Pipeline, CORS Lockdown & Behavioral Email Security (`80d4113`, `c3f6d06`, `3f8d800`)**:
  - Added Loops.so behavioral event tracking and hardened Loops Edge Functions with JWT auth and email binding (`80d4113`, PR #9).
  - Established GitHub Actions CI workflow, wired PostHog exception tracking, fixed Pro Research tab crash, and persisted raw Perplexity extraction responses (`c3f6d06`, PR #10).
  - Locked down CORS to an explicit origin allowlist across all browser-callable Edge Functions (`3f8d800`, PR #11).

---

## [2.1.0] — 2026-07-06 (`abc5560`, PRs #4, #5, #6, #7, #8)

### Added

- **SEO Distribution, Analytics, Turnstile Bot Protection & Free-Tier Ledger (`9847cbd`..`abc5560`)**:
  - Added global navigation, public Explore gallery, Blog, Terms/Privacy pages, XML sitemap (`9847cbd`, PR #4), shareable listing URLs (`/listing/$id`), and 8 SEO articles (`296893d`, PR #5).
  - Integrated PostHog analytics and Loops.so welcome emails (`6c0b7da`, PR #6).
  - Added Cloudflare Turnstile bot verification, Google OAuth sign-in, first-party cookie `anonymous_usage` reservation ledger (`20260706183500_anonymous_usage.sql`), and no-trial free-tier gating (`6dcbf79` PR #7, `abc5560` PR #8).

---

## [2.0.0] — 2026-06-28 (`3422c14`, PRs #1, #2, #3)

### Added

- **PLG 2.0 Architecture Rebuild (`33b52ca`..`3422c14`)**:
  - Rebuilt PropertyListingGenerator.com on TanStack Start SSR + React 19 + Vite + Tailwind v4 with SSR-safe Win95 Retro UI (`RetroGenerator.tsx`) and dedicated Supabase project (`bbytwflsulxuctkpuvzs`).
  - Implemented `receive-property` and `process-property` Edge Functions, user authentication, Stripe Pro subscriptions, per-generation API cost tracking (`generation_costs`), neighborhood `enrichment_cache`, 10-generation free tier + 1 Pro sample, 18 competitor comparison pages, pricing page, and Stripe customer portal (`3013d8a` PR #1, `9c6dc13` PR #2, `3422c14` PR #3).

---

## Era 1 Archive — `investwithdg/propertylistinggenerator` (`v1.0.0` – `v1.5.1`)

- **[1.5.1] — 2026-06-22 (`2e28d5c`)**: Final v1 security & stability patch — fixed Retro paywall blocking, `copy_generations` `user_id` foreign key, and generated listing viewer.
- **[1.5.0] — 2026-06-05 (`e787f20`)**: Cut over core generation engine from Make.com webhook to native Supabase Edge Functions (`receive-property` + `process-property`).
- **[1.4.1] — 2026-01-27 (`63f67aa`)**: Added server-side subscription validation and nullable `user_id` support for anonymous generations.
- **[1.4.0] — 2026-01-08 (`db05d25`)**: Introduced Win95 Retro UI foundation, teal desktop theme, Win95 Explorer UI, and revamped checkout flow with trust signals.
- **[1.3.0] — 2026-01-06 (`d8bfc71`)**: Shipped Community Explorer (`Explorer` DB schema, route UI, `MySaves` & Remix hook, unified navigation, and "Submit to Explorer" modal).
- **[1.2.0] — 2025-11-04 (`6c2ac8f`)**: Implemented synchronous Make.com webhook response handling, property-type routing, and security definer view fixes.
- **[1.1.0] — 2025-10-17 (`5a3639a`)**: Added `OutputTabsWindow` tabbed output workbench, OneTime purchase route, Stripe product creation, blog routing, and `ProDashboard`.
- **[1.0.0] — 2025-10-07 (`ec3795d`)**: Initial PLG v1 SPA launch — landing page, property form, credit system, paywall, API routes, dashboard, signup/checkout flow, and session authentication.
