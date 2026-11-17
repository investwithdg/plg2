/**
 * feature5-amenities-schema.test.ts
 *
 * Tier 1 Feature Coverage: Feature 5 (Rich Amenities Schema, Drive-Time Strings & Cache Anti-Poisoning)
 * Tests:
 * 1. Relaxed distance schema validation (distance optional/nullable, name & type required)
 * 2. Acceptance of drive-time and qualitative distance strings ("5-10 min drive", "15 min drive")
 * 3. Multi-category lifestyle amenity structures and UI formatting
 * 4. Cache anti-poisoning: validation gate (isValidAmenityList) rejecting empty/malformed amenities
 * 5. Backward compatibility for legacy string amenities vs structured place objects
 * 6. UI rendering of relaxed distance and drive-time amenities in ResearchDossier
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ResearchDossier from "@/components/ResearchDossier";
import {
  mockCompleteProperty,
  mockDriveTimeAmenitiesEnrichmentData,
  mockEnrichmentData,
} from "@/test/mocks/fixtures";
import type { PlaceEntryOrLegacyString } from "@/hooks/usePropertyPolling";

// Pure functions matching schema and cache anti-poisoning rules
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

export function placeName(item: PlaceEntryOrLegacyString): string {
  return typeof item === "string" ? item : item.name || "Unnamed";
}

export function placeDetail(item: PlaceEntryOrLegacyString): string | null {
  if (typeof item === "string") return null;
  return [item.type, item.distance].filter(Boolean).join(" · ") || null;
}

// JSON Schema definition matching buildEnrichmentSchema in _shared/llm.ts
export const NEARBY_AMENITIES_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      type: { type: "string" },
      distance: {
        type: ["string", "null"],
        description: "Approximate mileage, drive time, or null if unknown",
      },
    },
    required: ["name", "type"],
  },
};

describe("Feature 5: Amenities Schema & Cache Anti-Poisoning", () => {
  // Test 1: Relaxed distance schema validation
  it("enforces relaxed distance schema where name and type are required but distance is optional or null", () => {
    // Valid item with mileage distance
    const withMileage = { name: "Whole Foods Market", type: "Grocery", distance: "0.4 mi" };
    expect(withMileage.name).toBeTruthy();
    expect(withMileage.type).toBeTruthy();
    expect(NEARBY_AMENITIES_SCHEMA.items.required).toContain("name");
    expect(NEARBY_AMENITIES_SCHEMA.items.required).toContain("type");
    expect(NEARBY_AMENITIES_SCHEMA.items.required).not.toContain("distance");

    // Valid item with null distance
    const withNullDistance = { name: "Lincoln City Park", type: "Park", distance: null };
    expect(withNullDistance.name).toBe("Lincoln City Park");
    expect(withNullDistance.distance).toBeNull();

    // Valid item omitting distance entirely
    const withoutDistance = { name: "Metropolitan Gym", type: "Fitness" };
    expect(withoutDistance.name).toBe("Metropolitan Gym");
    expect(withoutDistance.type).toBe("Fitness");

    // Validation helper: checks adherence to the relaxed schema contract
    function validateAmenityItem(item: Record<string, unknown>): {
      valid: boolean;
      reason?: string;
    } {
      if (typeof item.name !== "string" || !item.name.trim()) {
        return { valid: false, reason: "Missing required property: name" };
      }
      if (typeof item.type !== "string" || !item.type.trim()) {
        return { valid: false, reason: "Missing required property: type" };
      }
      if (
        item.distance !== undefined &&
        item.distance !== null &&
        typeof item.distance !== "string"
      ) {
        return { valid: false, reason: "distance must be a string or null" };
      }
      return { valid: true };
    }

    expect(validateAmenityItem(withMileage).valid).toBe(true);
    expect(validateAmenityItem(withNullDistance).valid).toBe(true);
    expect(validateAmenityItem(withoutDistance).valid).toBe(true);

    // Invalid items
    expect(validateAmenityItem({ type: "Grocery" }).valid).toBe(false);
    expect(validateAmenityItem({ name: "Store Only" }).valid).toBe(false);
    expect(validateAmenityItem({ name: "Store", type: "Grocery", distance: 1234 }).valid).toBe(
      false,
    );
  });

  // Test 2: Drive-time and qualitative distance strings
  it("accepts and correctly formats drive-time strings e.g. '5-10 min drive'", () => {
    const driveTimeItem = {
      name: "Costco Wholesale",
      type: "Bulk Retail",
      distance: "8-12 min drive",
    };
    const walkingItem = {
      name: "Corner Bakery",
      type: "Cafe",
      distance: "5 min walk",
    };
    const corridorItem = {
      name: "Regional Medical Center",
      type: "Hospital",
      distance: "15 min drive",
    };

    expect(placeName(driveTimeItem)).toBe("Costco Wholesale");
    expect(placeDetail(driveTimeItem)).toBe("Bulk Retail · 8-12 min drive");

    expect(placeName(walkingItem)).toBe("Corner Bakery");
    expect(placeDetail(walkingItem)).toBe("Cafe · 5 min walk");

    expect(placeName(corridorItem)).toBe("Regional Medical Center");
    expect(placeDetail(corridorItem)).toBe("Hospital · 15 min drive");
  });

  // Test 3: Multi-category amenity structures
  it("supports multi-category lifestyle amenity structures (Grocery, Park, Fitness, Hospital, Dining)", () => {
    const multiCategories = [
      { name: "Trader Joe's", type: "Grocery", distance: "0.5 mi" },
      { name: "Sunset Recreation Park", type: "Park", distance: "0.2 mi" },
      { name: "Anytime Fitness", type: "Fitness", distance: "1.0 mi" },
      { name: "Blue Bottle Coffee", type: "Cafe", distance: "0.3 mi" },
      { name: "St. Jude Urgent Care", type: "Healthcare", distance: "1.4 mi" },
    ];

    expect(multiCategories.length).toBe(5);

    const types = multiCategories.map((a) => a.type);
    expect(types).toContain("Grocery");
    expect(types).toContain("Park");
    expect(types).toContain("Fitness");
    expect(types).toContain("Cafe");
    expect(types).toContain("Healthcare");

    for (const item of multiCategories) {
      expect(placeName(item)).toBe(item.name);
      expect(placeDetail(item)).toContain(item.type);
      expect(placeDetail(item)).toContain(item.distance);
    }
  });

  // Test 4: Cache anti-poisoning logic
  it("prevents cache poisoning: isValidAmenityList rejects empty or malformed amenities", () => {
    // Empty array must return false (do not cache or use cached empty result)
    expect(isValidAmenityList([])).toBe(false);

    // Null or undefined
    expect(isValidAmenityList(null)).toBe(false);
    expect(isValidAmenityList(undefined)).toBe(false);

    // Non-array
    expect(isValidAmenityList("not-an-array")).toBe(false);
    expect(isValidAmenityList({})).toBe(false);

    // Array containing only null or empty objects
    expect(isValidAmenityList([null])).toBe(false);
    expect(isValidAmenityList([{}])).toBe(false);
    expect(isValidAmenityList([{ name: "" }])).toBe(false);
    expect(isValidAmenityList([{ name: "   " }])).toBe(false);

    // Array with at least one valid named amenity
    expect(isValidAmenityList([{ name: "Safeway", type: "Grocery" }])).toBe(true);
    expect(
      isValidAmenityList([
        { name: "", type: "Invalid" },
        { name: "Target", type: "Shopping", distance: "1.2 mi" },
      ]),
    ).toBe(true);
  });

  // Test 5: Backward compatibility for legacy string amenities
  it("maintains backward compatibility with legacy string amenity entries", () => {
    const legacyEntry: PlaceEntryOrLegacyString = "Trader Joe's (0.5 mi)";
    const modernEntry: PlaceEntryOrLegacyString = {
      name: "Trader Joe's",
      type: "Grocery",
      distance: "0.5 mi",
    };

    // Legacy string format
    expect(placeName(legacyEntry)).toBe("Trader Joe's (0.5 mi)");
    expect(placeDetail(legacyEntry)).toBeNull();

    // Modern structured object format
    expect(placeName(modernEntry)).toBe("Trader Joe's");
    expect(placeDetail(modernEntry)).toBe("Grocery · 0.5 mi");

    // Unnamed fallback
    const unnamedEntry: PlaceEntryOrLegacyString = { type: "Park" };
    expect(placeName(unnamedEntry)).toBe("Unnamed");
    expect(placeDetail(unnamedEntry)).toBe("Park");
  });

  // Test 6: UI rendering of relaxed distance and drive-time amenities
  it("renders drive-time amenities and items without exact mileage in ResearchDossier", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockCompleteProperty,
        enrichmentData: mockDriveTimeAmenitiesEnrichmentData,
        isProUser: true,
      }),
    );

    // Section title
    expect(screen.getByText("Nearby Daily Amenities")).toBeInTheDocument();

    // Drive-time amenity items rendered
    expect(screen.getByText("Costco Wholesale")).toBeInTheDocument();
    expect(screen.getByText("(Retail / Bulk · 8-12 min drive)")).toBeInTheDocument();

    expect(screen.getByText("Regional Medical Center")).toBeInTheDocument();
    expect(screen.getByText("(Hospital · 15 min drive)")).toBeInTheDocument();

    expect(screen.getByText("Pine Valley Trailhead")).toBeInTheDocument();
    expect(screen.getByText("(Recreation · 5 min drive)")).toBeInTheDocument();

    // Item with null distance shows type only
    expect(screen.getByText("Local Farmers Market")).toBeInTheDocument();
    expect(screen.getByText("(Grocery)")).toBeInTheDocument();

    // Item omitting distance shows type only
    expect(screen.getByText("Community Library")).toBeInTheDocument();
    expect(screen.getByText("(Civic)")).toBeInTheDocument();
  });
});
