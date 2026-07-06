// receive-property: validates input, enforces server-side free-generation caps,
// dedupes recent identical requests (idempotency), creates the property row,
// and dispatches process-property. Captures invoke failures on the property row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREE_LIMIT = 10;
const FREE_WINDOW_DAYS = 30;
const FREE_PRO_TIER_LIMIT = 1;
const DEDUPE_WINDOW_SECONDS = 60;
const FREE_PROPERTY_TYPES = ["sfr", "fsbo"];

const propertyInputSchema = z
  .object({
    url: z.string().url().max(2048).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    propertyType: z.string().trim().max(100).optional(),
    source: z.string().trim().max(100).optional(),
  })
  .refine((d) => d.url || d.address, {
    message: "Either 'url' or 'address' must be provided",
  });

function normalizePropertyType(value?: string): string {
  const type = (value || "sfr").toLowerCase().trim();
  if (type === "lux" || type === "luxury") return "estate";
  return type;
}

function isProTierPropertyType(type: string): boolean {
  return !FREE_PROPERTY_TYPES.includes(type);
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      fn: "receive-property",
      step,
      ...data,
      t: new Date().toISOString(),
    }),
  );
}

function usageCheckUnavailableResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: "usage_check_unavailable",
      message: "Usage limit verification is temporarily unavailable. Please try again.",
    }),
    {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Identify caller
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims(token);
      if (!claimsError && claimsData?.claims)
        userId = claimsData.claims.sub as string;
    }

    // Best-effort IP for anonymous rate-limit + dedupe
    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const ipHash = await sha256(ipRaw + "|plg-salt");

    const rawBody = await req.json();
    const parsed = propertyInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input",
          details: parsed.error.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const validatedInput = parsed.data;
    const requestedType = normalizePropertyType(validatedInput.propertyType);
    const proTierRequest = isProTierPropertyType(requestedType);

    // 1) Idempotency: same (caller, address|url) within window returns existing propertyId
    const dedupeKey = await sha256(
      [
        userId ?? `ip:${ipHash}`,
        (validatedInput.url || validatedInput.address || "")
          .toLowerCase()
          .trim(),
      ].join("|"),
    );
    const sinceDedupe = new Date(
      Date.now() - DEDUPE_WINDOW_SECONDS * 1000,
    ).toISOString();
    const dedupeQuery = supabase
      .from("properties")
      .select("id, status")
      .eq("dedupe_key", dedupeKey)
      .gte("created_at", sinceDedupe)
      .order("created_at", { ascending: false })
      .limit(1);
    const { data: dedupeMatch } = await dedupeQuery;
    if (dedupeMatch && dedupeMatch.length > 0) {
      log("dedupe_hit", { propertyId: dedupeMatch[0].id });
      return new Response(
        JSON.stringify({
          success: true,
          propertyId: dedupeMatch[0].id,
          message: "Existing in-flight generation reused",
          deduped: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2) Subscription check. Active Pro users are unlimited.
    let hasProPlan = false;
    if (userId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .eq("plan", "pro")
        .eq("status", "active")
        .limit(1);
      hasProPlan = (sub && sub.length > 0) ?? false;
    }

    const sinceWindow = new Date(
      Date.now() - FREE_WINDOW_DAYS * 86400_000,
    ).toISOString();

    // 3) Server-side free-generation caps.
    // Anonymous users get 10 total generations by IP hash, including 1 Pro-tier
    // generation. Signed-in free users get 10 generations per 30-day window,
    // including 1 Pro-tier generation per window. Pro users skip these caps.
    if (!hasProPlan) {
      if (proTierRequest) {
        const proTierQuery = supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .not("property_type", "in", `("${FREE_PROPERTY_TYPES.join('","')}")`);

        if (userId) {
          proTierQuery.eq("user_id", userId).gte("created_at", sinceWindow);
        } else {
          proTierQuery.eq("ip_hash", ipHash).is("user_id", null);
        }

        const { count: proTierCount, error: proTierCountErr } = await proTierQuery;
        if (proTierCountErr) {
          log("pro_tier_count_error", { error: proTierCountErr.message });
          return usageCheckUnavailableResponse();
        }

        if ((proTierCount ?? 0) >= FREE_PRO_TIER_LIMIT) {
          log(userId ? "free_user_pro_tier_exceeded" : "anon_pro_tier_exceeded", {
            userId,
            requestedType,
            proTierCount,
            ipHashPrefix: userId ? undefined : ipHash.slice(0, 8),
          });

          const message = userId
            ? "Free accounts include 1 Pro-tier property generation per month. Upgrade to Pro for unlimited Pro-tier generations."
            : "Anonymous users include 1 Pro-tier property generation. Sign in for a monthly Pro-tier sample or upgrade to Pro.";

          return new Response(
            JSON.stringify({
              success: false,
              error: "pro_required",
              message,
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      const countQuery = supabase
        .from("properties")
        .select("id", { count: "exact", head: true });

      if (userId) {
        countQuery.eq("user_id", userId).gte("created_at", sinceWindow);
      } else {
        countQuery.eq("ip_hash", ipHash).is("user_id", null);
      }

      const { count, error: countErr } = await countQuery;
      if (countErr) {
        log("cap_count_error", { error: countErr.message });
        return usageCheckUnavailableResponse();
      }

      if ((count ?? 0) >= FREE_LIMIT) {
        log(userId ? "free_user_cap_exceeded" : "anon_cap_exceeded", {
          userId,
          count,
          ipHashPrefix: userId ? undefined : ipHash.slice(0, 8),
        });

        const message = userId
          ? `Free monthly limit reached (${FREE_LIMIT} per ${FREE_WINDOW_DAYS} days). Upgrade to Pro for unlimited generations.`
          : `Free anonymous limit reached (${FREE_LIMIT} generations). Sign in for ${FREE_LIMIT} monthly generations or upgrade to Pro.`;

        return new Response(
          JSON.stringify({
            success: false,
            error: "free_limit_exceeded",
            message,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // 4) Create property row
    const { data: property, error: insertError } = await supabase
      .from("properties")
      .insert({
        address: validatedInput.address || validatedInput.url || "Unknown",
        property_type: requestedType,
        user_id: userId,
        source: validatedInput.source || "generator",
        source_url: validatedInput.url || null,
        status: "processing",
        enrichment_step: "started",
        dedupe_key: dedupeKey,
        ip_hash: ipHash,
      })
      .select()
      .single();

    if (insertError) {
      log("insert_error", { error: insertError.message });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create property record",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    log("property_created", {
      propertyId: property.id,
      userId,
      anonymous: !userId,
    });

    // 5) Dispatch processing — capture invoke failures so the row doesn't get stuck
    supabase.functions
      .invoke("process-property", { body: { propertyId: property.id } })
      .then(async ({ error }) => {
        if (error) {
          log("invoke_failed", {
            propertyId: property.id,
            error: error.message,
          });
          await supabase
            .from("properties")
            .update({
              status: "error",
              enrichment_step: `dispatch failed: ${error.message?.slice(0, 180)}`,
              failed_step: "dispatch",
            })
            .eq("id", property.id);
        } else {
          log("invoke_ok", { propertyId: property.id });
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        propertyId: property.id,
        message: "Property processing started",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    log("unhandled_error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
