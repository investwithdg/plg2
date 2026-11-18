import { describe, it, expect } from "vitest";
import {
  EXTRACTION_SCHEMA,
  buildEnrichmentSchema,
  buildAnchoredAddress,
  hasGeographicAnchor,
} from "../../supabase/functions/_shared/llm.ts";
import {
  buildFocusedEnrichmentPrompts,
  getProfile,
  PROFILES,
} from "../../supabase/functions/_shared/propertyProfiles.ts";
import {
  fetchVerifiedAmenities,
  formatDistanceMiles,
  haversineMiles,
  type FetchLike,
} from "../../supabase/functions/_shared/googlePlaces.ts";

// Mirror of the process-property cache validation logic
function isValidAmenityList(amenities: unknown): boolean {
  if (!Array.isArray(amenities) || amenities.length === 0) {
    return false;
  }
  return amenities.some(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).name === "string" &&
      ((item as Record<string, unknown>).name as string).trim().length > 0,
  );
}

function enrichmentCacheKey(address: string, propertyType?: string): string {
  const parts = address.toLowerCase().trim().replace(/\s+/g, " ").split(",");
  const base = parts.length >= 2 ? parts.slice(1).join(",").trim() : parts[0];
  const typeSuffix = propertyType ? `|${propertyType.toLowerCase().trim()}` : "";
  return base + typeSuffix;
}

