CREATE TABLE public.brand_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tone TEXT,
  banned_words TEXT[] NOT NULL DEFAULT '{}',
  signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_profiles TO authenticated;
GRANT ALL ON public.brand_profiles TO service_role;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_profiles_select_own" ON public.brand_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "brand_profiles_insert_own" ON public.brand_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_profiles_update_own" ON public.brand_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.update_brand_profiles_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_brand_profiles_updated_at BEFORE UPDATE ON public.brand_profiles FOR EACH ROW EXECUTE FUNCTION public.update_brand_profiles_updated_at();