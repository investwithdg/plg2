create table if not exists public.anonymous_usage (
  anon_key text primary key,
  anon_cookie_hash text not null,
  ip_hash text not null,
  user_agent_hash text not null,
  network_key text not null,
  total_generations integer not null default 0 check (total_generations >= 0),
  pro_tier_generations integer not null default 0 check (pro_tier_generations >= 0),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  last_generation_at timestamptz
);

create index if not exists anonymous_usage_network_key_idx
  on public.anonymous_usage (network_key);

create index if not exists anonymous_usage_last_seen_at_idx
  on public.anonymous_usage (last_seen_at desc);

alter table public.anonymous_usage enable row level security;

create or replace function public.reserve_anonymous_generation(
  p_anon_key text,
  p_anon_cookie_hash text,
  p_ip_hash text,
  p_user_agent_hash text,
  p_network_key text,
  p_is_pro_tier boolean,
  p_total_limit integer default 10,
  p_pro_tier_limit integer default 1
)
returns table(
  allowed boolean,
  error_code text,
  total_generations integer,
  pro_tier_generations integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_row public.anonymous_usage%rowtype;
  did_update boolean;
begin
  if p_anon_key is null or length(p_anon_key) = 0 then
    return query select false, 'anonymous_id_required', 0, 0;
    return;
  end if;

  insert into public.anonymous_usage (
    anon_key,
    anon_cookie_hash,
    ip_hash,
    user_agent_hash,
    network_key
  ) values (
    p_anon_key,
    p_anon_cookie_hash,
    p_ip_hash,
    p_user_agent_hash,
    p_network_key
  )
  on conflict (anon_key) do update set
    anon_cookie_hash = excluded.anon_cookie_hash,
    ip_hash = excluded.ip_hash,
    user_agent_hash = excluded.user_agent_hash,
    network_key = excluded.network_key,
    last_seen_at = timezone('utc', now())
  returning * into usage_row;

  update public.anonymous_usage
  set
    total_generations = total_generations + 1,
    pro_tier_generations = pro_tier_generations + case when p_is_pro_tier then 1 else 0 end,
    last_generation_at = timezone('utc', now()),
    last_seen_at = timezone('utc', now())
  where anon_key = p_anon_key
    and total_generations < p_total_limit
    and (not p_is_pro_tier or pro_tier_generations < p_pro_tier_limit)
  returning * into usage_row;

  did_update := found;

  if did_update then
    return query select true, null::text, usage_row.total_generations, usage_row.pro_tier_generations;
    return;
  end if;

  select * into usage_row
  from public.anonymous_usage
  where anon_key = p_anon_key;

  if usage_row.total_generations >= p_total_limit then
    return query select false, 'free_limit_exceeded', usage_row.total_generations, usage_row.pro_tier_generations;
    return;
  end if;

  if p_is_pro_tier and usage_row.pro_tier_generations >= p_pro_tier_limit then
    return query select false, 'pro_required', usage_row.total_generations, usage_row.pro_tier_generations;
    return;
  end if;

  return query select false, 'usage_check_unavailable', usage_row.total_generations, usage_row.pro_tier_generations;
end;
$$;

create or replace function public.refund_anonymous_generation(
  p_anon_key text,
  p_is_pro_tier boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.anonymous_usage
  set
    total_generations = greatest(total_generations - 1, 0),
    pro_tier_generations = case
      when p_is_pro_tier then greatest(pro_tier_generations - 1, 0)
      else pro_tier_generations
    end,
    last_seen_at = timezone('utc', now())
  where anon_key = p_anon_key;
end;
$$;

revoke all on table public.anonymous_usage from public, anon, authenticated;
revoke all on function public.reserve_anonymous_generation(text, text, text, text, text, boolean, integer, integer) from public, anon, authenticated;
revoke all on function public.refund_anonymous_generation(text, boolean) from public, anon, authenticated;

grant execute on function public.reserve_anonymous_generation(text, text, text, text, text, boolean, integer, integer) to service_role;
grant execute on function public.refund_anonymous_generation(text, boolean) to service_role;
