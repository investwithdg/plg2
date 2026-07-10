import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const ALLOWED_EVENTS = new Set(["generation_created", "limit_reached"]);

const bodySchema = z.object({
  email: z.string().email().max(320),
  eventName: z.string().min(1).max(100),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({ fn: "send-loops-event", step, ...data, t: new Date().toISOString() }),
  );
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const loopsKey = Deno.env.get("LOOPS_API_KEY");
  if (!loopsKey) {
    log("no_loops_key");
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require a valid user JWT — the anon key is public and cannot be used as auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    log("unauthorized_no_jwt");
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    log("unauthorized_bad_jwt");
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerEmail = claimsData.claims.email as string | undefined;

  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, eventName, properties } = parsed.data;

    // Email in body must match the authenticated user — prevents firing events for arbitrary addresses
    if (!callerEmail || email.toLowerCase() !== callerEmail.toLowerCase()) {
      log("email_mismatch", { eventName });
      return new Response(JSON.stringify({ ok: false }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allowlist events that can be fired client-side — server-only events (upgraded) go through stripe-webhook
    if (!ALLOWED_EVENTS.has(eventName)) {
      log("event_not_allowed", { eventName });
      return new Response(JSON.stringify({ ok: false, error: "event not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("firing_event", { email, eventName });

    const res = await fetch("https://app.loops.so/api/v1/events/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loopsKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, eventName, ...properties }),
    });

    if (!res.ok) {
      const body = await res.text();
      log("event_failed", { status: res.status, body });
    } else {
      log("event_sent", { email, eventName });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", { error: String(err) });
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
