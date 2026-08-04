// Bilingual generation (Elite): the fixed set of secondary languages a listing can be
// translated into alongside the default English copy. Deliberately curated to languages
// real estate agents in the US actually encounter with buyers/renters, mirroring HUD's
// language-access guidance rather than offering every language under the sun.
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

const CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function isSupportedLanguage(code: string | null | undefined): code is string {
  return typeof code === "string" && CODES.has(code);
}

export function getLanguageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
