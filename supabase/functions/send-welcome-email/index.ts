import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const bodySchema = z.object({
  email: z.string().email().max(320),
});

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({ fn: "send-welcome-email", step, ...data, t: new Date().toISOString() }),
  );
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const loopsKey = Deno.env.get("LOOPS_API_KEY");
  if (!loopsKey) {
    log("no_loops_key");
    return new Response(JSON.stringify({ ok: false, error: "LOOPS_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require an authenticated Supabase user and only allow enrolling their own email.
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    log("unauthorized_no_bearer");
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    log("unauthorized_invalid_token");
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerEmail = (claimsData.claims.email as string | undefined)?.toLowerCase();

  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = parsed.data;
    if (!callerEmail || callerEmail !== email.toLowerCase()) {
      log("email_mismatch");
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("adding_contact", { email });

    // 1. Upsert contact in Loops
    const contactRes = await fetch("https://app.loops.so/api/v1/contacts/upsert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loopsKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, source: "plg_signup" }),
    });

    if (!contactRes.ok) {
      const body = await contactRes.text();
      log("contact_upsert_failed", { status: contactRes.status, body });
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to upsert Loops contact" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    log("contact_upserted", { email });

    // 2. Fire the signup event to trigger the welcome sequence
    const eventRes = await fetch("https://app.loops.so/api/v1/events/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loopsKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, eventName: "signup" }),
    });

    if (!eventRes.ok) {
      const body = await eventRes.text();
      log("event_send_failed", { status: eventRes.status, body });
      // Non-fatal: contact is already in Loops
    } else {
      log("welcome_event_sent", { email });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("unexpected_error", { error: String(err) });
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
