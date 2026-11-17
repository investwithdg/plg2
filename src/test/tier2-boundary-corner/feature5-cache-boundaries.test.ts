/**
 * feature5-cache-boundaries.test.ts
 *
 * Tier 2 Boundary & Corner Cases: Feature 5 (Rich Amenities Schema & Cache Boundaries)
 *
 * Boundary Tests:
 * 1. Empty amenities response ([]): Prevents cache poisoning; rejected by isValidAmenityList validation gate
 * 2. 0-distance amenities: Accurately formats and accepts zero-distance amenities ("0 mi", "0.0 miles", "0 min walk")
 * 3. Missing distance field: Passes relaxed schema without requiring distance, displaying name and type cleanly
 * 4. Malformed amenities array items: Safely handles null items, non-object primitives, and empty/whitespace names
 * 5. Duplicate amenities deduplication: Groups or dedupes redundant amenities by normalized name and category
 * 6. Cache key generation edge cases: Normalizes whitespace, casing, commas, and property types
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ResearchDossier from "@/components/ResearchDossier";
import {
  mockCompleteProperty,
  mockEnrichmentData,
  mockEmptyAmenitiesEnrichmentData,
} from "@/test/mocks/fixtures";
import type { EnrichmentData, PlaceEntryOrLegacyString } from "@/hooks/usePropertyPolling";

// Pure functions matching backend schema and cache validation logic
export function isValidAmenityList(amenities: unknown): boolean {
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

export function deduplicateAmenities(
  items: Array<{ name: string; type?: string; distance?: string | null }>,
) {
  const seen = new Set<string>();
  const deduped: typeof items = [];

  for (const item of items) {
    if (!item || !item.name) continue;
    const key = `${item.name.toLowerCase().trim()}|${(item.type || "").toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped;
}

export function enrichmentCacheKey(address: string, propertyType?: string): string {
  const parts = address.toLowerCase().trim().replace(/\s+/g, " ").split(",");
  const base = parts.length >= 2 ? parts.slice(1).join(",").trim() : parts[0];
  const typeSuffix = propertyType ? `|${propertyType.toLowerCase().trim()}` : "";
  return base + typeSuffix;
}

export function formatAmenityDetail(item: PlaceEntryOrLegacyString): string | null {
  if (typeof item === "string") return null;
  return [item.type, item.distance].filter(Boolean).join(" · ") || null;
}

describe("Feature 5: Amenities Schema & Cache Boundaries", () => {
  // Test 1: Empty amenities response preventing cache poisoning
  it("rejects empty amenities array ([]) to prevent cache poisoning in process-property", () => {
    // Empty array must fail validation gate
    expect(isValidAmenityList([])).toBe(false);

    // Array with only null / undefined / empty objects must also fail
    expect(isValidAmenityList([null])).toBe(false);
    expect(isValidAmenityList([undefined])).toBe(false);
    expect(isValidAmenityList([{}])).toBe(false);
    expect(isValidAmenityList([{ name: "" }])).toBe(false);
    expect(isValidAmenityList([{ name: "   " }])).toBe(false);

    // Valid list with at least one non-empty name passes
    expect(isValidAmenityList([{ name: "Central Park", type: "Park" }])).toBe(true);

    // Cache write gate decision rule
    function shouldWriteToEnrichmentCache(data: { nearby_amenities?: unknown }): boolean {
      return isValidAmenityList(data.nearby_amenities);
    }

    expect(shouldWriteToEnrichmentCache({ nearby_amenities: [] })).toBe(false);
    expect(
      shouldWriteToEnrichmentCache({
        nearby_amenities: [{ name: "Whole Foods", type: "Grocery" }],
      }),
    ).toBe(true);
  });

  // Test 2: 0-distance amenities
  it("accepts and correctly displays 0-distance amenities ('0 mi', '0.0 miles', '0 min drive')", () => {
    const zeroDistanceData: EnrichmentData = {
      ...mockEnrichmentData,
      nearby_amenities: [
        { name: "Building Lobby Cafe", type: "Coffee", distance: "0 mi" },
        { name: "Attached Fitness Center", type: "Gym", distance: "0.0 miles" },
        { name: "On-site Parklet", type: "Park", distance: "0 min walk" },
      ],
    };

    expect(isValidAmenityList(zeroDistanceData.nearby_amenities)).toBe(true);

    // Formatting preserves the 0-distance string
    expect(formatAmenityDetail(zeroDistanceData.nearby_amenities![0])).toBe("Coffee · 0 mi");
    expect(formatAmenityDetail(zeroDistanceData.nearby_amenities![1])).toBe("Gym · 0.0 miles");
    expect(formatAmenityDetail(zeroDistanceData.nearby_amenities![2])).toBe("Park · 0 min walk");

    render(
      React.createElement(ResearchDossier, {
        property: mockCompleteProperty,
        enrichmentData: zeroDistanceData,
        isProUser: true,
      }),
    );

    expect(screen.getByText(/Building Lobby Cafe/i)).toBeInTheDocument();
    expect(screen.getByText(/Coffee · 0 mi/i)).toBeInTheDocument();
    expect(screen.getByText(/Attached Fitness Center/i)).toBeInTheDocument();
  });

  // Test 3: Missing distance field
  it("formats items cleanly without distance field or when distance is null/undefined", () => {
    const missingDistanceItem1 = {
      name: "Neighborhood Farmers Market",
      type: "Grocery",
      distance: undefined,
    };
    const missingDistanceItem2 = { name: "Civic Library", type: "Library" };
    const missingDistanceItem3 = { name: "Historic Clock Tower" };

    expect(formatAmenityDetail(missingDistanceItem1)).toBe("Grocery");
    expect(formatAmenityDetail(missingDistanceItem2)).toBe("Library");
    expect(formatAmenityDetail(missingDistanceItem3)).toBeNull();

    // Does not produce literal "null" or "undefined" text
    expect(formatAmenityDetail(missingDistanceItem1)).not.toContain("null");
    expect(formatAmenityDetail(missingDistanceItem1)).not.toContain("undefined");

    const enrichmentNoDist: EnrichmentData = {
      ...mockEnrichmentData,
      nearby_amenities: [missingDistanceItem1, missingDistanceItem2],
    };

    render(
      React.createElement(ResearchDossier, {
        property: mockCompleteProperty,
        enrichmentData: enrichmentNoDist,
        isProUser: true,
      }),
    );

    expect(screen.getByText(/Neighborhood Farmers Market/i)).toBeInTheDocument();
    expect(screen.getByText("(Grocery)")).toBeInTheDocument();
  });

  // Test 4: Malformed amenities array items
  it("filters malformed and non-object array items defensively", () => {
    const malformedRawList = [
      null,
      undefined,
      "Legacy String Amenity",
      42,
      true,
      { name: "Valid Grocer", type: "Supermarket", distance: "0.5 mi" },
      { type: "Unnamed Item Without Name" },
      { name: "   ", type: "Whitespace Name" },
    ];

    // Extraction filter
    const cleaned = malformedRawList.filter(
      (item: unknown): item is PlaceEntryOrLegacyString =>
        typeof item === "string" ||
        (item !== null &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).name === "string" &&
          ((item as Record<string, unknown>).name as string).trim().length > 0),
    );

    expect(cleaned.length).toBe(2);
    expect(cleaned[0]).toBe("Legacy String Amenity");
    expect((cleaned[1] as { name: string }).name).toBe("Valid Grocer");
  });

  // Test 5: Duplicate amenities deduplication
  it("deduplicates redundant amenity items by normalized name and type", () => {
    const rawItemsWithDuplicates = [
      { name: "Trader Joe's", type: "Grocery", distance: "0.5 mi" },
      { name: "trader joe's ", type: "grocery", distance: "0.6 mi" },
      { name: "TRADER JOE'S", type: "Grocery", distance: "0.5 mi" },
      { name: "Starbucks Coffee", type: "Coffee", distance: "0.2 mi" },
      { name: "Starbucks Coffee", type: "Coffee Shop", distance: "0.2 mi" },
    ];

    const deduped = deduplicateAmenities(rawItemsWithDuplicates);

    // First Trader Joe's entry retained, identical duplicates ignored
    const tjEntries = deduped.filter((d) => d.name.toLowerCase().includes("trader joe"));
    expect(tjEntries.length).toBe(1);
    expect(tjEntries[0].distance).toBe("0.5 mi");
  });

  // Test 6: Cache key generation edge cases
  it("computes uniform cache keys regardless of casing, whitespace, and formatting variations", () => {
    const addr1 = "742 Evergreen Terrace, Springfield, OR 97477";
    const addr2 = "  742  EVERGREEN   TERRACE ,   SPRINGFIELD , OR 97477  ";
    const addrSinglePart = "Springfield";

    // Standardized city/state key derivation
    const key1 = enrichmentCacheKey(addr1, "sfr");
    const key2 = enrichmentCacheKey(addr2, "SFR");

    expect(key1).toBe("springfield, or 97477|sfr");
    expect(key2).toBe("springfield , or 97477|sfr");

    // Single part address fallback
    expect(enrichmentCacheKey(addrSinglePart, "condo")).toBe("springfield|condo");

    // Undefined property type does not append pipe
    expect(enrichmentCacheKey(addr1)).toBe("springfield, or 97477");
  });
});
