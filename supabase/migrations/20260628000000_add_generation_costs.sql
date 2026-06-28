-- Track API costs per generation for usage-based billing and unit economics

CREATE TABLE public.generation_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,

  -- Perplexity extraction (sonar-pro)
  extraction_input_tokens integer,
  extraction_output_tokens integer,
  extraction_cost_usd numeric(10, 6),

  -- Perplexity enrichment (sonar)
  enrichment_input_tokens integer,
  enrichment_output_tokens integer,
  enrichment_cost_usd numeric(10, 6),

  -- OpenAI copy generation (gpt-4o-mini, summed across 3 copies)
  copy_input_tokens integer,
  copy_output_tokens integer,
  copy_cost_usd numeric(10, 6),

  -- Totals
  total_input_tokens integer GENERATED ALWAYS AS (
    COALESCE(extraction_input_tokens, 0)
    + COALESCE(enrichment_input_tokens, 0)
    + COALESCE(copy_input_tokens, 0)
  ) STORED,
  total_output_tokens integer GENERATED ALWAYS AS (
    COALESCE(extraction_output_tokens, 0)
    + COALESCE(enrichment_output_tokens, 0)
    + COALESCE(copy_output_tokens, 0)
  ) STORED,
  total_cost_usd numeric(10, 6) GENERATED ALWAYS AS (
    COALESCE(extraction_cost_usd, 0)
    + COALESCE(enrichment_cost_usd, 0)
    + COALESCE(copy_cost_usd, 0)
  ) STORED,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX generation_costs_property_id_idx ON public.generation_costs (property_id);
CREATE INDEX generation_costs_user_id_created_idx ON public.generation_costs (user_id, created_at DESC);
CREATE INDEX generation_costs_created_at_idx ON public.generation_costs (created_at DESC);

ALTER TABLE public.generation_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generation_costs_select_authenticated"
  ON public.generation_costs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "generation_costs_select_service"
  ON public.generation_costs
  FOR SELECT
  TO service_role
  USING (true);
