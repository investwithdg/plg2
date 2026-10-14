
-- Remove overly permissive anon SELECT policies from user-data tables
DROP POLICY IF EXISTS "properties_select_anon" ON public.properties;
DROP POLICY IF EXISTS "copy_generations_select_anon" ON public.copy_generations;
DROP POLICY IF EXISTS "enrichments_select_anon" ON public.enrichments;

-- Remove overly permissive ALL policy on enrichment_cache (public role)
DROP POLICY IF EXISTS "Service role full access on enrichment_cache" ON public.enrichment_cache;

-- Owner-scoped SELECT for signed-in users (used by ListingHistory)
CREATE POLICY "properties_select_own"
  ON public.properties FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "copy_generations_select_own"
  ON public.copy_generations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Safe public views that expose only non-sensitive columns for the
-- share/explore/polling surfaces. These are SECURITY DEFINER (default)
-- views owned by postgres, so they intentionally project a limited
-- column set from the underlying tables without exposing ip_hash,
-- source_url, dedupe_key, user_id, model_used, or raw API responses.
CREATE OR REPLACE VIEW public.public_properties
  WITH (security_barrier = true) AS
SELECT
  id,
  address,
  property_type,
  status,
  enrichment_step,
  extraction_status,
  failed_step,
  beds,
  baths,
  sqft,
  price,
  created_at
FROM public.properties;

CREATE OR REPLACE VIEW public.public_copy_generations
  WITH (security_barrier = true) AS
SELECT
  id,
  property_id,
  copy_type,
  content,
  generation_number,
  created_at
FROM public.copy_generations;

REVOKE ALL ON public.public_properties FROM PUBLIC;
REVOKE ALL ON public.public_copy_generations FROM PUBLIC;
GRANT SELECT ON public.public_properties TO anon, authenticated;
GRANT SELECT ON public.public_copy_generations TO anon, authenticated;
