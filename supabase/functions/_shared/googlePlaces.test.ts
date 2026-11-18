import { assertEquals } from "./testAssert.ts";
import {
  fetchVerifiedAmenities,
  formatDistanceMiles,
  haversineMiles,
  type FetchLike,
} from "./googlePlaces.ts";

Deno.test("haversineMiles and formatDistanceMiles compute accurate short distances", () => {
  const miles = haversineMiles(30.2672, -97.7431, 30.2711, -97.7437);
  assertEquals(miles > 0.2 && miles < 0.4, true);
  assertEquals(formatDistanceMiles(0.02), "<0.1 mi");
  assertEquals(formatDistanceMiles(1.24), "1.2 mi");
});

Deno.test("fetchVerifiedAmenities returns [] when apiKey is missing", async () => {
  const res = await fetchVerifiedAmenities(undefined, "123 Main St, Austin, TX");
  assertEquals(res, []);
});

Deno.test("fetchVerifiedAmenities geocodes and merges balanced categories sorted by distance", async () => {
  const fakeFetch: FetchLike = async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("geocode/json")) {
      return new Response(
        JSON.stringify({
          status: "OK",
          results: [{ geometry: { location: { lat: 30.2672, lng: -97.7431 } } }],
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        places: [
          {
            displayName: { text: "Whole Foods Market" },
            primaryType: "supermarket",
            location: { latitude: 30.27, lng: -97.752, longitude: -97.752 },
          },
          {
            displayName: { text: "Zilker Park" },
            primaryType: "park",
            location: { latitude: 30.267, longitude: -97.773 },
          },
        ],
      }),
      { status: 200 },
    );
  };

  const amenities = await fetchVerifiedAmenities("fake-key", "123 Main St, Austin, TX", fakeFetch);
  assertEquals(amenities.length >= 2, true);
  assertEquals(amenities[0].name, "Whole Foods Market");
  assertEquals(amenities[0].type, "Grocery");
  assertEquals(amenities[0].distance.endsWith(" mi"), true);
});

Deno.test("fetchVerifiedAmenities expands to rural radius when initial urban radius has < 4 results", async () => {
  const radiiSeen: number[] = [];
  const fakeFetch: FetchLike = async (input, init) => {
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
    radiiSeen.push(radius);

    if (radius === 5000) {
      return new Response(JSON.stringify({ places: [] }), { status: 200 });
    }
    const firstType = body.includedTypes?.[0];
    return new Response(
      JSON.stringify({
        places: [
          {
            displayName: { text: `Rural ${firstType}` },
            primaryType: firstType,
            location: { latitude: 35.06, longitude: -90.02 },
          },
        ],
      }),
      { status: 200 },
    );
  };

  const amenities = await fetchVerifiedAmenities("fake-key", "100 County Rd, Rural, AR", fakeFetch);
  assertEquals(radiiSeen.includes(5000), true);
  assertEquals(radiiSeen.includes(16000), true);
  assertEquals(amenities.length, 4);
});

Deno.test("fetchVerifiedAmenities fails gracefully on HTTP errors", async () => {
  const failingFetch: FetchLike = async () => new Response("Denied", { status: 403 });
  const res = await fetchVerifiedAmenities("bad-key", "123 Main St, Austin, TX", failingFetch);
  assertEquals(res, []);
});
