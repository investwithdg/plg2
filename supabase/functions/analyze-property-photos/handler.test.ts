// Smoke tests for the analyze-property-photos (Vision+) edge function. No real network or
// Supabase calls are ever made — handleRequest()/analyzePendingPhotos() take an injectable
// AnalyzePropertyPhotosDeps, so these cover the compliance-sensitive parts directly: the
// vision prompt/request construction, the Elite-only plan gate, the ownership check, the
// photo-analysis JSON parsing, and per-photo failure isolation.
import { assertEquals } from "../_shared/testAssert.ts";
import {
  analyzePendingPhotos,
  handleRequest,
  type AnalyzePropertyPhotosDeps,
  type PendingPhoto,
} from "./handler.ts";
import {
  buildVisionRequestBody,
  MAX_PHOTOS_PER_LISTING,
  parsePhotoAnalysis,
  SIGNED_URL_EXPIRY_SECONDS,
  VISION_MODEL,
  VISION_SYSTEM_PROMPT,
} from "../_shared/photoAnalysis.ts";

const PROPERTY_ID = "11111111-1111-4111-8111-111111111111";

const GOOD_RESPONSE = JSON.stringify({
  room_type: "kitchen",
  features: ["granite countertops", "updated stainless appliances"],
  condition_notes: "Cabinetry appears recently refinished.",
});

function fakeDeps(overrides: Partial<AnalyzePropertyPhotosDeps> = {}): AnalyzePropertyPhotosDeps {
  return {
    parseBody: (raw) => {
      const id = (raw as { propertyId?: unknown } | null)?.propertyId;
      if (typeof id !== "string" || id.length === 0) {
        return { ok: false, message: "Provide a valid 'propertyId'." };
      }
      return { ok: true, propertyId: id };
    },
    verifyCaller: async () => ({ ok: true, userId: "user-1" }),
    getPropertyOwner: async () => ({ userId: "user-1" }),
    getUserPlan: async () => "elite",
    listPendingPhotos: async () => [{ id: "photo-1", storagePath: "user-1/prop/a.jpg" }],
    markPhotoAnalyzing: async () => {},
    createSignedUrl: async (path) => `https://signed.example/${path}?token=abc`,
    callVisionModel: async () => ({ content: GOOD_RESPONSE, inputTokens: 900, outputTokens: 60 }),
    markPhotoComplete: async () => {},
    markPhotoError: async () => {},
    recordPhotoAnalysisCost: async () => {},
    triggerReprocess: async () => {},
    log: () => {},
    ...overrides,
  };
}

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/analyze-property-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const AUTHED = { Authorization: "Bearer test-jwt" };

// ---------------------------------------------------------------------------
// Vision prompt / request construction (compliance-critical)
// ---------------------------------------------------------------------------

Deno.test("buildVisionRequestBody: sends gpt-4o-mini with the image as an image_url part", () => {
  const body = buildVisionRequestBody("https://signed.example/photo.jpg") as any;
  assertEquals(body.model, VISION_MODEL);
  assertEquals(body.model, "gpt-4o-mini");
  assertEquals(body.messages[0].role, "system");
  assertEquals(body.messages[0].content, VISION_SYSTEM_PROMPT);
  assertEquals(body.messages[1].role, "user");
  assertEquals(Array.isArray(body.messages[1].content), true);
  assertEquals(body.messages[1].content[0].type, "text");
  assertEquals(body.messages[1].content[1], {
    type: "image_url",
    image_url: { url: "https://signed.example/photo.jpg" },
  });
});

Deno.test("buildVisionRequestBody: uses json_schema structured output with the 3 contract fields", () => {
  const body = buildVisionRequestBody("https://signed.example/photo.jpg") as any;
  assertEquals(body.response_format.type, "json_schema");
  assertEquals(body.response_format.json_schema.name, "photo_analysis");
  const schema = body.response_format.json_schema.schema;
  assertEquals(Object.keys(schema.properties), ["room_type", "features", "condition_notes"]);
  assertEquals(schema.required, ["room_type", "features", "condition_notes"]);
  assertEquals(schema.properties.room_type.type, ["string", "null"]);
  assertEquals(schema.properties.features.type, "array");
  assertEquals(schema.properties.condition_notes.type, "string");
  assertEquals(schema.additionalProperties, false);
});

