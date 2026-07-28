-- Adds a structured fha_categories column to properties table to store detailed checklist check results.
alter table public.properties
  add column if not exists fha_categories jsonb;
