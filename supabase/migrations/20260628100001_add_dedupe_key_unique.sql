-- Add UNIQUE constraint on dedupe_key to prevent race-condition duplicate generations.
-- The existing non-unique index on (dedupe_key, created_at DESC) is kept for query performance.

ALTER TABLE public.properties
  ADD CONSTRAINT properties_dedupe_key_unique UNIQUE (dedupe_key);
