// Real (Supabase-backed) implementation of AnalyzePropertyPhotosDeps. Kept separate from
// handler.ts so the request-handling, plan-gating, prompt-building and parsing logic can be
// unit-tested without resolving supabase-js. Mirrors manage-api-keys/deps.ts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { resolvePlanTier, type PlanTier } from "../_shared/planTier.ts";
import { VISION_MODEL } from "../_shared/photoAnalysis.ts";
import type {
  AnalyzePropertyPhotosDeps,
  ParseBodyResult,
  PendingPhoto,
  VerifyCallerResult,
  VisionResponse,
} from "./handler.ts";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;
const PHOTO_BUCKET = "property-photos";

// Same body shape process-property/receive-property validate with: a single uuid propertyId.
const BodySchema = z.object({ propertyId: z.string().uuid() });

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// property_photos isn't in the generated Database types yet (same situation as api_keys in
// manage-api-keys/deps.ts and mls_rules in mcp/deps.ts) — use the repo's established escape hatch.
function photosTable(supabase: ReturnType<typeof createClient>) {
  return supabase.from("property_photos" as never) as any;
}

// Support multiple API keys via comma-separated env vars for load distribution
// (identical to process-property's pickKey).
function pickKey(envVar: string): string {
  const raw = Deno.env.get(envVar);
  if (!raw) throw new Error(`${envVar} not configured`);
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return keys[Math.floor(Math.random() * keys.length)];
}

export function defaultDeps(): AnalyzePropertyPhotosDeps {
  const supabase = serviceClient();

  return {
    parseBody(raw): ParseBodyResult {
      const parsed = BodySchema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          message: "Provide a valid 'propertyId'.",
          details: parsed.error.errors,
        };
      }
      return { ok: true, propertyId: parsed.data.propertyId };
    },

    async verifyCaller(authHeader): Promise<VerifyCallerResult> {
      // Browser callers only — always a real Supabase user session JWT. This function is
      // deliberately NOT gated by x-internal-secret / PROCESS_PROPERTY_SECRET, which must
      // never be shipped to a client.
      if (!authHeader?.startsWith("Bearer ")) return { ok: false, reason: "no_token" };
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims) return { ok: false, reason: "invalid_token" };
      return { ok: true, userId: data.claims.sub as string };
    },

    async getPropertyOwner(propertyId) {
      const { data, error } = await supabase
        .from("properties")
        .select("user_id")
        .eq("id", propertyId)
        .maybeSingle();
      if (error || !data) return null;
      return { userId: (data.user_id as string | null) ?? null };
    },

    async getUserPlan(userId): Promise<PlanTier> {
      // No .limit() so resolvePlanTier's elite-beats-pro tie-break sees every active row.
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .eq("status", "active");
      return resolvePlanTier(data);
    },

    async listPendingPhotos(propertyId, limit): Promise<PendingPhoto[]> {
      const { data, error } = await photosTable(supabase)
        .select("id, storage_path")
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        storagePath: row.storage_path as string,
      }));
    },

    async markPhotoAnalyzing(photoId) {
      await photosTable(supabase).update({ status: "analyzing" }).eq("id", photoId);
    },

    async createSignedUrl(storagePath, expiresInSeconds) {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(storagePath, expiresInSeconds);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    },

    async callVisionModel(requestBody): Promise<VisionResponse> {
      const openaiKey = pickKey("OPENAI_API_KEY");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(OPENAI_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`OpenAI vision failed [${res.status}]: ${body.slice(0, 200)}`);
        }
        const data = await res.json();
        return {
          content: data.choices?.[0]?.message?.content ?? null,
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        };
      } finally {
        clearTimeout(timeout);
      }
    },

    async markPhotoComplete(photoId, analysis) {
      const { error } = await photosTable(supabase)
        .update({ status: "complete", analysis, error_message: null })
        .eq("id", photoId);
      if (error) throw new Error(error.message);
    },

    async markPhotoError(photoId, message) {
      await photosTable(supabase)
        .update({ status: "error", error_message: message })
        .eq("id", photoId);
    },

    async recordPhotoAnalysisCost(propertyId, userId, usage) {
      // Its own generation_costs row (photo_analysis_* columns added by the Vision+
      // migration). The main pipeline's row is written separately by process-property, so a
      // photo-analysis line never overwrites or races the text-only generation's costs.
      const { error } = await supabase.from("generation_costs").insert({
        property_id: propertyId,
        user_id: userId,
        photo_analysis_input_tokens: usage.inputTokens,
        photo_analysis_output_tokens: usage.outputTokens,
        photo_analysis_cost_usd: usage.costUsd,
        photo_analysis_model_version: VISION_MODEL,
      } as never);
      if (error) throw new Error(error.message);
    },

    async triggerReprocess(propertyId) {
      // Same internal-secret dispatch pattern receive-property uses. reason:"photo_enrichment"
      // is what lets process-property bypass its already_complete re-processing guard.
      const { error } = await supabase.functions.invoke("process-property", {
        body: { propertyId, reason: "photo_enrichment" },
        headers: { "x-internal-secret": Deno.env.get("PROCESS_PROPERTY_SECRET") ?? "" },
      });
      if (error) throw new Error(error.message);
    },

    log(step, data) {
      console.log(
        JSON.stringify({
          fn: "analyze-property-photos",
          step,
          ...data,
          t: new Date().toISOString(),
        }),
      );
    },
  };
}