describe("Milestone 3: Rich Amenities Procurement & Perplexity Pipeline", () => {
  describe("Task 1: Relax nearby_amenities JSON schema", () => {
    it("ensures distance is optional and nullable in nearby_amenities", () => {
      const schemaWithSchools = buildEnrichmentSchema(true);
      const schemaNoSchools = buildEnrichmentSchema(false);

      for (const schema of [schemaWithSchools, schemaNoSchools]) {
        const properties = schema.properties as Record<
          string,
          {
            type: string;
            items: { properties: Record<string, { type: unknown }>; required: string[] };
          }
        >;
        const amenities = properties.nearby_amenities;
        expect(amenities).toBeDefined();
        expect(amenities.type).toBe("array");

        const itemProps = amenities.items.properties;
        expect(itemProps.name).toBeDefined();
        expect(itemProps.name.type).toBe("string");

        expect(itemProps.type).toBeDefined();
        expect(itemProps.type.type).toBe("string");

        // Distance must be nullable: ["string", "null"]
        expect(itemProps.distance).toBeDefined();
        expect(itemProps.distance.type).toEqual(["string", "null"]);

        // Required must ONLY be name and type (distance removed from required)
        expect(amenities.items.required).toEqual(["name", "type"]);
        expect(amenities.items.required).not.toContain("distance");
      }
    });

    it("allows entries with null distance or drive time without violating required fields", () => {
      const schema = buildEnrichmentSchema(true);
      const properties = schema.properties as Record<string, { items: { required: string[] } }>;
      const requiredFields = properties.nearby_amenities.items.required;

      const entryWithNull = { name: "Riverside Park", type: "Park", distance: null };
      const entryWithDriveTime = { name: "Trader Joe's", type: "Grocery", distance: "5 min drive" };
      const entryWithoutDistance = { name: "Local Diner", type: "Restaurant" };

      for (const field of requiredFields) {
        expect(entryWithNull).toHaveProperty(field);
        expect(entryWithDriveTime).toHaveProperty(field);
        expect(entryWithoutDistance).toHaveProperty(field);
      }
    });
  });

  describe("Task 2: Upgrade system prompt and enrichment rules", () => {
    it("includes directives for 4-8 diverse daily amenities across groceries, parks, dining, and fitness", () => {
      const residentialProfile = getProfile("sfr");
      const systemPrompt = residentialProfile.enrichment.systemPrompt;

      expect(systemPrompt).toContain("4-8 diverse daily amenities");
      expect(systemPrompt).toContain("Groceries/markets");
      expect(systemPrompt).toContain("Parks/trails");
      expect(systemPrompt).toContain("Dining/cafes");
      expect(systemPrompt).toContain("Fitness/recreation");
    });

    it("instructs model to accept approximate distance, drive time, or neighborhood corridor rather than omitting", () => {
      const residentialProfile = getProfile("sfr");
      const systemPrompt = residentialProfile.enrichment.systemPrompt;

      expect(systemPrompt).toContain("5 min drive");
      expect(systemPrompt).toContain("corridor");
      expect(systemPrompt).toContain("rather than omitting");
    });

    it("expands search radius up to 5-10 miles for suburban/rural properties across states", () => {
      const residentialProfile = getProfile("sfr");
      const systemPrompt = residentialProfile.enrichment.systemPrompt;

      expect(systemPrompt).toContain("5-10 miles");
    });

    it("ensures residential, commercial, land, and multi-family profile prompts reflect rich amenity directives", () => {
      const profilesToCheck = ["sfr", "mf", "commercial", "land"];

      for (const key of profilesToCheck) {
        const profile = getProfile(key);
        expect(profile).toBeDefined();

        const sysPrompt = profile.enrichment.systemPrompt;
        expect(sysPrompt).toContain("4-8 diverse daily amenities");
        expect(sysPrompt).toContain("rather than omitting");

        const userPrompt = profile.enrichment.userPrompt("123 Test Road, Smalltown, TX 78000");
        expect(userPrompt).toContain("nearby_amenities");
        expect(userPrompt).toContain("4-8");
      }
    });

    it("supports dedicated land and lot profile with regional amenity directives", () => {
      const landProfile = getProfile("land");
      const lotProfile = getProfile("lot");

      expect(landProfile.label).toBe("Land / Lot");
      expect(lotProfile.label).toBe("Land / Lot");

      const sysPrompt = landProfile.enrichment.systemPrompt;
      expect(sysPrompt).toContain("4-8 diverse daily amenities");

      const userPrompt = landProfile.enrichment.userPrompt("Rural Highway 10, Kerrville, TX");
      expect(userPrompt).toContain("3-10 miles");
      expect(userPrompt).toContain("10 min drive");
    });
  });

  describe("Task 3: Prevent cache poisoning in process-property", () => {
    it("correctly identifies valid and invalid amenity lists", () => {
      expect(isValidAmenityList([])).toBe(false);
      expect(isValidAmenityList(null)).toBe(false);
      expect(isValidAmenityList(undefined)).toBe(false);
      expect(isValidAmenityList([{}])).toBe(false);
      expect(isValidAmenityList([{ name: "  " }])).toBe(false);

      expect(isValidAmenityList([{ name: "Whole Foods Market", type: "Grocery" }])).toBe(true);
      expect(isValidAmenityList([{ name: "Local Park", type: "Park", distance: null }])).toBe(true);
      expect(isValidAmenityList([{ name: "Gym", type: "Fitness", distance: "5 min drive" }])).toBe(
        true,
      );
    });

    it("simulates cache bypass when nearby_amenities is empty, preventing serving poisoned cache", () => {
      // Mock cache rows
      const poisonedCacheRow = {
        key_sources: [{ name: "Redfin", url: "https://redfin.com", facts_provided: "Price" }],
        nearby_amenities: [],
        market_overview: "Hot market",
      };

      const healthyCacheRow = {
        key_sources: [{ name: "Redfin", url: "https://redfin.com", facts_provided: "Price" }],
        nearby_amenities: [
          { name: "Trader Joe's", type: "Grocery", distance: "0.5 mi" },
          { name: "Zilker Park", type: "Park", distance: "5 min drive" },
        ],
        market_overview: "Desirable neighborhood",
      };

      // In getCachedEnrichment, empty amenities must return null (bypass cache)
      function mockGetCachedEnrichment(
        data: typeof poisonedCacheRow | typeof healthyCacheRow | null,
      ) {
        if (!data) return null;
        if (!data.key_sources || data.key_sources.length === 0) return null; // legacy check
        if (!isValidAmenityList(data.nearby_amenities)) return null; // anti-poison check
        return data;
      }

      expect(mockGetCachedEnrichment(poisonedCacheRow)).toBeNull(); // Bypass forced!
      expect(mockGetCachedEnrichment(healthyCacheRow)).toEqual(healthyCacheRow); // Healthy hit!
    });

    it("simulates cache set guard preventing empty amenity results from being written", () => {
      let writtenCacheKey: string | null = null;
      let writtenData: Record<string, unknown> | null = null;

      function mockSetCachedEnrichment(
        address: string,
        parsed: Record<string, unknown>,
        propertyType?: string,
      ) {
        if (!isValidAmenityList(parsed.nearby_amenities)) {
          return; // Skip write to prevent poisoning
        }
        writtenCacheKey = enrichmentCacheKey(address, propertyType);
        writtenData = parsed;
      }

      // Empty amenities result: should NOT write
      mockSetCachedEnrichment("100 Main St, Austin, TX", { nearby_amenities: [] }, "sfr");
      expect(writtenCacheKey).toBeNull();
      expect(writtenData).toBeNull();

      // Rich amenities result: should write
      const richData = {
        nearby_amenities: [{ name: "Central Market", type: "Grocery", distance: "1.2 mi" }],
      };
      mockSetCachedEnrichment("100 Main St, Austin, TX", richData, "sfr");
      expect(writtenCacheKey).toBe("austin, tx|sfr");
      expect(writtenData).toEqual(richData);
    });
  });

  describe("Task 4: Structured address handling and location anchoring", () => {
    it("includes city, state, zip in EXTRACTION_SCHEMA", () => {
      expect(EXTRACTION_SCHEMA.properties.city).toBeDefined();
      expect(EXTRACTION_SCHEMA.properties.city.type).toEqual(["string", "null"]);

      expect(EXTRACTION_SCHEMA.properties.state).toBeDefined();
      expect(EXTRACTION_SCHEMA.properties.state.type).toEqual(["string", "null"]);

      expect(EXTRACTION_SCHEMA.properties.zip).toBeDefined();
      expect(EXTRACTION_SCHEMA.properties.zip.type).toEqual(["string", "null"]);
    });

    it("buildAnchoredAddress anchors unformatted street addresses with city, state, and zip", () => {
      const anchored = buildAnchoredAddress("123 Pine St", "123 Pine St", "Austin", "TX", "78704");
      expect(anchored).toBe("123 Pine St, Austin TX 78704");
    });

    it("buildAnchoredAddress prevents duplicating city, state, or zip if already present", () => {
      const anchored = buildAnchoredAddress(
        "123 Pine St, Austin, TX 78704",
        "123 Pine St, Austin, TX 78704",
        "Austin",
        "TX",
        "78704",
      );
      expect(anchored).toBe("123 Pine St, Austin, TX 78704");
    });

    it("buildAnchoredAddress appends only missing components", () => {
      const anchored = buildAnchoredAddress(
        "456 Elm St, Miami",
        "456 Elm St, Miami",
        "Miami",
        "FL",
        "33139",
      );
      expect(anchored).toBe("456 Elm St, Miami, FL 33139");
    });

    it("buildAnchoredAddress falls back to safe address when extracted address is null", () => {
      const anchored = buildAnchoredAddress(null, "789 Oak Ave", "Seattle", "WA", null);
      expect(anchored).toBe("789 Oak Ave, Seattle WA");
    });

    it("buildAnchoredAddress returns base address if no city/state/zip provided", () => {
      const anchored = buildAnchoredAddress("100 Broadway", "100 Broadway", null, null, null);
      expect(anchored).toBe("100 Broadway");
    });

    it("produces correct neighborhood-level cache keys when location-anchored", () => {
      const anchored = buildAnchoredAddress("123 Pine St", "123 Pine St", "Austin", "TX", "78704");
      const cacheKey = enrichmentCacheKey(anchored, "sfr");
      expect(cacheKey).toBe("austin tx 78704|sfr");
    });

    it("prevents state abbreviation stripping when street names contain state letters (IN, UT, PA, OR, MA, LA, DE)", () => {
      expect(buildAnchoredAddress("10 Main St", "10 Main St", "Carmel", "IN", "46032")).toBe(
        "10 Main St, Carmel IN 46032",
      );
      expect(
        buildAnchoredAddress("10 South Temple", "10 South Temple", "Salt Lake City", "UT", "84101"),
      ).toBe("10 South Temple, Salt Lake City UT 84101");
      expect(buildAnchoredAddress("50 Park Ave", "50 Park Ave", "Wayne", "PA", "19087")).toBe(
        "50 Park Ave, Wayne PA 19087",
      );
      expect(buildAnchoredAddress("25 Oxford Rd", "25 Oxford Rd", "Portland", "OR", "97201")).toBe(
        "25 Oxford Rd, Portland OR 97201",
      );
      expect(buildAnchoredAddress("75 Market St", "75 Market St", "Boston", "MA", "02108")).toBe(
        "75 Market St, Boston MA 02108",
      );
      expect(buildAnchoredAddress("130 Lake Dr", "130 Lake Dr", "Metairie", "LA", "70001")).toBe(
        "130 Lake Dr, Metairie LA 70001",
      );
      expect(buildAnchoredAddress("12 Garden St", "12 Garden St", "Newark", "DE", "19711")).toBe(
        "12 Garden St, Newark DE 19711",
      );
    });

    it("retains fallback address when extractedAddress is whitespace or non-physical sentinel", () => {
      expect(buildAnchoredAddress("   ", "123 Main St", "Austin", "TX", "78701")).toBe(
        "123 Main St, Austin TX 78701",
      );
      expect(buildAnchoredAddress("Unknown", "123 Main St", "Austin", "TX", "78701")).toBe(
        "123 Main St, Austin TX 78701",
      );
      expect(buildAnchoredAddress("N/A", "123 Main St", "Austin", "TX", "78701")).toBe(
        "123 Main St, Austin TX 78701",
      );
      expect(
        buildAnchoredAddress(
          "https://www.zillow.com/homedetails/123-Main-St-Austin-TX-78701/12345_zpid/",
          "123 Main St",
          "Austin",
          "TX",
          "78701",
        ),
      ).toBe("123 Main St, Austin TX 78701");
    });

    it("prevents state full name vs abbreviation stuttering duplicates", () => {
      expect(
        buildAnchoredAddress(
          "123 Main St, Austin, Texas 78701",
          "123 Main St, Austin, Texas 78701",
          "Austin",
          "TX",
          "78701",
        ),
      ).toBe("123 Main St, Austin, Texas 78701");

      expect(
        buildAnchoredAddress(
          "123 Main St, Austin, TX 78701",
          "123 Main St, Austin, TX 78701",
          "Austin",
          "Texas",
          "78701",
        ),
      ).toBe("123 Main St, Austin, TX 78701");

      expect(
        buildAnchoredAddress(
          "456 Ocean Ave, Santa Monica, CA 90401",
          "456 Ocean Ave, Santa Monica, CA 90401",
          "Santa Monica",
          "California",
          "90401",
        ),
      ).toBe("456 Ocean Ave, Santa Monica, CA 90401");
    });
  });

  describe("Task 5: Profile Aliases", () => {
    it("resolves multi-family, vacation rental, and residential aliases correctly", () => {
      expect(getProfile("multi_family").label).toBe("Multi-Family");
      expect(getProfile("multi-family").label).toBe("Multi-Family");
      expect(getProfile("vacation_rental").label).toBe("Short-Term Rental");
      expect(getProfile("short-term rental").label).toBe("Short-Term Rental");
      expect(getProfile("residential").label).toBe("Single Family Residential");

      // Verify canonical keys remain intact
      expect(getProfile("mf").label).toBe("Multi-Family");
      expect(getProfile("str").label).toBe("Short-Term Rental");
      expect(getProfile("sfr").label).toBe("Single Family Residential");
    });
  });

  describe("Task 6: Google Places Deterministic Amenities", () => {
    it("formats short distances and computes haversine miles", () => {
      const miles = haversineMiles(30.2672, -97.7431, 30.2711, -97.7437);
      expect(miles).toBeGreaterThan(0.2);
      expect(miles).toBeLessThan(0.4);
      expect(formatDistanceMiles(0.02)).toBe("<0.1 mi");
      expect(formatDistanceMiles(1.24)).toBe("1.2 mi");
    });

    it("returns [] gracefully when API key is missing or HTTP fails", async () => {
      expect(await fetchVerifiedAmenities(undefined, "123 Main St, Austin, TX")).toEqual([]);
      const failingFetch: FetchLike = async () => new Response("Denied", { status: 403 });
      expect(
        await fetchVerifiedAmenities("bad-key", "123 Main St, Austin, TX", failingFetch),
      ).toEqual([]);
    });

    it("geocodes and expands radius from 5km to 16km for rural properties", async () => {
      const radii: number[] = [];
      const mockFetch: FetchLike = async (input, init) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("geocode/json")) {
          return new Response(
            JSON.stringify({
              status: "OK",
              results: [{ geometry: { location: { lat: 35.0, lng: -90.0 } } }],
            }),
            { status: 200 },
          );
        }
        const body = JSON.parse((init?.body as string) || "{}");
        const radius = body.locationRestriction?.circle?.radius;
        radii.push(radius);
        if (radius === 5000) {
          return new Response(JSON.stringify({ places: [] }), { status: 200 });
        }
        const firstType = body.includedTypes?.[0];
        return new Response(
          JSON.stringify({
            places: [
              {
                displayName: { text: `Local ${firstType}` },
                primaryType: firstType,
                location: { latitude: 35.05, longitude: -90.02 },
              },
            ],
          }),
          { status: 200 },
        );
      };

      const res = await fetchVerifiedAmenities("test-key", "100 County Rd, Rural, AR", mockFetch);
      expect(radii).toContain(5000);
      expect(radii).toContain(16000);
      expect(res.length).toBe(4);
      expect(res[0].distance.endsWith(" mi")).toBe(true);
    });
  });

  describe("Task 7: Focused Perplexity Prompts & Parallel Pipeline Anchoring", () => {
    it("omits nearby_amenities from enrichment schema when includeAmenities is false", () => {
      const focusedSchema = buildEnrichmentSchema(true, false);
      const props = focusedSchema.properties as Record<string, unknown>;
      expect(props.schools).toBeDefined();
      expect(props.transit_options).toBeDefined();
      expect(props.walkability_score).toBeDefined();
      expect(props.nearby_amenities).toBeUndefined();
    });

    it("strips nearby_amenities directives from prompts when skipAmenities is true", () => {
      for (const key of ["sfr", "commercial", "str", "land", "lux"]) {
        const profile = getProfile(key);
        const focused = buildFocusedEnrichmentPrompts(profile, "123 Main St, Austin, TX", true);
        expect(focused.systemPrompt).toContain("FOCUSED SCOPE:");
        expect(focused.systemPrompt).not.toContain("- For nearby_amenities:");
        expect(focused.userPrompt).not.toContain("- nearby_amenities:");
      }
    });

    it("detects geographic anchors for t=0 parallel extraction + enrichment", () => {
      expect(hasGeographicAnchor("123 Main St, Austin, TX")).toBe(true);
      expect(hasGeographicAnchor("123 Main St Austin TX 78701")).toBe(true);
      expect(hasGeographicAnchor("456 Oak Ave Austin TX")).toBe(true);

      expect(hasGeographicAnchor("123 Main St")).toBe(false);
      expect(hasGeographicAnchor("unknown")).toBe(false);
      expect(hasGeographicAnchor("https://www.zillow.com/homedetails/123")).toBe(false);
    });
  });
});
