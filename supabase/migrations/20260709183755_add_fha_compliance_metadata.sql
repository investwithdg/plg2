ALTER TABLE public.properties
ADD COLUMN existing_listing_raw text,
ADD COLUMN fha_compliant_listing_parts text,
ADD COLUMN fha_violations jsonb;
