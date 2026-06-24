-- PropertyListingGenerator core schema (properties, enrichments, copy_generations)

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  property_type text,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  source text,
  source_url text,
  status text NOT NULL DEFAULT 'pending',
  enrichment_step text,
  failed_step text,
  dedupe_key text,
  ip_hash text,
  beds integer,
  baths numeric,
  sqft integer,
  price numeric,
  extraction_status text,
  extraction_latency_ms integer,
  extraction_model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX properties_dedupe_created_idx
  ON public.properties (dedupe_key, created_at DESC);

CREATE INDEX properties_user_created_idx
  ON public.properties (user_id, created_at DESC);

CREATE INDEX properties_ip_created_idx
  ON public.properties (ip_hash, created_at DESC);

CREATE TABLE public.enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  schools jsonb,
  transit_options jsonb,
  nearby_amenities jsonb,
  walkability_score integer,
  market_overview text,
  median_home_value numeric,
  perplexity_raw_response jsonb,
  enrichment_latency_ms integer,
  enrichment_model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX enrichments_property_id_idx ON public.enrichments (property_id);

CREATE TABLE public.copy_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  batch_id uuid,
  copy_type text NOT NULL,
  generation_number integer,
  content text NOT NULL,
  model_used text,
  fha_compliance_check boolean NOT NULL DEFAULT false,
  generation_latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX copy_generations_property_id_idx
  ON public.copy_generations (property_id);

-- RLS: edge functions use service_role (bypasses RLS). Frontend polls with publishable key.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_anon"
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "enrichments_select_anon"
  ON public.enrichments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "copy_generations_select_anon"
  ON public.copy_generations
  FOR SELECT
  TO anon, authenticated
  USING (true);
