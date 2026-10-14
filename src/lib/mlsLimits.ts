/**
 * mlsLimits.ts
 *
 * State detection and MLS character limit presets.
 * Helps real estate agents avoid costly MLS truncation by matching
 * standard character constraints (e.g., Matrix, Bright MLS, CRMLS, Stellar, HAR).
 */

export interface MlsLimitPreset {
  id: string;
  label: string;
  limit: number; // 0 for unlimited
  description: string;
}

export const MLS_LIMIT_PRESETS: MlsLimitPreset[] = [
  {
    id: "standard-1000",
    label: "1,000 Chars (Standard MLS)",
    limit: 1000,
    description: "CRMLS, Stellar, HAR, ACTRIS, FMLS, OneKey & most regional boards",
  },
  {
    id: "bright-1024",
    label: "1,024 Chars (Bright MLS / Matrix)",
    limit: 1024,
    description: "Mid-Atlantic: PA, NJ, DE, MD, VA, DC, WV (Standard Matrix limit)",
  },
  {
    id: "compact-500",
    label: "500 Chars (Compact / Syndication)",
    limit: 500,
    description: "Strict legacy boards, print flyers & syndication remark fields",
  },
  {
    id: "extended-1500",
    label: "1,500 Chars (Extended Remarks)",
    limit: 1500,
    description: "Expanded MLS boards & commercial portals",
  },
  {
    id: "max-2000",
    label: "2,000 Chars (Maximum Field Limit)",
    limit: 2000,
    description: "Long-form portals and broker website remarks",
  },
  {
    id: "unlimited",
    label: "Unlimited / Uncapped",
    limit: 0,
    description: "No character cutoff enforcement",
  },
];

const BRIGHT_MLS_STATES = new Set(["PA", "NJ", "DE", "MD", "VA", "DC", "WV"]);

const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", Tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC"
};

/**
 * Parses an address string or Zillow URL and returns the 2-letter US state code if detected.
 */
export function detectStateFromAddress(query?: string | null): string | null {
  if (!query || typeof query !== "string") return null;

  const normalized = query.trim();

  // 1. High-priority: Look for ", [STATE] [ZIP]" or ", [STATE]" towards the end of the address
  // e.g. ", TX 78701", ", DC 20500", ", CA"
  const endStateRegex = /,\s*([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/;
  const endMatch = normalized.match(endStateRegex);
  if (endMatch) {
    const code = endMatch[1].toUpperCase();
    if (US_STATE_CODES.includes(code)) return code;
  }

  // 2. Check for ", [STATE_NAME] [ZIP]" towards the end
  const lower = normalized.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    const endNameRegex = new RegExp(`,\\s*${name}(?:\\s+\\d{5})?\\s*$`, "i");
    if (endNameRegex.test(lower)) {
      return code;
    }
  }

  // 3. Fallback: match 2-letter state code after comma: ", TX "
  const commaStateRegex = /,\s*([A-Za-z]{2})\b/;
  const commaMatch = normalized.match(commaStateRegex);
  if (commaMatch) {
    const code = commaMatch[1].toUpperCase();
    if (US_STATE_CODES.includes(code)) return code;
  }

  // 4. Fallback: full state name preceded by comma
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    const nameRegex = new RegExp(`,\\s*${name}\\b`, "i");
    if (nameRegex.test(lower)) {
      return code;
    }
  }

  return null;
}

/**
 * Returns the recommended MLS limit preset for a given address.
 */
export function getRecommendedMlsLimit(query?: string | null): MlsLimitPreset {
  const state = detectStateFromAddress(query);
  if (state && BRIGHT_MLS_STATES.has(state)) {
    return MLS_LIMIT_PRESETS.find((p) => p.id === "bright-1024") || MLS_LIMIT_PRESETS[0];
  }
  return MLS_LIMIT_PRESETS[0]; // standard 1000 chars
}

/**
 * Truncates text cleanly at a sentence or word boundary to fit within the character limit.
 */
export function autoTrimToLimit(text: string, limit: number): string {
  if (limit <= 0 || text.length <= limit) return text;

  const sliced = text.slice(0, limit);

  // Look for the last sentence terminator (. ! ?) within the sliced string
  const lastSentence = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("! "),
    sliced.lastIndexOf("? "),
    sliced.lastIndexOf(".\n"),
    sliced.lastIndexOf("!\n"),
    sliced.lastIndexOf("?\n")
  );

  if (lastSentence > limit * 0.7) {
    return sliced.slice(0, lastSentence + 1).trim();
  }

  // Fallback: look for the last space
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > limit * 0.8) {
    return sliced.slice(0, lastSpace).trim() + "...";
  }

  return sliced.trim();
}
