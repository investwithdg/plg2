-- Adds structured source citations to enrichments, replacing the frontend's
-- regex-scraped "naked domain" citation list. Additive/idempotent.
alter table public.enrichments add column if not exists key_sources jsonb;
