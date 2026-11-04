// Pure request-handling logic for analyze-property-photos — no Supabase/network imports, so
// this is unit-testable without resolving supabase-js (mirrors the split used by
// supabase/functions/mcp/handler.ts and manage-api-keys/handler.ts). Real implementations of
// AnalyzePropertyPhotosDeps live in deps.ts.
//
// Vision+ is website-only and Elite-only: the browser calls this function directly with the
// user's own session JWT (no x-internal-secret gate — that secret must never reach a client).
//
// Body:     { "propertyId": string (uuid) }
// Response: { "processed": number, "failed": number }
//
// Flow: verify JWT -> verify the caller owns the property -> verify Elite plan -> analyze up
// to MAX_PHOTOS_PER_LISTING pending photos in parallel -> if at least one succeeded, trigger
// ONE process-property regeneration with reason "photo_enrichment".
import { getCorsHeaders } from "../_shared/cors.ts";
import { isEliteOnlyPlan, type PlanTier } from "../_shared/planTier.ts";
import {
  buildVisionRequestBody,
  computeVisionCost,
  MAX_PHOTOS_PER_LISTING,
  parsePhotoAnalysis,
  SIGNED_URL_EXPIRY_SECONDS,
  type PhotoAnalysis,
  type TokenUsage,
} from "../_shared/photoAnalysis.ts";

export type VerifyCallerResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_token" | "invalid_token" };

export type ParseBodyResult =
  | { ok: true; propertyId: string }
  | { ok: false; message: string; details?: unknown };

export interface PendingPhoto {
  id: string;
  storagePath: string;
}

export interface VisionResponse {
  content: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface AnalyzePropertyPhotosDeps {
  /** zod validation lives in deps.ts so this layer stays importable with no network. */
  parseBody: (raw: unknown) => ParseBodyResult;
  verifyCaller: (authHeader: string | null) => Promise<VerifyCallerResult>;
  /** null when no such property row exists. */
  getPropertyOwner: (propertyId: string) => Promise<{ userId: string | null } | null>;
  getUserPlan: (userId: string) => Promise<PlanTier>;
  listPendingPhotos: (propertyId: string, limit: number) => Promise<PendingPhoto[]>;
  markPhotoAnalyzing: (photoId: string) => Promise<void>;
  createSignedUrl: (storagePath: string, expiresInSeconds: number) => Promise<string | null>;
  /** Raw transport only — the prompt/schema are built here so they stay unit-testable. */
  callVisionModel: (requestBody: Record<string, unknown>) => Promise<VisionResponse>;
  markPhotoComplete: (photoId: string, analysis: PhotoAnalysis) => Promise<void>;
  markPhotoError: (photoId: string, message: string) => Promise<void>;
  recordPhotoAnalysisCost: (
    propertyId: string,
    userId: string,
    usage: TokenUsage,
  ) => Promise<void>;
  /** Invokes process-property with the shared internal secret and reason "photo_enrichment". */
  triggerReprocess: (propertyId: string) => Promise<void>;
  log: (step: string, data?: Record<string, unknown>) => void;
}

function json(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AnalyzeResult {
  processed: number;
  failed: number;
}

/**
 * Analyzes every pending photo for a property. Photos are processed in parallel (max 5) and
 * each one is isolated: a failure is written to that row's status/error_message and the rest
 * continue. Exported for direct unit testing.
 */
export async function analyzePendingPhotos(
  propertyId: string,
  userId: string,
  deps: AnalyzePropertyPhotosDeps,
): Promise<AnalyzeResult> {
  const photos = await deps.listPendingPhotos(propertyId, MAX_PHOTOS_PER_LISTING);
  if (photos.length === 0) {
    deps.log("no_pending_photos", { propertyId });
    return { processed: 0, failed: 0 };
  }

  const settled = await Promise.all(
    photos.map(async (photo): Promise<{ ok: boolean; usage?: TokenUsage }> => {
      try {
        await deps.markPhotoAnalyzing(photo.id);
        const signedUrl = await deps.createSignedUrl(
          photo.storagePath,
          SIGNED_URL_EXPIRY_SECONDS,
        );
        if (!signedUrl) throw new Error("Could not create a signed URL for the stored photo");

        const response = await deps.callVisionModel(buildVisionRequestBody(signedUrl));
        const analysis = parsePhotoAnalysis(response.content);
        await deps.markPhotoComplete(photo.id, analysis);

        const usage = computeVisionCost(response.inputTokens ?? 0, response.outputTokens ?? 0);
        deps.log("photo_analyzed", {
          propertyId,
          photoId: photo.id,
          roomType: analysis.room_type,
          featureCount: analysis.features.length,
          costUsd: usage.costUsd,
        });
        return { ok: true, usage };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        deps.log("photo_failed", { propertyId, photoId: photo.id, message });
        // Never let the failure bookkeeping itself take down the batch.
        try {
          await deps.markPhotoError(photo.id, message.slice(0, 500));
        } catch (writeErr) {
          deps.log("photo_error_write_failed", {
            propertyId,
            photoId: photo.id,
            message: writeErr instanceof Error ? writeErr.message : "Unknown error",
          });
        }
        return { ok: false };
      }
    }),
  );

  let processed = 0;
  let failed = 0;
  const total: TokenUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  for (const result of settled) {
    if (result.ok) {
      processed++;
      if (result.usage) {
        total.inputTokens += result.usage.inputTokens;
        total.outputTokens += result.usage.outputTokens;
        total.costUsd += result.usage.costUsd;
      }
    } else {
      failed++;
    }
  }

  if (processed > 0) {
    try {
      await deps.recordPhotoAnalysisCost(propertyId, userId, total);
    } catch (err) {
      deps.log("cost_insert_failed", {
        propertyId,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Exactly ONE regeneration for the whole batch, after every photo has settled.
    try {
      await deps.triggerReprocess(propertyId);
      deps.log("reprocess_triggered", { propertyId, processed, failed });
    } catch (err) {
      deps.log("reprocess_failed", {
        propertyId,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { processed, failed };
}

export async function handleRequest(
  req: Request,
  deps: AnalyzePropertyPhotosDeps,
): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    const caller = await deps.verifyCaller(authHeader);
    if (!caller.ok) {
      const message = caller.reason === "no_token" ? "Authentication required" : "Invalid session";
      return json({ error: "unauthorized", message }, 401, corsHeaders);
    }

    const raw = await req.json().catch(() => null);
    const parsed = deps.parseBody(raw);
    if (!parsed.ok) {
      return json(
        { error: "invalid_input", message: parsed.message, details: parsed.details },
        400,
        corsHeaders,
      );
    }
    const { propertyId } = parsed;

    // Ownership before plan: never leak plan-gate information about someone else's property.
    const property = await deps.getPropertyOwner(propertyId);
    if (!property) {
      return json(
        { error: "property_not_found", message: "Property not found." },
        404,
        corsHeaders,
      );
    }
    if (property.userId !== caller.userId) {
      return json(
        { error: "forbidden_property", message: "You do not have access to this property." },
        403,
        corsHeaders,
      );
    }

    const plan = await deps.getUserPlan(caller.userId);
    if (!isEliteOnlyPlan(plan)) {
      return json(
        {
          error: "forbidden_plan",
          message: "Photo analysis requires an Elite plan.",
        },
        403,
        corsHeaders,
      );
    }

    const result = await analyzePendingPhotos(propertyId, caller.userId, deps);
    return json({ processed: result.processed, failed: result.failed }, 200, corsHeaders);
  } catch (e) {
    return json({ error: String(e) }, 500, corsHeaders);
  }
}
