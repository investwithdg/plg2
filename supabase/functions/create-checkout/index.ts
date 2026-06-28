import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      fn: "create-checkout",
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;

    const body = await req.json();
    const interval = body.interval === "year" ? "year" : "month";

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("missing_stripe_key");
      return new Response(
        JSON.stringify({ error: "Payment not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const priceId =
      interval === "year"
        ? Deno.env.get("STRIPE_PRICE_ANNUAL")!
        : Deno.env.get("STRIPE_PRICE_MONTHLY")!;

    const siteUrl = Deno.env.get("SITE_URL") || "https://propertylistinggenerator.com";

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("client_reference_id", userId);
    params.set("success_url", `${siteUrl}?checkout=success`);
    params.set("cancel_url", `${siteUrl}?checkout=cancel`);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("subscription_data[trial_period_days]", "7");
    if (userEmail) {
      params.set("customer_email", userEmail);
    }

    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      log("stripe_error", { error: session.error?.message });
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    log("checkout_created", { userId, interval, sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    log("unhandled_error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
