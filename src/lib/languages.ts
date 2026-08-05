// Frontend mirror of supabase/functions/_shared/languages.ts — same pattern as
// src/hooks/usePlanTier.ts mirroring the edge functions' planTier.ts. Keep the code/label
// list identical on both sides; the backend is the source of truth for what's actually
// accepted, this is just for rendering the picker.
export interface SupportedLanguage {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
  { code: "vi", label: "Vietnamese" },
  { code: "ko", label: "Korean" },
  { code: "ru", label: "Russian" },
  { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" },
  { code: "tl", label: "Tagalog" },
  { code: "ar", label: "Arabic" },
];

export function getLanguageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
