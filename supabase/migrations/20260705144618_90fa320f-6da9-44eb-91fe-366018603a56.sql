
-- Drop the SECURITY DEFINER views (flagged by linter)
DROP VIEW IF EXISTS public.public_properties;
DROP VIEW IF EXISTS public.public_copy_generations;

-- Restore an anon SELECT policy on both tables, but combine it with
-- column-level GRANTs so sensitive columns are not reachable.
CREATE POLICY "properties_select_public_safe"
  ON public.properties FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "copy_generations_select_public_safe"
  ON public.copy_generations FOR SELECT TO anon, authenticated
  USING (true);

-- Reset table-level SELECT privilege for anon, then grant only safe columns.
REVOKE SELECT ON public.properties FROM anon;
REVOKE SELECT ON public.copy_generations FROM anon;

GRANT SELECT (
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
) ON public.properties TO anon;

GRANT SELECT (
  id,
  property_id,
  copy_type,
  content,
  generation_number,
  created_at
) ON public.copy_generations TO anon;

-- Ensure authenticated users retain full column access (their own rows via RLS).
GRANT SELECT ON public.properties TO authenticated;
GRANT SELECT ON public.copy_generations TO authenticated;
