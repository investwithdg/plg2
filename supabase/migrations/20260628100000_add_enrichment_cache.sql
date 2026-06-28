-- Neighborhood-level enrichment cache to avoid redundant Perplexity API calls.
-- Cache key is normalized to city+state+zip so nearby properties share enrichment data.

CREATE TABLE public.enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL,
  enrichment_data jsonb NOT NULL DEFAULT '{}',
  perplexity_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrichment_cache_cache_key_unique UNIQUE (cache_key)
);

CREATE INDEX idx_enrichment_cache_created_at
  ON public.enrichment_cache (created_at DESC);

ALTER TABLE public.enrichment_cache ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) reads/writes this table
CREATE POLICY "Service role full access on enrichment_cache"
  ON public.enrichment_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);
