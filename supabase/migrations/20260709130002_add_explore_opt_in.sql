ALTER TABLE public.properties
ADD COLUMN is_public boolean NOT NULL DEFAULT false,
ADD COLUMN mls_number text;

CREATE INDEX idx_properties_is_public ON public.properties(is_public) WHERE is_public = true;
