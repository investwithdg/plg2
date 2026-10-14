-- Adds listing agent, listing office, and FHA compliance score to properties table.
alter table public.properties
  add column if not exists listing_agent text,
  add column if not exists listing_office text,
  add column if not exists fha_compliance_score integer;
