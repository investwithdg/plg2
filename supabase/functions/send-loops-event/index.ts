import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const bodySchema = z.object({
  email: z.string().email().max(320),
  eventName: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
});

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({ fn: "send-loops-event", step, ...data, t: new Date().toISOString() }),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const loopsKey = Deno.env.get("LOOPS_API_KEY");
  if (!loopsKey) {
    log("no_loops_key");
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey =
    req.headers.get("apikey") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!apiKey || apiKey !== anonKey) {
    log("unauthorized");
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
