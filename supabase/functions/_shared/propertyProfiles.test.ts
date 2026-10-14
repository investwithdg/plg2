import { assertEquals } from "./testAssert.ts";
import { getProfile, PROFILES } from "./propertyProfiles.ts";

// ─── Every registered type has a valid profile ─────────────────────────────

Deno.test("PROFILES: every key has all required fields", () => {
  const requiredKeys = [
    "sfr", "mf", "str", "mtr", "ltr", "fsbo",
    "estate", "lux", "commercial", "lease", "row",
  ];
  for (const key of requiredKeys) {
    const profile = PROFILES[key];
    assertEquals(typeof profile, "object", `Missing profile for '${key}'`);
    assertEquals(typeof profile.label, "string", `${key}: missing label`);

    // extraction
    assertEquals(typeof profile.extraction.supplementalInstruction, "string", `${key}: missing extraction.supplementalInstruction`);

    // enrichment
    assertEquals(typeof profile.enrichment.systemPrompt, "string", `${key}: missing enrichment.systemPrompt`);
    assertEquals(typeof profile.enrichment.userPrompt, "function", `${key}: enrichment.userPrompt must be a function`);
    assertEquals(typeof profile.enrichment.includeSchools, "boolean", `${key}: missing enrichment.includeSchools`);

    // copy
    assertEquals(typeof profile.copy.voiceDirective, "string", `${key}: missing copy.voiceDirective`);
    assertEquals(typeof profile.copy.mls, "string", `${key}: missing copy.mls`);
    assertEquals(typeof profile.copy.social, "string", `${key}: missing copy.social`);
    assertEquals(typeof profile.copy.email, "string", `${key}: missing copy.email`);
  }
});

// ─── getProfile fallback ───────────────────────────────────────────────────

Deno.test("getProfile: unknown type falls back to sfr", () => {
  const fallback = getProfile("totally_made_up");
  assertEquals(fallback.label, "Single Family Residential");
});

Deno.test("getProfile: null/undefined falls back to sfr", () => {
  assertEquals(getProfile(null).label, "Single Family Residential");
  assertEquals(getProfile(undefined).label, "Single Family Residential");
  assertEquals(getProfile("").label, "Single Family Residential");
});

Deno.test("getProfile: 'luxury' alias resolves to lux profile", () => {
  assertEquals(getProfile("luxury").label, "Luxury Property");
  assertEquals(getProfile("lux").label, "Luxury Property");
});

// ─── Commercial skips schools ──────────────────────────────────────────────

Deno.test("commercial profile has includeSchools === false", () => {
  assertEquals(PROFILES.commercial.enrichment.includeSchools, false);
});

Deno.test("lease profile has includeSchools === false", () => {
  assertEquals(PROFILES.lease.enrichment.includeSchools, false);
});

Deno.test("str profile has includeSchools === false", () => {
  assertEquals(PROFILES.str.enrichment.includeSchools, false);
});

// ─── Residential types include schools ─────────────────────────────────────

Deno.test("sfr/mf/ltr/fsbo/estate/lux/row/mtr include schools", () => {
  const schoolTypes = ["sfr", "mf", "ltr", "fsbo", "estate", "lux", "row", "mtr"];
  for (const key of schoolTypes) {
    assertEquals(PROFILES[key].enrichment.includeSchools, true, `${key} should includeSchools`);
  }
});

// ─── enrichment.userPrompt produces a string containing the address ────────

Deno.test("enrichment.userPrompt includes the address for every profile", () => {
  const testAddr = "123 Test St, Austin, TX";
  for (const [key, profile] of Object.entries(PROFILES)) {
    if (key === "luxury") continue; // alias, skip
    const result = profile.enrichment.userPrompt(testAddr);
    assertEquals(typeof result, "string", `${key}: userPrompt must return string`);
    assertEquals(result.includes(testAddr), true, `${key}: userPrompt must include the address`);
  }
});
