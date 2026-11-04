-- Vision+ cost tracking. generation_costs has one column trio per pipeline stage
-- (extraction / enrichment / copy); photo analysis is a fourth stage that runs asynchronously
-- after the text-only listing, so rather than force-fitting its tokens into copy_* (which
-- would corrupt per-stage unit economics), it gets its own nullable columns.
--
-- analyze-property-photos inserts its own generation_costs row per batch with only these
-- columns populated, so it can never race or overwrite the row process-property writes.
--
-- The three total_* columns are GENERATED ALWAYS ... STORED, and Postgres cannot alter a
-- generation expression in place — they are dropped and recreated with the new term added.
-- Nothing is lost: they are derived values, recomputed from the stored per-stage columns, and
-- no view or index depends on them.

alter table public.generation_costs
  add column if not exists photo_analysis_input_tokens integer,
  add column if not exists photo_analysis_output_tokens integer,
  add column if not exists photo_analysis_cost_usd numeric(10, 6),
  add column if not exists photo_analysis_model_version text;

alter table public.generation_costs
  drop column if exists total_input_tokens,
  drop column if exists total_output_tokens,
  drop column if exists total_cost_usd;

alter table public.generation_costs
  add column total_input_tokens integer generated always as (
    coalesce(extraction_input_tokens, 0)
    + coalesce(enrichment_input_tokens, 0)
    + coalesce(copy_input_tokens, 0)
    + coalesce(photo_analysis_input_tokens, 0)
  ) stored,
  add column total_output_tokens integer generated always as (
    coalesce(extraction_output_tokens, 0)
    + coalesce(enrichment_output_tokens, 0)
    + coalesce(copy_output_tokens, 0)
    + coalesce(photo_analysis_output_tokens, 0)
  ) stored,
  add column total_cost_usd numeric(10, 6) generated always as (
    coalesce(extraction_cost_usd, 0)
    + coalesce(enrichment_cost_usd, 0)
    + coalesce(copy_cost_usd, 0)
    + coalesce(photo_analysis_cost_usd, 0)
  ) stored;
