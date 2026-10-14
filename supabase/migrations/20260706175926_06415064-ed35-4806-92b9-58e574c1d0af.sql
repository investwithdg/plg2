
DROP POLICY IF EXISTS properties_select_public_safe ON public.properties;
DROP POLICY IF EXISTS copy_generations_select_public_safe ON public.copy_generations;

COMMENT ON TABLE public.enrichment_cache IS 'Internal cache. Service-role only; no PostgREST access by design.';

CREATE POLICY enrichments_select_own ON public.enrichments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = enrichments.property_id AND p.user_id = auth.uid()
  ));
