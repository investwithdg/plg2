-- Long-lived MCP API keys for the "mcp" edge function (dashboard-issued, one-time-shown).
-- Lets a user paste a static token into a static MCP client config (Claude Desktop,
-- `claude mcp add --header`, Cursor, etc.) instead of a short-lived Supabase session JWT.
-- Only the SHA-256 hash of the key is ever stored — see supabase/functions/_shared/apiKeys.ts.
-- Managed by the manage-api-keys edge function; verified by mcp/deps.ts's verifyCaller.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  key_prefix text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_user_idx on public.api_keys (user_id);

-- A key's hash must be unique so verifyCaller's lookup-by-hash is unambiguous.
create unique index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

-- Users can see their own keys (metadata only — key_hash is never selected by the edge
-- function response, but RLS alone must not be relied on to hide it: manage-api-keys'
-- list/create responses explicitly omit key_hash column-by-column).
do $$ begin
  create policy "api_keys_select_own" on public.api_keys
    for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Users can create their own keys (the manage-api-keys edge function itself enforces the
-- Pro/Elite plan gate before inserting; this policy is a second, defense-in-depth backstop
-- scoped to ownership only).
do $$ begin
  create policy "api_keys_insert_own" on public.api_keys
    for insert
    to authenticated
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Users can revoke (update revoked_at on) only their own keys.
do $$ begin
  create policy "api_keys_update_own" on public.api_keys
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- No delete policy: keys are revoked (soft-deleted via revoked_at), never removed, so
-- last_used_at / created_at stay available for audit.
