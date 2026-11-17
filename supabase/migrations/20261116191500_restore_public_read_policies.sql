-- Restore safe read access (SELECT) for anonymous and authenticated clients
-- on public.properties, public.copy_generations, and public.enrichments.
-- All mutations (INSERT, UPDATE, DELETE) remain strictly blocked for client roles
-- and are executed solely via Edge Functions with the service_role key.

-- 1. Ensure RLS remains enabled on all core tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichments ENABLE ROW LEVEL SECURITY;

-- 2. Restore full table-level SELECT privilege to anon and authenticated
GRANT SELECT ON public.properties TO anon, authenticated;
GRANT SELECT ON public.copy_generations TO anon, authenticated;
GRANT SELECT ON public.enrichments TO anon, authenticated;

-- 3. Explicitly revoke all client-side write privileges (defense-in-depth)
REVOKE INSERT, UPDATE, DELETE ON public.properties FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.copy_generations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.enrichments FROM anon, authenticated;

-- 4. Ensure service_role retains unrestricted access
GRANT ALL ON public.properties TO service_role;
GRANT ALL ON public.copy_generations TO service_role;
GRANT ALL ON public.enrichments TO service_role;

-- 5. Drop obsolete / conflicting public SELECT policies if present
DROP POLICY IF EXISTS "properties_select_public_safe" ON public.properties;
DROP POLICY IF EXISTS "properties_select_anon" ON public.properties;

DROP POLICY IF EXISTS "copy_generations_select_public_safe" ON public.copy_generations;
DROP POLICY IF EXISTS "copy_generations_select_anon" ON public.copy_generations;

DROP POLICY IF EXISTS "enrichments_select_public_safe" ON public.enrichments;
DROP POLICY IF EXISTS "enrichments_select_anon" ON public.enrichments;

-- 6. Create permissive SELECT policies for anon and authenticated users
CREATE POLICY "properties_select_public_safe"
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "copy_generations_select_public_safe"
  ON public.copy_generations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "enrichments_select_public_safe"
  ON public.enrichments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. Ensure properties table is published for Realtime changes
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
