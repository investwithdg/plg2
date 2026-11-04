// Unit tests for the pure Vision+ helpers that process-property depends on: the aggregation
// folded into the copy-generation context, and the system-prompt addendum that accompanies it.
// (The vision prompt/schema/parser are covered from analyze-property-photos/handler.test.ts.)
import { assertEquals } from "./testAssert.ts";
import {
  aggregatePhotoAnalyses,
  computeVisionCost,
  PHOTO_FEATURES_PROMPT_ADDENDUM,
} from "./photoAnalysis.ts";

Deno.test("aggregatePhotoAnalyses: null when there is nothing to fold in", () => {
  assertEquals(aggregatePhotoAnalyses([]), null);
  assertEquals(aggregatePhotoAnalyses([null, undefined]), null);
  // Rows that exist but carry no usable content shouldn't produce an empty photo_features key.
  assertEquals(
    aggregatePhotoAnalyses([{ room_type: null, features: [], condition_notes: "" }]),
    null,
  );
});

Deno.test("aggregatePhotoAnalyses: merges rooms, features and notes across photos", () => {
  const result = aggregatePhotoAnalyses([
    {
      room_type: "kitchen",
      features: ["granite countertops", "stainless appliances"],
      condition_notes: "Recently updated.",
    },
    {
      room_type: "primary bedroom",
      features: ["hardwood floors"],
      condition_notes: "No visible wear.",
    },
  ]);
  assertEquals(result, {
    photos_analyzed: 2,
    rooms: ["kitchen", "primary bedroom"],
    features: ["granite countertops", "stainless appliances", "hardwood floors"],
    condition_notes: ["Recently updated.", "No visible wear."],
  });
});

Deno.test("aggregatePhotoAnalyses: dedupes case-insensitively, keeping first-seen casing", () => {
  const result = aggregatePhotoAnalyses([
    { room_type: "Kitchen", features: ["Granite Countertops"], condition_notes: "Clean." },
    { room_type: "kitchen", features: ["granite countertops", "tile backsplash"], condition_notes: "clean." },
  ]);
  assertEquals(result?.photos_analyzed, 2);
  assertEquals(result?.rooms, ["Kitchen"]);
  assertEquals(result?.features, ["Granite Countertops", "tile backsplash"]);
  assertEquals(result?.condition_notes, ["Clean."]);
});

Deno.test("aggregatePhotoAnalyses: tolerates malformed jsonb rows without throwing", () => {
  const result = aggregatePhotoAnalyses([
    "not an object" as unknown as Record<string, unknown>,
    null,
    { room_type: 42, features: "not an array", condition_notes: 7 } as unknown as Record<
      string,
      unknown
    >,
    { room_type: "garage", features: ["epoxy floor"], condition_notes: "" },
  ]);
  assertEquals(result, {
    photos_analyzed: 2,
    rooms: ["garage"],
    features: ["epoxy floor"],
    condition_notes: [],
  });
});

Deno.test("PHOTO_FEATURES_PROMPT_ADDENDUM: grants citation but re-asserts the FHA rules", () => {
  const text = PHOTO_FEATURES_PROMPT_ADDENDUM.toLowerCase();
  assertEquals(text.includes("photo_features"), true);
  assertEquals(text.includes("visually verified facts"), true);
  assertEquals(text.includes("fha compliance rules"), true);
  assertEquals(text.includes("do not invent facts"), true);
  assertEquals(text.includes("never extend a photo-derived detail into a claim about people"), true);
  assertEquals(text.includes("neighborhood character"), true);
});

Deno.test("computeVisionCost: gpt-4o-mini pricing matches process-property's table", () => {
  const usage = computeVisionCost(1_000_000, 1_000_000);
  assertEquals(usage.inputTokens, 1_000_000);
  assertEquals(usage.outputTokens, 1_000_000);
  assertEquals(Number(usage.costUsd.toFixed(6)), 0.75);
  assertEquals(computeVisionCost(0, 0).costUsd, 0);
});
