-- Elite waitlist: pricing page capture while Elite has no Stripe price yet.
-- Insert-only from the client (anon or authenticated) — no select/update/delete
-- policy, so a submitted email/name can never be read back through the API.
-- Only the service role (dashboard, exports) can read it.
create table if not exists public.elite_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.elite_waitlist enable row level security;

create policy "anyone can join the waitlist"
  on public.elite_waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Bilingual generation (Elite): a listing can request one secondary language
-- alongside the default English copy. Null means English-only (every existing
-- row, and every non-Elite generation going forward).
alter table public.properties
  add column if not exists secondary_language text;

-- Every copy_generations row is tagged with its language so the same
-- (property, copy_type) can have both an 'en' row and a translated row.
-- Existing rows default to 'en' — they're all English copy generated before
-- this feature existed.
alter table public.copy_generations
  add column if not exists language text not null default 'en';
