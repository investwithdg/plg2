// Deterministic nearby-amenity lookup using Google Geocoding + Places API (New).
// Replaces fragile web-search guessing for nearby groceries, parks, dining, and fitness
// across urban, suburban, and rural US addresses. Fails gracefully (returns []) so
// listing generation never breaks if Google Maps API is unconfigured or rate-limited.

export interface VerifiedAmenity {
  name: string;
  type: string;
  distance: string;
}

interface CategorySpec {
  includedTypes: string[];
  defaultLabel: string;
  maxPick: number;
}

const AMENITY_CATEGORIES: CategorySpec[] = [
  { includedTypes: ["supermarket", "grocery_store"], defaultLabel: "Grocery", maxPick: 2 },
  { includedTypes: ["park", "hiking_area", "national_park"], defaultLabel: "Park", maxPick: 2 },
  { includedTypes: ["restaurant", "cafe"], defaultLabel: "Dining", maxPick: 2 },
  { includedTypes: ["gym", "fitness_center"], defaultLabel: "Fitness", maxPick: 2 },
];

const URBAN_RADIUS_METERS = 5_000; // ~3.1 miles
const RURAL_RADIUS_METERS = 16_000; // ~10 miles
const MIN_AMENITIES_BEFORE_EXPANSION = 4;

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceMiles(miles: number): string {
  if (!Number.isFinite(miles) || miles < 0) return "Nearby";
  if (miles < 0.05) return "<0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

function mapPrimaryTypeLabel(primaryType: string | undefined, fallback: string): string {
  if (!primaryType) return fallback;
  switch (primaryType) {
    case "supermarket":
    case "grocery_store":
      return "Grocery";
    case "park":
    case "national_park":
      return "Park";
    case "hiking_area":
      return "Trail / Park";
    case "cafe":
    case "coffee_shop":
      return "Cafe";
    case "restaurant":
      return "Restaurant";
    case "gym":
    case "fitness_center":
      return "Fitness";
    default:
      return fallback;
  }
}

export type FetchLike = typeof fetch;

export async function geocodeAddress(
  apiKey: string,
  address: string,
  fetchFn: FetchLike = fetch,
): Promise<{ lat: number; lng: number } | null> {
  if (!apiKey || !address.trim()) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address.trim(),
    )}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchFn(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (typeof loc?.lat === "number" && typeof loc?.lng === "number") {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch {
    return null;
  }
}

interface PlacesNewPlace {
  displayName?: { text?: string };
  primaryType?: string;
  location?: { latitude?: number; longitude?: number };
}

async function searchCategoryNearby(
  apiKey: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  spec: CategorySpec,
  fetchFn: FetchLike,
): Promise<Array<VerifiedAmenity & { miles: number }>> {
  try {
    const res = await fetchFn("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.primaryType,places.location",
      },
      body: JSON.stringify({
        includedTypes: spec.includedTypes,
        maxResultCount: 4,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const places = (data?.places ?? []) as PlacesNewPlace[];

    const results: Array<VerifiedAmenity & { miles: number }> = [];
    for (const p of places) {
      const name = p.displayName?.text?.trim();
      if (!name) continue;
      const pLat = p.location?.latitude;
      const pLng = p.location?.longitude;
      const miles =
        typeof pLat === "number" && typeof pLng === "number"
          ? haversineMiles(lat, lng, pLat, pLng)
          : Infinity;
      results.push({
        name,
        type: mapPrimaryTypeLabel(p.primaryType, spec.defaultLabel),
        distance: Number.isFinite(miles) ? formatDistanceMiles(miles) : "Nearby",
        miles,
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function queryAllCategories(
  apiKey: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  fetchFn: FetchLike,
): Promise<VerifiedAmenity[]> {
  const categoryBatches = await Promise.all(
    AMENITY_CATEGORIES.map((spec) =>
      searchCategoryNearby(apiKey, lat, lng, radiusMeters, spec, fetchFn),
    ),
  );

  const seen = new Set<string>();
  const picked: Array<VerifiedAmenity & { miles: number }> = [];

  categoryBatches.forEach((items, idx) => {
    const cap = AMENITY_CATEGORIES[idx].maxPick;
    let count = 0;
    for (const item of items) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(item);
      count += 1;
      if (count >= cap) break;
    }
  });

  picked.sort((a, b) => a.miles - b.miles);
  return picked.slice(0, 8).map(({ name, type, distance }) => ({ name, type, distance }));
}

/**
 * Fetches verified nearby amenities for an address via Google Geocoding + Places API (New).
 * Starts with a 5 km (~3.1 mi) radius and automatically expands to 16 km (~10 mi) if fewer
 * than 4 unique amenities are found (for suburban/rural markets).
 */
export async function fetchVerifiedAmenities(
  apiKey: string | undefined,
  address: string,
  fetchFn: FetchLike = fetch,
): Promise<VerifiedAmenity[]> {
  if (!apiKey || !address.trim()) return [];
  const coords = await geocodeAddress(apiKey, address, fetchFn);
  if (!coords) return [];

  const initial = await queryAllCategories(
    apiKey,
    coords.lat,
    coords.lng,
    URBAN_RADIUS_METERS,
    fetchFn,
  );
  if (initial.length >= MIN_AMENITIES_BEFORE_EXPANSION) {
    return initial;
  }

  const expanded = await queryAllCategories(
    apiKey,
    coords.lat,
    coords.lng,
    RURAL_RADIUS_METERS,
    fetchFn,
  );
  return expanded.length > initial.length ? expanded : initial;
}
