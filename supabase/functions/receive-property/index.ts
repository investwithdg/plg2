// receive-property: validates input, enforces server-side free-generation caps,
// dedupes recent identical requests (idempotency), creates the property row,
// and dispatches process-property. Captures invoke failures on the property row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const FREE_LIMIT = 10;
const FREE_WINDOW_DAYS = 30;
const FREE_PRO_TIER_LIMIT = 1;
const DEDUPE_WINDOW_SECONDS = 60;
const FREE_PROPERTY_TYPES = ["sfr", "fsbo"];
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const propertyInputSchema = z
  .object({
    url: z.string().url().max(2048).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    propertyType: z.string().trim().max(100).optional(),
    source: z.string().trim().max(100).optional(),
    anonymousId: z.string().trim().min(16).max(128).optional(),
    turnstileToken: z.string().trim().max(4096).optional(),
  })
  .refine((d) => d.url || d.address, {
    message: "Either 'url' or 'address' must be provided",
  });

function normalizePropertyType(value?: string): string {
  const type = (value || "sfr").toLowerCase().trim();
  if (type === "luxury") return "lux";
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

async function hmacSha256(input: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(signature))
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

// Response helpers are built fresh per-request so corsHeaders (computed from
// that request's Origin) never leaks across concurrent requests sharing this isolate.
function makeResponders(corsHeaders: Record<string, string>) {
  function jsonResponse(body: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  function usageCheckUnavailableResponse() {
    return jsonResponse(
      {
        success: false,
        error: "usage_check_unavailable",
        message: "Usage limit verification is temporarily unavailable. Please try again.",
      },
      503,
    );
  }

  function gateResponse(errorCode: string, userId: string | null) {
    if (errorCode === "pro_required") {
      return jsonResponse(
        {
          success: false,
          error: "pro_required",
          message: userId
            ? "Free accounts include 1 Pro-tier property generation per month. Upgrade to Pro for unlimited Pro-tier generations."
            : "Anonymous users include 1 Pro-tier property generation. Sign in for a monthly Pro-tier sample or upgrade to Pro.",
        },
        403,
      );
    }

    if (errorCode === "free_limit_exceeded") {
      return jsonResponse(
        {
          success: false,
          error: "free_limit_exceeded",
          message: userId
            ? `Free monthly limit reached (${FREE_LIMIT} per ${FREE_WINDOW_DAYS} days). Upgrade to Pro for unlimited generations.`
            : `Free anonymous limit reached (${FREE_LIMIT} generations). Sign in for ${FREE_LIMIT} monthly generations or upgrade to Pro.`,
        },
        429,
      );
    }

    if (errorCode === "anonymous_id_required") {
      return jsonResponse(
        {
          success: false,
          error: "anonymous_id_required",
          message: "Anonymous usage identity is required. Refresh and try again.",
        },
        400,
      );
    }

    return usageCheckUnavailableResponse();
  }

  async function verifyAnonymousTurnstile(
    token: string | undefined,
    ipRaw: string,
  ): Promise<{ ok: true } | { ok: false; response: Response }> {
    if (!token) {
      return {
        ok: false,
        response: jsonResponse(
          {
            success: false,
            error: "turnstile_required",
            message: "Security check required. Please try again.",
          },
          400,
        ),
      };
    }

    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) {
      log("missing_turnstile_secret");
      return {
        ok: false,
        response: jsonResponse(
          {
            success: false,
            error: "security_check_unavailable",
            message: "Security check unavailable. Please try again.",
          },
          503,
        ),
      };
    }

    const body = new URLSearchParams({ secret, response: token });
    if (ipRaw && ipRaw !== "unknown") body.set("remoteip", ipRaw);

    try {
      const res = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!res.ok) {
        log("turnstile_http_error", { status: res.status });
        return {
          ok: false,
          response: jsonResponse(
            {
              success: false,
              error: "security_check_unavailable",
              message: "Security check unavailable. Please try again.",
            },
            503,
          ),
        };
      }

      const result = await res.json();
      if (!result?.success) {
        log("turnstile_failed", { codes: result?.["error-codes"] });
        return {
          ok: false,
          response: jsonResponse(
            {
              success: false,
              error: "turnstile_failed",
              message: "Security check failed. Please try again.",
            },
            403,
          ),
        };
      }

      return { ok: true };
    } catch (error) {
      log("turnstile_verify_error", {
        error: error instanceof Error ? error.message : "Unknown",
      });
      return {
        ok: false,
        response: jsonResponse(
          {
            success: false,
            error: "security_check_unavailable",
            message: "Security check unavailable. Please try again.",
          },
          503,
        ),
      };
    }
  }

  return { jsonResponse, usageCheckUnavailableResponse, gateResponse, verifyAnonymousTurnstile };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const { jsonResponse, usageCheckUnavailableResponse, gateResponse, verifyAnonymousTurnstile } =
    makeResponders(corsHeaders);

  let anonymousUsageKey: string | null = null;
  let anonymousUsageReserved = false;
  let proTierRequest = false;
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonymousUsageSecret =
      Deno.env.get("ANON_USAGE_SECRET") || supabaseServiceKey;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const userAgentRaw = req.headers.get("user-agent") || "unknown";
    const ipHash = await hmacSha256(`ip:${ipRaw}`, anonymousUsageSecret);
    const userAgentHash = await hmacSha256(
      `ua:${userAgentRaw}`,
      anonymousUsageSecret,
    );
    const networkKey = await hmacSha256(
      `network:${ipRaw}|${userAgentRaw}`,
      anonymousUsageSecret,
    );

    const rawBody = await req.json();
    const parsed = propertyInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.errors,
        },
        400,
      );
    }
    const validatedInput = parsed.data;
    const requestedType = normalizePropertyType(validatedInput.propertyType);
    proTierRequest = isProTierPropertyType(requestedType);

    if (!userId && !validatedInput.anonymousId) {
      return gateResponse("anonymous_id_required", null);
    }

    if (!userId && validatedInput.anonymousId) {
      anonymousUsageKey = await hmacSha256(
        `anon-key:v1:${validatedInput.anonymousId}`,
        anonymousUsageSecret,
      );
    }

    // 1) Idempotency: same (caller, address|url) within window returns existing propertyId
    const dedupeKey = await sha256(
      [
        userId ?? `anon:${anonymousUsageKey ?? ipHash}`,
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
      return jsonResponse(
        {
          success: true,
          propertyId: dedupeMatch[0].id,
          message: "Existing in-flight generation reused",
          deduped: true,
        },
        200,
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
    // Anonymous users are reserved by a server-HMACed first-party anon cookie;
    // IP, user-agent, and network hashes are stored as metadata. Signed-in free
    // users keep the monthly property-row cap. Pro users skip caps.
    if (!hasProPlan) {
      if (!userId) {
        const turnstileResult = await verifyAnonymousTurnstile(
          validatedInput.turnstileToken,
          ipRaw,
        );
        if (!turnstileResult.ok) return turnstileResult.response;

        if (!anonymousUsageKey || !validatedInput.anonymousId) {
          return gateResponse("anonymous_id_required", null);
        }

        const anonCookieHash = await hmacSha256(
          `anon-cookie:${validatedInput.anonymousId}`,
          anonymousUsageSecret,
        );

        const { data: reservation, error: reservationErr } = await supabase
          .rpc("reserve_anonymous_generation", {
            p_anon_key: anonymousUsageKey,
            p_anon_cookie_hash: anonCookieHash,
            p_ip_hash: ipHash,
            p_user_agent_hash: userAgentHash,
            p_network_key: networkKey,
            p_is_pro_tier: proTierRequest,
            p_total_limit: FREE_LIMIT,
            p_pro_tier_limit: FREE_PRO_TIER_LIMIT,
          })
          .single();

        if (reservationErr) {
          log("anonymous_usage_reservation_error", {
            error: reservationErr.message,
          });
          return usageCheckUnavailableResponse();
        }

        const allowed = (reservation as { allowed?: boolean } | null)?.allowed;
        const errorCode = (reservation as { error_code?: string } | null)
          ?.error_code;

        if (!allowed) {
          log("anonymous_usage_blocked", {
            errorCode,
            proTierRequest,
            anonKeyPrefix: anonymousUsageKey.slice(0, 8),
          });
          return gateResponse(errorCode || "usage_check_unavailable", null);
        }

        anonymousUsageReserved = true;
      } else {
        if (proTierRequest) {
          const proTierQuery = supabase
            .from("properties")
            .select("id", { count: "exact", head: true })
            .not("property_type", "in", `("${FREE_PROPERTY_TYPES.join('","')}")`)
            .eq("user_id", userId)
            .gte("created_at", sinceWindow);

          const { count: proTierCount, error: proTierCountErr } = await proTierQuery;
          if (proTierCountErr) {
            log("pro_tier_count_error", { error: proTierCountErr.message });
            return usageCheckUnavailableResponse();
          }

          if ((proTierCount ?? 0) >= FREE_PRO_TIER_LIMIT) {
            log("free_user_pro_tier_exceeded", {
              userId,
              requestedType,
              proTierCount,
            });
            return gateResponse("pro_required", userId);
          }
        }

        const countQuery = supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", sinceWindow);

        const { count, error: countErr } = await countQuery;
        if (countErr) {
          log("cap_count_error", { error: countErr.message });
          return usageCheckUnavailableResponse();
        }

        if ((count ?? 0) >= FREE_LIMIT) {
          log("free_user_cap_exceeded", { userId, count });
          return gateResponse("free_limit_exceeded", userId);
        }
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
      if (anonymousUsageReserved && anonymousUsageKey) {
        await supabase.rpc("refund_anonymous_generation", {
          p_anon_key: anonymousUsageKey,
          p_is_pro_tier: proTierRequest,
        });
      }
      return jsonResponse(
        {
          success: false,
          error: "Failed to create property record",
          details: insertError.message,
        },
        500,
      );
    }

    log("property_created", {
      propertyId: property.id,
      userId,
      anonymous: !userId,
    });

    // 5) Dispatch processing — capture invoke failures so the row doesn't get stuck
    supabase.functions
      .invoke("process-property", {
        body: { propertyId: property.id },
        headers: { "x-internal-secret": Deno.env.get("PROCESS_PROPERTY_SECRET") ?? "" },
      })
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

    return jsonResponse(
      {
        success: true,
        propertyId: property.id,
        message: "Property processing started",
      },
      200,
    );
  } catch (error) {
    log("unhandled_error", {
      error: error instanceof Error ? error.message : "Unknown",
    });

    if (anonymousUsageReserved && anonymousUsageKey && supabase) {
      await supabase.rpc("refund_anonymous_generation", {
        p_anon_key: anonymousUsageKey,
        p_is_pro_tier: proTierRequest,
      });
    }

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
