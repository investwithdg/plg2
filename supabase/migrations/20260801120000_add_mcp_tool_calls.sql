-- Per-user, per-tool call log for the MCP server, used purely for rate limiting
-- (supabase/functions/mcp/deps.ts's checkRateLimit). Pro/Elite users have no other
-- throttle on MCP-triggered generation — see receive-property's `hasProPlan` branch,
-- which skips every free-tier cap for paid plans, on both the web and MCP paths.
create table if not exists public.mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool text not null,
  created_at timestamptz not null default now()
);

-- Rate-limit checks are "count rows for this user+tool since <window start>" — this index
-- covers that query directly. No need to ever scan the whole table.
create index if not exists mcp_tool_calls_user_tool_created_idx
  on public.mcp_tool_calls (user_id, tool, created_at desc);

-- Service-role only (same pattern as oauth_access_tokens / oauth_authorization_codes):
-- this table is written and read exclusively by the mcp edge function via the service
-- role key, never by a client-side query, so RLS is enabled with no policies.
alter table public.mcp_tool_calls enable row level security;