Deno.test("VISION_SYSTEM_PROMPT: forbids commenting on or inferring anything about people", () => {
  const prompt = VISION_SYSTEM_PROMPT.toLowerCase();
  // People / occupants.
  assertEquals(prompt.includes("never describe, count, identify, or infer anything about people"), true);
  assertEquals(prompt.includes("if any person appears in the photo, ignore them completely"), true);
  // Who the space "looks like it's for".
  assertEquals(prompt.includes('who the space "looks like it\'s for"'), true);
  assertEquals(prompt.includes("great for families"), true);
  assertEquals(prompt.includes("bachelor pad"), true);
  // Protected classes, verbatim, plus the photo-specific signals for them.
  for (const term of [
    "race",
    "color",
    "religion",
    "sex",
    "handicap",
    "familial status",
    "national origin",
    "religious objects",
    "children's toys",
    "mobility equipment",
  ]) {
    assertEquals(prompt.includes(term), true, `vision prompt must mention: ${term}`);
  }
  // Neighborhood / demographic character and coded language.
  assertEquals(prompt.includes("never describe neighborhood character, demographics"), true);
  assertEquals(prompt.includes("no coded language"), true);
  // Terminology + no-invention rules carried over from FHA_SYSTEM_PROMPT.
  assertEquals(prompt.includes('use "primary bedroom"'), true);
  assertEquals(prompt.includes("master bedroom"), true);
  assertEquals(prompt.includes("do not speculate beyond what is visible"), true);
  // Prompt-injection defense for text baked into a photograph.
  assertEquals(prompt.includes("ignore previous instructions"), true);
});

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

Deno.test("parsePhotoAnalysis: parses a well-formed response", () => {
  const parsed = parsePhotoAnalysis(GOOD_RESPONSE);
  assertEquals(parsed.room_type, "kitchen");
  assertEquals(parsed.features, ["granite countertops", "updated stainless appliances"]);
  assertEquals(parsed.condition_notes, "Cabinetry appears recently refinished.");
});

Deno.test("parsePhotoAnalysis: normalizes room_type, features and notes", () => {
  const parsed = parsePhotoAnalysis(
    JSON.stringify({
      room_type: "   ",
      features: ["  Hardwood Floors  ", "hardwood floors", "", 42, null, "Crown Molding"],
      condition_notes: "   No visible wear.   ",
    }),
  );
  assertEquals(parsed.room_type, null); // blank -> null
  assertEquals(parsed.features, ["Hardwood Floors", "Crown Molding"]); // trimmed + deduped
  assertEquals(parsed.condition_notes, "No visible wear.");
});

Deno.test("parsePhotoAnalysis: throws on empty, unparseable, or unusable payloads", () => {
  const bad = [
    null,
    "",
    "   ",
    "not json",
    "[1,2,3]",
    JSON.stringify({ room_type: null, features: [], condition_notes: "" }),
  ];
  for (const input of bad) {
    let threw = false;
    try {
      parsePhotoAnalysis(input as string | null);
    } catch {
      threw = true;
    }
    assertEquals(threw, true, `expected parsePhotoAnalysis to throw for: ${String(input)}`);
  }
});

Deno.test("parsePhotoAnalysis: missing optional fields still yield a usable analysis", () => {
  const parsed = parsePhotoAnalysis(JSON.stringify({ room_type: "backyard" }));
  assertEquals(parsed.room_type, "backyard");
  assertEquals(parsed.features, []);
  assertEquals(parsed.condition_notes, "");
});

// ---------------------------------------------------------------------------
// Auth / ownership / plan gates
// ---------------------------------------------------------------------------

Deno.test("handleRequest: rejects a request with no Authorization header", async () => {
  const deps = fakeDeps({ verifyCaller: async () => ({ ok: false, reason: "no_token" }) });
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }), deps);
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "unauthorized");
  assertEquals(body.message, "Authentication required");
});

Deno.test("handleRequest: rejects an invalid session token", async () => {
  const deps = fakeDeps({ verifyCaller: async () => ({ ok: false, reason: "invalid_token" }) });
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }, AUTHED), deps);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest: rejects a body without a valid propertyId", async () => {
  const res = await handleRequest(req({}, AUTHED), fakeDeps());
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "invalid_input");
});

Deno.test("handleRequest: 404s for a property that does not exist", async () => {
  const deps = fakeDeps({ getPropertyOwner: async () => null });
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }, AUTHED), deps);
  assertEquals(res.status, 404);
  assertEquals((await res.json()).error, "property_not_found");
});

