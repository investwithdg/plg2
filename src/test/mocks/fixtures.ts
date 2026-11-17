/**
 * fixtures.ts
 *
 * Standard, authoritative test fixtures for PLG2:
 * - Properties (compliant, with violations, pending, error)
 * - FHA violations and remarks
 * - Copy generations
 * - Research dossier / enrichment data (standard, empty amenities, drive-time amenities)
 * - Users & subscription tiers
 */
import type {
  CopyGeneration,
  EnrichmentData,
  PropertyWithCopies,
} from "@/hooks/usePropertyPolling";
import type { User } from "@supabase/supabase-js";

/**
 * 100% compliant property with zero violations.
 */
export const mockCompleteProperty: PropertyWithCopies = {
  id: "prop-1111-2222-3333",
  address: "742 Evergreen Terrace, Springfield, OR 97477",
  property_type: "sfr",
  beds: 4,
  baths: 2.5,
  sqft: 2450,
  price: 525000,
  status: "complete",
  enrichment_step: "done",
  fha_violations: [],
  fha_compliant_listing_parts:
    "Spacious 4-bedroom single family home with updated kitchen, landscaped backyard, and two-car garage.",
  existing_listing_raw:
    "Beautiful light-filled two-story home featuring granite countertops, hardwood floors, large primary suite, and private fenced yard.",
  listing_agent: "Eleanor Vance",
  listing_office: "Evergreen Realty Group",
  fha_compliance_score: 100,
  fha_categories: {
    protected_classes: {
      passed: true,
      reasoning: "No mentions of race, religion, sex, disability, or familial status.",
    },
    steering_coded_language: {
      passed: true,
      reasoning: "No implicit or explicit steering towards specific resident types.",
    },
    demographics_character: {
      passed: true,
      reasoning: "Focuses strictly on physical property features.",
    },
  },
  created_at: "2026-11-15T12:00:00.000Z",
};

/**
 * Property with FHA violations that required auto-mitigation.
 */
export const mockViolationsProperty: PropertyWithCopies = {
  id: "prop-4444-5555-6666",
  address: "100 Elm Street, Oakville, CA 94562",
  property_type: "sfr",
  beds: 3,
  baths: 2,
  sqft: 1850,
  price: 780000,
  status: "complete",
  enrichment_step: "done",
  fha_violations: [
    "walking distance to Catholic Church",
    "perfect for quiet bachelor or single professional",
    "exclusive mature adult neighborhood",
  ],
  fha_compliant_listing_parts:
    "Conveniently situated near local neighborhood amenities, parks, and downtown corridor. Ideal layout featuring flexible home office space and peaceful surroundings.",
  existing_listing_raw:
    "Charming property located in walking distance to Catholic Church. Perfect for quiet bachelor or single professional looking for an exclusive mature adult neighborhood.",
  listing_agent: "Marcus Thorne",
  listing_office: "Pacific Heritage Real Estate",
  fha_compliance_score: 70,
  fha_categories: {
    protected_classes: {
      passed: false,
      reasoning:
        "Flagged religious landmark reference ('Catholic Church') and familial status targeting ('single professional').",
    },
    steering_coded_language: {
      passed: false,
      reasoning: "Flagged 'exclusive mature adult neighborhood' as steering by age/demographics.",
    },
    demographics_character: {
      passed: false,
      reasoning: "Mitigated resident profiling to neutral property descriptions.",
    },
  },
  created_at: "2026-11-14T10:30:00.000Z",
};

/**
 * Property in pending / initial state.
 */
export const mockPendingProperty: PropertyWithCopies = {
  id: "prop-pending-0001",
  address: "500 Ocean Boulevard, Santa Monica, CA 90401",
  property_type: "lux",
  beds: 5,
  baths: 5,
  sqft: 4800,
  price: 3850000,
  status: "pending",
  enrichment_step: "started",
  fha_violations: null,
  fha_compliant_listing_parts: null,
  existing_listing_raw: null,
  listing_agent: null,
  listing_office: null,
  fha_compliance_score: null,
  fha_categories: null,
  created_at: new Date().toISOString(),
};

/**
 * Property currently processing neighborhood enrichment.
 */
export const mockProcessingProperty: PropertyWithCopies = {
  ...mockPendingProperty,
  id: "prop-processing-0002",
  status: "processing",
  enrichment_step: "analyzing_neighborhood",
};

/**
 * Property that encountered an error.
 */
export const mockErrorProperty: PropertyWithCopies = {
  ...mockPendingProperty,
  id: "prop-error-0003",
  status: "error",
  enrichment_step: null,
};

/**
 * Standard generated copy items.
 */
