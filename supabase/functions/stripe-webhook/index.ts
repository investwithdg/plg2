import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

function log(step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      fn: "stripe-webhook",
      step,
      ...data,
      t: new Date().toISOString(),
    }),
  );
}

async function verifySignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = signature.split(",").reduce(
    (acc, part) => {
      const [k, v] = part.split("=");
      if (k === "t") acc.timestamp = v;
      if (k === "v1") acc.signatures.push(v);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] },
  );

  if (!parts.timestamp || parts.signatures.length === 0) return false;

  const payload = `${parts.timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return parts.signatures.includes(expected);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSignature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeSignature || !webhookSecret) {
    log("missing_config");
    return new Response("Missing signature or config", { status: 400 });
  }

  const body = await req.text();

  const valid = await verifySignature(body, stripeSignature, webhookSecret);
  if (!valid) {
    log("invalid_signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  log("event_received", { type: event.type, id: event.id });

  if (!RELEVANT_EVENTS.has(event.type)) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(supabase, event.data.object);
  } else if (event.type.startsWith("customer.subscription.")) {
    await handleSubscriptionChange(supabase, event.type, event.data.object);
  } else if (event.type === "invoice.payment_failed") {
    await handlePaymentFailed(supabase, event.data.object);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

async function sendLoopsEvent(
  loopsKey: string,
  email: string,
  eventName: string,
  properties?: Record<string, unknown>,
) {
  try {
    const res = await fetch("https://app.loops.so/api/v1/events/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loopsKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, eventName, ...properties }),
    });
    if (!res.ok) {
      const text = await res.text();
      log("loops_event_failed", { eventName, status: res.status, text });
    } else {
      log("loops_event_sent", { email, eventName });
    }
  } catch (err) {
    log("loops_event_error", { eventName, error: String(err) });
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
  session: Record<string, any>,
) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!userId || !subscriptionId) {
    log("checkout_missing_data", { userId, subscriptionId });
    return;
  }

  log("checkout_completed", { userId, customerId, subscriptionId });

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan: "pro",
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) log("checkout_upsert_error", { error: error.message });

  // Fire Loops 'upgraded' event so the Pro onboarding sequence starts
  const loopsKey = Deno.env.get("LOOPS_API_KEY");
  if (loopsKey) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (email) {
      // Upsert contact first in case they signed up via Google OAuth
      await fetch("https://app.loops.so/api/v1/contacts/upsert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${loopsKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, userGroup: "pro", source: "plg_signup" }),
      }).catch(() => {});
      await sendLoopsEvent(loopsKey, email, "upgraded");
    }
  }
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  subscription: Record<string, any>,
) {
  const subscriptionId = subscription.id;
  const customerId = subscription.customer;
  const status = subscription.status;
  const userId = subscription.metadata?.user_id;

  log("subscription_change", { eventType, subscriptionId, status });

  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const trialStart = subscription.trial_start
    ? new Date(subscription.trial_start * 1000).toISOString()
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const payload = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan: "pro",
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    trial_start: trialStart,
    trial_end: trialEnd,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .limit(1);

  if (!existing || existing.length === 0) {
    if (!userId) {
      log("subscription_not_found", { subscriptionId, customerId });
      return;
    }

    const { error } = await supabase.from("subscriptions").upsert(
      {
        ...payload,
        user_id: userId,
      },
      { onConflict: "stripe_subscription_id" },
    );

    if (error) log("subscription_insert_error", { error: error.message });
    return;
  }

  const { error } = await supabase
    .from("subscriptions")
    .update(payload)
    .eq("stripe_subscription_id", subscriptionId);

  if (error) log("subscription_update_error", { error: error.message });
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Record<string, any>,
) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  log("payment_failed", { subscriptionId });

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) log("payment_failed_update_error", { error: error.message });
}
