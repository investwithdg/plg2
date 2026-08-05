// Pure request-handling logic for create-checkout — no Supabase/network imports,
// so this can be unit-tested without external module resolution. Real
// implementations of CreateCheckoutDeps live in deps.ts.
import { getCorsHeaders } from "../_shared/cors.ts";

export type VerifyCallerResult =
  | { ok: true; userId: string; email?: string }
  | { ok: false; reason: "no_token" | "invalid_token" };

export interface StripeSessionResult {
  ok: boolean;
  session: { id?: string; url?: string; error?: { message?: string } };
}

export interface CreateCheckoutDeps {
  verifyCaller: (authHeader: string | null) => Promise<VerifyCallerResult>;
  createStripeSession: (params: URLSearchParams, stripeKey: string) => Promise<StripeSessionResult>;
  log: (step: string, data?: Record<string, unknown>) => void;
}

function json(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleRequest(req: Request, deps: CreateCheckoutDeps): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const caller = await deps.verifyCaller(authHeader);
    if (!caller.ok) {
      const message = caller.reason === "no_token" ? "Authentication required" : "Invalid session";
      return json({ error: message }, 401, corsHeaders);
    }
    const { userId, email: userEmail } = caller;

    const body = await req.json();
    const interval = body.interval === "year" ? "year" : "month";
    const plan = body.plan === "elite" ? "elite" : "pro";

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      deps.log("missing_stripe_key");
      return json({ error: "Payment not configured" }, 500, corsHeaders);
    }

    // Elite uses its own price pair (STRIPE_PRICE_ELITE_MONTHLY/ANNUAL); Pro's env var names
    // are unchanged from before Elite existed, so existing Pro checkout config keeps working.
    const priceEnvVar =
      plan === "elite"
        ? interval === "year"
          ? "STRIPE_PRICE_ELITE_ANNUAL"
          : "STRIPE_PRICE_ELITE_MONTHLY"
        : interval === "year"
          ? "STRIPE_PRICE_ANNUAL"
          : "STRIPE_PRICE_MONTHLY";
    const priceId = Deno.env.get(priceEnvVar);

    if (!priceId) {
      deps.log("missing_price_id", { plan, interval });
      return json({ error: "Payment plan not configured" }, 500, corsHeaders);
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://propertylistinggenerator.com";

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("client_reference_id", userId);
    params.set("success_url", `${siteUrl}?checkout=success`);
    params.set("cancel_url", `${siteUrl}?checkout=cancel`);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[user_id]", userId);
    params.set("metadata[plan]", plan);
    params.set("subscription_data[metadata][user_id]", userId);
    params.set("subscription_data[metadata][plan]", plan);
    if (userEmail) {
      params.set("customer_email", userEmail);
    }

    const { ok, session } = await deps.createStripeSession(params, stripeKey);
    if (!ok) {
      deps.log("stripe_error", { error: session.error?.message });
      return json({ error: "Failed to create checkout session" }, 500, corsHeaders);
    }

    deps.log("checkout_created", { userId, plan, interval, sessionId: session.id });
    return json({ url: session.url }, 200, corsHeaders);
  } catch (error) {
    deps.log("unhandled_error", { error: error instanceof Error ? error.message : "Unknown" });
    return json({ error: "Internal error" }, 500, corsHeaders);
  }
}
