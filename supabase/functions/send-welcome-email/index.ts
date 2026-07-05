import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const bodySchema = z.object({
  email: z.string().email().max(320),
});

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({ fn: "send-welcome-email", step, ...data, t: new Date().toISOString() }),
  );
}

serve(async (req) => {
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

  // Reject requests that don't carry the Supabase anon key — basic abuse mitigation.
  // The anon key is public, so this is not a security boundary, but it blocks
  // arbitrary callers who don't go through the Supabase JS client.
  // Proper fix: trigger via DB webhook on auth.users insert (no client call at all).
  const apiKey = req.headers.get("apikey") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!apiKey || apiKey !== anonKey) {
    log("unauthorized");
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
