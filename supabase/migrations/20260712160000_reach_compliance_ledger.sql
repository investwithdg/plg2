-- Reach infrastructure for PropertyListingGenerator (ADDITIVE; does not change the core flow).
-- Adds: compliance rulepack (mls_rules), per-generation compliance results (compliance_checks),
-- and the listing outcome ledger (listing_outcomes).
-- Aligns with existing tables: properties, enrichments, copy_generations, generation_costs, subscriptions.
-- Not auto-applied. Apply with `supabase db push` or paste into the SQL editor.

-- 1) MLS / fair-housing compliance rulepack  (cornered-data lock)
create table if not exists public.mls_rules (
  id uuid primary key default gen_random_uuid(),
  board text not null default 'default',                 -- e.g. 'CRMLS', 'Realcomp', 'default'
  rule_type text not null default 'prohibited_phrase',   -- prohibited_phrase | required_disclosure | style
  pattern text not null,                                 -- phrase/token matched case-insensitively
  severity text not null default 'error',                -- error | warning
  guidance text,
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mls_rules_board_active_idx on public.mls_rules (board, active);
alter table public.mls_rules enable row level security;
do $$ begin
  create policy "mls_rules_read" on public.mls_rules for select using (true);
exception when duplicate_object then null; end $$;

-- 2) Per-generation compliance results  (ties compliance to the core output)
create table if not exists public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  copy_generation_id uuid references public.copy_generations(id) on delete cascade,
  board text not null default 'default',
  passed boolean not null,
  violations jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now()
);
create index if not exists compliance_checks_gen_idx on public.compliance_checks (copy_generation_id);
alter table public.compliance_checks enable row level security;

-- Owner-scoped via the parent copy_generation (same pattern as copy_generations_select_own).
-- Service role bypasses RLS entirely, so this only governs anon/authenticated access.
do $$ begin
  create policy "compliance_checks_select_own" on public.compliance_checks
    for select
    using (
      exists (
        select 1 from public.copy_generations cg
        where cg.id = compliance_checks.copy_generation_id
          and cg.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "compliance_checks_insert_own" on public.compliance_checks
    for insert
    with check (
      exists (
        select 1 from public.copy_generations cg
        where cg.id = compliance_checks.copy_generation_id
          and cg.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- 3) Listing outcome ledger  (data-moat: learn which copy converts)
create table if not exists public.listing_outcomes (
  id uuid primary key default gen_random_uuid(),
  copy_generation_id uuid references public.copy_generations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  event_type text not null,                              -- view | lead | saved | published | closed
  days_on_market int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists listing_outcomes_gen_idx on public.listing_outcomes (copy_generation_id);
create index if not exists listing_outcomes_event_idx on public.listing_outcomes (event_type, created_at);
alter table public.listing_outcomes enable row level security;

-- Owner-scoped via the parent copy_generation, same as compliance_checks above.
-- NOTE: copy_generations.user_id is nullable (anonymous generations) — anonymous
-- callers get no policy match here and recordOutcome() will fail to insert for
-- their own listings until an anonymous-ownership scheme (e.g. a signed anon
-- key, mirroring how the properties table handles it) is added.
do $$ begin
  create policy "listing_outcomes_select_own" on public.listing_outcomes
    for select
    using (
      exists (
        select 1 from public.copy_generations cg
        where cg.id = listing_outcomes.copy_generation_id
          and cg.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "listing_outcomes_insert_own" on public.listing_outcomes
    for insert
    with check (
      exists (
        select 1 from public.copy_generations cg
        where cg.id = listing_outcomes.copy_generation_id
          and cg.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- NOTE: FKs assume `id uuid` primary keys on properties/copy_generations (Supabase default). Adjust if yours differ.