Deno.test("handleRequest: 403s when the caller does not own the property, and analyzes nothing", async () => {
  let listed = false;
  const deps = fakeDeps({
    getPropertyOwner: async () => ({ userId: "someone-else" }),
    listPendingPhotos: async () => {
      listed = true;
      return [];
    },
  });
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }, AUTHED), deps);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error, "forbidden_property");
  assertEquals(listed, false);
});

Deno.test("handleRequest: ownership is checked before the plan gate", async () => {
  let planChecked = false;
  const deps = fakeDeps({
    getPropertyOwner: async () => ({ userId: "someone-else" }),
    getUserPlan: async () => {
      planChecked = true;
      return "free";
    },
  });
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }, AUTHED), deps);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error, "forbidden_property");
  assertEquals(planChecked, false);
});

Deno.test("handleRequest: Elite-only gate — a free user is rejected and nothing is analyzed", async () => {
  let visionCalled = false;
  const deps = fakeDeps({
    getUserPlan: async () => "free",
    callVisionModel: async () => {
      visionCalled = true;
      throw new Error("should not be called");
    },
  });
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }, AUTHED), deps);
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.error, "forbidden_plan");
  assertEquals(body.message, "Photo analysis requires an Elite plan.");
  assertEquals(visionCalled, false);
});

Deno.test("handleRequest: Elite-only gate — a PRO user is rejected too (narrower than the MCP gate)", async () => {
  const deps = fakeDeps({ getUserPlan: async () => "pro" });
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }, AUTHED), deps);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error, "forbidden_plan");
});

Deno.test("handleRequest: an Elite owner gets { processed, failed }", async () => {
  const res = await handleRequest(req({ propertyId: PROPERTY_ID }, AUTHED), fakeDeps());
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { processed: 1, failed: 0 });
});

Deno.test("handleRequest: OPTIONS preflight is answered", async () => {
  const res = await handleRequest(
    new Request("https://example.com/analyze-property-photos", { method: "OPTIONS" }),
    fakeDeps(),
  );
  assertEquals(res.status, 200);
});

// ---------------------------------------------------------------------------
// Analysis loop
// ---------------------------------------------------------------------------

function photos(n: number): PendingPhoto[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `photo-${i + 1}`,
    storagePath: `user-1/${PROPERTY_ID}/${i + 1}.jpg`,
  }));
}

Deno.test("analyzePendingPhotos: never asks for more than 5 photos, with short-lived signed URLs", async () => {
  const limits: number[] = [];
  const expiries: number[] = [];
  const deps = fakeDeps({
    listPendingPhotos: async (_id, limit) => {
      limits.push(limit);
      return photos(3);
    },
    createSignedUrl: async (path, expiresIn) => {
      expiries.push(expiresIn);
      return `https://signed.example/${path}`;
    },
  });
  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(limits, [MAX_PHOTOS_PER_LISTING]);
  assertEquals(MAX_PHOTOS_PER_LISTING, 5);
  assertEquals(expiries, [300, 300, 300]);
  assertEquals(SIGNED_URL_EXPIRY_SECONDS, 300);
  assertEquals(result, { processed: 3, failed: 0 });
});

Deno.test("analyzePendingPhotos: one bad photo is isolated — the rest still complete", async () => {
  const completed: string[] = [];
  const errored: Array<{ id: string; message: string }> = [];
  const deps = fakeDeps({
    listPendingPhotos: async () => photos(3),
    callVisionModel: async (body) => {
      const url = (body as any).messages[1].content[1].image_url.url as string;
      if (url.includes("/2.jpg")) throw new Error("OpenAI vision failed [500]: boom");
      return { content: GOOD_RESPONSE, inputTokens: 100, outputTokens: 10 };
    },
    markPhotoComplete: async (id) => {
      completed.push(id);
    },
    markPhotoError: async (id, message) => {
      errored.push({ id, message });
    },
  });

  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(result, { processed: 2, failed: 1 });
  assertEquals(completed, ["photo-1", "photo-3"]);
  assertEquals(errored.length, 1);
  assertEquals(errored[0].id, "photo-2");
  assertEquals(errored[0].message.includes("OpenAI vision failed"), true);
});

