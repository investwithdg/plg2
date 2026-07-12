// Real (Supabase + Stripe backed) implementation of CreateCheckoutDeps. Kept
// separate from handler.ts so the request-handling logic can be unit-tested
// without resolving supabase-js or hitting the real Stripe API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { CreateCheckoutDeps, StripeSessionResult, VerifyCallerResult } from "./handler.ts";

export function defaultDeps(): CreateCheckoutDeps {
  return {
    async verifyCaller(authHeader): Promise<VerifyCallerResult> {
      if (!authHeader?.startsWith("Bearer ")) return { ok: false, reason: "no_token" };
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) return { ok: false, reason: "invalid_token" };
      return {
        ok: true,
        userId: claimsData.claims.sub as string,
        email: claimsData.claims.email as string | undefined,
      };
    },

    async createStripeSession(params, stripeKey): Promise<StripeSessionResult> {
      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const session = await stripeRes.json();
      return { ok: stripeRes.ok, session };
    },

    log(step, data) {
      console.log(JSON.stringify({ fn: "create-checkout", step, ...data, t: new Date().toISOString() }));
    },
  };
}
