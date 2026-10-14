import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      fn: "verify-turnstile",
      step,
      ...data,
      t: new Date().toISOString(),
    }),
  );
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) {
      log("missing_secret");
      return new Response(
        JSON.stringify({ success: false, error: "TURNSTILE_SECRET_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      log("siteverify_http_error", { status: res.status });
      return new Response(JSON.stringify({ success: false }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await res.json();

    log("result", { success: result.success });

    return new Response(JSON.stringify({ success: result.success === true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", { error: String(err) });
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