Deno.test("analyzePendingPhotos: an unparseable vision response errors only that photo", async () => {
  const errored: string[] = [];
  const deps = fakeDeps({
    listPendingPhotos: async () => photos(2),
    callVisionModel: async (body) => {
      const url = (body as any).messages[1].content[1].image_url.url as string;
      return url.includes("/1.jpg")
        ? { content: "definitely not json", inputTokens: 10, outputTokens: 1 }
        : { content: GOOD_RESPONSE, inputTokens: 10, outputTokens: 1 };
    },
    markPhotoError: async (id) => {
      errored.push(id);
    },
  });
  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(result, { processed: 1, failed: 1 });
  assertEquals(errored, ["photo-1"]);
});

Deno.test("analyzePendingPhotos: a missing signed URL fails that photo without calling the model", async () => {
  let visionCalls = 0;
  const deps = fakeDeps({
    createSignedUrl: async () => null,
    callVisionModel: async () => {
      visionCalls++;
      return { content: GOOD_RESPONSE, inputTokens: 0, outputTokens: 0 };
    },
  });
  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(result, { processed: 0, failed: 1 });
  assertEquals(visionCalls, 0);
});

Deno.test("analyzePendingPhotos: no pending photos -> no work, no regeneration", async () => {
  let reprocessed = 0;
  const deps = fakeDeps({
    listPendingPhotos: async () => [],
    triggerReprocess: async () => {
      reprocessed++;
    },
  });
  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(result, { processed: 0, failed: 0 });
  assertEquals(reprocessed, 0);
});

Deno.test("analyzePendingPhotos: triggers exactly ONE regeneration when at least one photo succeeds", async () => {
  const reprocessed: string[] = [];
  const deps = fakeDeps({
    listPendingPhotos: async () => photos(4),
    triggerReprocess: async (id) => {
      reprocessed.push(id);
    },
  });
  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(result, { processed: 4, failed: 0 });
  assertEquals(reprocessed, [PROPERTY_ID]);
});

Deno.test("analyzePendingPhotos: no regeneration when every photo failed", async () => {
  let reprocessed = 0;
  const deps = fakeDeps({
    listPendingPhotos: async () => photos(2),
    callVisionModel: async () => {
      throw new Error("nope");
    },
    triggerReprocess: async () => {
      reprocessed++;
    },
  });
  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(result, { processed: 0, failed: 2 });
  assertEquals(reprocessed, 0);
});

Deno.test("analyzePendingPhotos: records one aggregated gpt-4o-mini cost line for the batch", async () => {
  const costs: Array<{ propertyId: string; userId: string; usage: Record<string, number> }> = [];
  const deps = fakeDeps({
    listPendingPhotos: async () => photos(2),
    callVisionModel: async () => ({
      content: GOOD_RESPONSE,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    }),
    recordPhotoAnalysisCost: async (propertyId, userId, usage) => {
      costs.push({ propertyId, userId, usage: { ...usage } });
    },
  });
  await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(costs.length, 1);
  assertEquals(costs[0].propertyId, PROPERTY_ID);
  assertEquals(costs[0].userId, "user-1");
  assertEquals(costs[0].usage.inputTokens, 2_000_000);
  assertEquals(costs[0].usage.outputTokens, 2_000_000);
  // gpt-4o-mini: $0.15/M input + $0.60/M output -> 2*0.15 + 2*0.60 = 1.50
  assertEquals(Number(costs[0].usage.costUsd.toFixed(6)), 1.5);
});

Deno.test("analyzePendingPhotos: a failed cost insert or reprocess dispatch still returns the counts", async () => {
  const deps = fakeDeps({
    recordPhotoAnalysisCost: async () => {
      throw new Error("cost insert exploded");
    },
    triggerReprocess: async () => {
      throw new Error("dispatch exploded");
    },
  });
  const result = await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(result, { processed: 1, failed: 0 });
});

Deno.test("analyzePendingPhotos: marks each photo 'analyzing' before calling the model", async () => {
  const order: string[] = [];
  const deps = fakeDeps({
    listPendingPhotos: async () => photos(1),
    markPhotoAnalyzing: async (id) => {
      order.push(`analyzing:${id}`);
    },
    callVisionModel: async () => {
      order.push("vision");
      return { content: GOOD_RESPONSE, inputTokens: 1, outputTokens: 1 };
    },
    markPhotoComplete: async (id) => {
      order.push(`complete:${id}`);
    },
  });
  await analyzePendingPhotos(PROPERTY_ID, "user-1", deps);
  assertEquals(order, ["analyzing:photo-1", "vision", "complete:photo-1"]);
});