export const mockCopyGenerations: CopyGeneration[] = [
  {
    id: "copy-1",
    copy_type: "standard",
    content:
      "Immaculate single-family home boasting modern architectural finishes and serene views.",
    created_at: "2026-11-15T12:05:00.000Z",
  },
  {
    id: "copy-2",
    copy_type: "social",
    content:
      "✨ Just listed! Beautiful 4BD/2.5BA turnkey home in prime Springfield location. DM for private showings!",
    created_at: "2026-11-15T12:05:10.000Z",
  },
  {
    id: "copy-3",
    copy_type: "bulleted",
    content:
      "• 4 Spacious Bedrooms\n• Chef's Kitchen with Quartz Countertops\n• Expansive Two-Tier Deck\n• Attached 2-Car Garage",
    created_at: "2026-11-15T12:05:20.000Z",
  },
];

/**
 * Rich neighborhood enrichment dataset with multi-category amenities and schools.
 */
export const mockEnrichmentData: EnrichmentData = {
  walkability_score: 88,
  median_home_value: 540000,
  market_overview:
    "Springfield's market displays strong year-over-year appreciation with steady demand for turnkey residential inventory.",
  schools: [
    {
      name: "Springfield Elementary",
      type: "Public",
      grades: "K-5",
      distance: "0.4 mi",
      rating: 8,
    },
    {
      name: "Springfield Middle School",
      type: "Public",
      grades: "6-8",
      distance: "1.1 mi",
      rating: 7,
    },
    {
      name: "Springfield High School",
      type: "Public",
      grades: "9-12",
      distance: "1.8 mi",
      rating: 9,
    },
  ],
  transit_options: [
    { name: "Downtown Express Shuttle", type: "Bus Line", distance: "0.2 mi" },
    { name: "Central Metro Rail Station", type: "Light Rail", distance: "0.8 mi" },
  ],
  nearby_amenities: [
    { name: "Trader Joe's", type: "Grocery", distance: "0.5 mi" },
    { name: "Evergreen Community Park", type: "Park", distance: "0.3 mi" },
    { name: "Equinox Fitness", type: "Fitness", distance: "0.9 mi" },
    { name: "Blue Bottle Coffee", type: "Coffee Shop", distance: "0.4 mi" },
    { name: "Springfield General Health Center", type: "Healthcare", distance: "1.2 mi" },
  ],
  key_sources: [
    {
      name: "GreatSchools",
      url: "https://www.greatschools.org/oregon/springfield",
      facts_provided: "School boundary ratings and grade breakdowns",
    },
    {
      name: "WalkScore",
      url: "https://www.walkscore.com/score/742-evergreen-terrace",
      facts_provided: "Walkability index (88/100)",
    },
  ],
};

/**
 * Enrichment dataset where amenities array is empty (for testing cache bypass).
 */
export const mockEmptyAmenitiesEnrichmentData: EnrichmentData = {
  ...mockEnrichmentData,
  nearby_amenities: [],
};

/**
 * Enrichment dataset using drive-time strings and optional/null distances.
 */
export const mockDriveTimeAmenitiesEnrichmentData: EnrichmentData = {
  ...mockEnrichmentData,
  nearby_amenities: [
    { name: "Costco Wholesale", type: "Retail / Bulk", distance: "8-12 min drive" },
    { name: "Regional Medical Center", type: "Hospital", distance: "15 min drive" },
    { name: "Pine Valley Trailhead", type: "Recreation", distance: "5 min drive" },
    { name: "Local Farmers Market", type: "Grocery", distance: undefined },
    { name: "Community Library", type: "Civic" },
  ],
};

/**
 * User and plan tier fixtures.
 */
export const mockFreeUser: User = {
  id: "user-free-100",
  app_metadata: { provider: "email" },
  user_metadata: { plan: "free" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

export const mockProUser: User = {
  id: "user-pro-200",
  app_metadata: { provider: "email", plan: "pro" },
  user_metadata: { plan: "pro" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

export const mockEliteUser: User = {
  id: "user-elite-300",
  app_metadata: { provider: "email", plan: "elite" },
  user_metadata: { plan: "elite" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

export const mockProPlanVariants = [
  "pro",
  "PRO",
  "Pro",
  "PrO",
  "pro_annual",
  "pro_monthly",
  "pro-tier",
];

export const mockActiveProSubscription = {
  id: "sub-pro-01",
  user_id: "user-pro-200",
  plan: "pro",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const mockActiveEliteSubscription = {
  id: "sub-elite-01",
  user_id: "user-elite-300",
  plan: "elite",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const mockCanceledSubscription = {
  id: "sub-canceled-01",
  user_id: "user-free-100",
  plan: "pro",
  status: "canceled",
  created_at: "2025-01-01T00:00:00.000Z",
};
