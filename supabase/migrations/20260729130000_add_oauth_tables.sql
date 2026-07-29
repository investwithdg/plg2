-- OAuth 2.1 authorization server tables backing the MCP connector flow
-- (claude.ai "Add custom connector" and other spec-compliant MCP clients).
-- Lets Pro/Elite members log into their existing PLG account (Supabase Auth)
-- and approve a connector without ever handling a static token, per the MCP
-- Authorization spec: OAuth 2.1 + RFC 8414 authorization server metadata +
-- RFC 7591 dynamic client registration + RFC 9728 protected resource metadata
-- + PKCE (RFC 7636).
--
-- All three tables are managed exclusively by the `oauth` and `mcp` edge
-- functions via the service role — there is no direct end-user access, so RLS
-- is enabled with no permissive policies for anon/authenticated (mirrors
-- enrichment_cache's "service role only" convention: service_role bypasses
-- RLS entirely, so enabling it with no policies simply locks out anon/authenticated
-- while leaving the edge functions unaffected).

-- 1) Dynamically registered OAuth clients (RFC 7591 Dynamic Client Registration)
create table public.oauth_clients (
  client_id text primary key default ('mcp_' || replace(gen_random_uuid()::text, '-', '')),
  client_secret_hash text,                        -- sha256 hex; null for public (PKCE-only) clients
  client_name text,
  redirect_uris jsonb not null,                   -- string[]
  grant_types jsonb not null default '["authorization_code"]'::jsonb,
  response_types jsonb not null default '["code"]'::jsonb,
  token_endpoint_auth_method text not null default 'none',
  scope text,
  metadata jsonb not null default '{}'::jsonb,    -- client_uri, logo_uri, contacts, tos_uri, policy_uri, software_id, software_version
  created_at timestamptz not null default now()
);

alter table public.oauth_clients enable row level security;

-- 2) Short-lived (~10 min), single-use, PKCE-bound authorization codes
create table public.oauth_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,                 -- sha256 hex of the opaque code; plaintext is never stored
  client_id text not null references public.oauth_clients (client_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  resource text,                                  -- RFC 8707 resource indicator, if the client sent one
  scope text,
  expires_at timestamptz not null,
  used_at timestamptz,                            -- set on redemption; a non-null value blocks replay
  created_at timestamptz not null default now()
);

create index oauth_authorization_codes_expires_idx on public.oauth_authorization_codes (expires_at);

alter table public.oauth_authorization_codes enable row level security;

-- 3) Issued access tokens. Only a hash is stored — never the plaintext token —
-- matching how Stripe webhook secrets / signatures are handled elsewhere in
-- this codebase (verify by comparing hashes, never store the raw secret).
create table public.oauth_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,                -- sha256 hex of the opaque token
  client_id text not null references public.oauth_clients (client_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index oauth_access_tokens_user_idx on public.oauth_access_tokens (user_id);
create index oauth_access_tokens_expires_idx on public.oauth_access_tokens (expires_at);

alter table public.oauth_access_tokens enable row level security;

-- TODO(follow-up): no oauth_refresh_tokens table yet. v1 ships opaque access
-- tokens with a 30-day TTL and no refresh grant, so a connected MCP client
-- needs a fresh browser /authorize round-trip after expiry rather than a
-- silent refresh. Add refresh-token issuance + rotation (OAuth 2.1 §4.3.1) and
-- shorten the access-token TTL substantially once that lands — see
-- ACCESS_TOKEN_TTL_MS in supabase/functions/oauth/handler.ts.

-- TODO(follow-up): no scheduled cleanup for expired codes/tokens yet. Rows are
-- small and harmless to retain indefinitely, but a periodic
-- `delete from public.oauth_authorization_codes where expires_at < now() - interval '1 day'`
-- (and similarly for long-expired oauth_access_tokens) would keep these tables tidy.
