// receive-property: validates input, enforces active/trialing Pro or Elite subscription,
// dedupes recent identical requests (idempotency), creates the property row,
// and dispatches process-property. Captures invoke failures on the property row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { resolvePlanTier } from "../_shared/planTier.ts";

const DEDUPE_WINDOW_SECONDS = 60;

const propertyInputSchema = z
  .object({
    url: z.string().url().max(2048).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    propertyType: z.string().trim().max(100).optional(),
    source: z.string().trim().max(100).optional(),
    regenerate: z.boolean().optional(),
  })
  .refine((d) => d.url || d.address, {
    message: "Either 'url' or 'address' must be provided",
  });

function normalizePropertyType(value?: string): string {
  const type = (value || "sfr").toLowerCase().trim();
  if (type === "luxury") return "lux";
  return type;
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
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
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
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

  return { jsonResponse };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { jsonResponse } = makeResponders(corsHeaders);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonymousUsageSecret = Deno.env.get("ANON_USAGE_SECRET") || supabaseServiceKey;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Identify caller — authentication is required (no anonymous/free tier).
    let userId: string | null = null;

    // Trusted internal caller: the mcp/ edge function has ALREADY authenticated and
    // plan-gated this request before ever reaching us.
    const mcpInternalSecret = req.headers.get("x-mcp-internal-secret");
    const expectedMcpSecret = Deno.env.get("MCP_INTERNAL_SECRET");
    const mcpUserId = req.headers.get("x-mcp-user-id");
    if (
      mcpInternalSecret &&
      expectedMcpSecret &&
      mcpInternalSecret === expectedMcpSecret &&
      mcpUserId
    ) {
      userId = mcpUserId;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        if (!claimsError && claimsData?.claims) userId = claimsData.claims.sub as string;
      }
    }

    if (!userId) {
      return jsonResponse(
        {
          success: false,
          error: "auth_required",
          message: "Sign in and start your 7-day free Pro trial to generate listings.",
        },
        401,
      );
    }

    // 2) Subscription gate: active or trialing Pro / Elite required.
    const { data: subs, error: subErr } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);

    if (subErr) {
      log("subscription_lookup_error", { userId, error: subErr.message });
      return jsonResponse(
        {
          success: false,
          error: "usage_check_unavailable",
          message: "Subscription verification is temporarily unavailable. Please try again.",
        },
        503,
      );
    }

    const plan = resolvePlanTier(subs);
    if (plan !== "pro" && plan !== "elite") {
      log("subscription_required", { userId, plan });
      return jsonResponse(
        {
          success: false,
          error: "subscription_required",
          message: "Start your 7-day free Pro trial (card required) to generate listings.",
        },
        403,
      );
    }

    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const ipHash = await hmacSha256(`ip:${ipRaw}`, anonymousUsageSecret);

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

    // 3) Idempotency: same (caller, address|url) within window returns existing propertyId.
    //    Bypassed when regenerate === true so subscribers can regenerate freely.
    const isRegenerate = validatedInput.regenerate === true;
    const dedupeKey = await sha256(
      [
        userId,
        (validatedInput.url || validatedInput.address || "").toLowerCase().trim(),
      ].join("|"),
    );
    if (!isRegenerate) {
      const sinceDedupe = new Date(Date.now() - DEDUPE_WINDOW_SECONDS * 1000).toISOString();
      const { data: dedupeMatch } = await supabase
        .from("properties")
        .select("id, status")
        .eq("dedupe_key", dedupeKey)
        .gte("created_at", sinceDedupe)
        .order("created_at", { ascending: false })
        .limit(1);
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
    } else {
      log("dedupe_bypass_regenerate");
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
      plan,
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

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
