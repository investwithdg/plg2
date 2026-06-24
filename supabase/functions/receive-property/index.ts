// receive-property: validates input, enforces server-side free-generation cap,
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

const FREE_LIMIT = 3;
const FREE_WINDOW_DAYS = 30;
const DEDUPE_WINDOW_SECONDS = 60;

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

    // 2) Server-side free-generation cap (skip for unknown column gracefully)
    const sinceWindow = new Date(
      Date.now() - FREE_WINDOW_DAYS * 86400_000,
    ).toISOString();
    const countQuery = supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceWindow);
    if (userId) countQuery.eq("user_id", userId);
    else countQuery.eq("ip_hash", ipHash).is("user_id", null);
    const { count, error: countErr } = await countQuery;
    if (countErr) log("cap_count_error", { error: countErr.message });

    if ((count ?? 0) >= FREE_LIMIT && !userId) {
      // For anonymous only; signed-in pro/free checks live elsewhere
      log("cap_exceeded", { count, ipHashPrefix: ipHash.slice(0, 8) });
      return new Response(
        JSON.stringify({
          success: false,
          error: "free_limit_exceeded",
          message: `Free limit reached (${FREE_LIMIT} per ${FREE_WINDOW_DAYS} days). Sign in or upgrade.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3) Create property row
    const { data: property, error: insertError } = await supabase
      .from("properties")
      .insert({
        address: validatedInput.address || validatedInput.url || "Unknown",
        property_type: validatedInput.propertyType || null,
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

    // 4) Dispatch processing — capture invoke failures so the row doesn't get stuck
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
