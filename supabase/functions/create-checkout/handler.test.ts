// Smoke tests for create-checkout. Stripe and Supabase auth are never called for
// real — handleRequest() takes injectable deps so this tests the request/response
// contract (auth gate, missing-config fail-closed behavior, session-shape on
// success) without touching a live external service.
import { assertEquals } from "../_shared/testAssert.ts";
import { handleRequest, type CreateCheckoutDeps } from "./handler.ts";

function fakeDeps(overrides: Partial<CreateCheckoutDeps> = {}): CreateCheckoutDeps {
  return {
    verifyCaller: async () => ({ ok: true, userId: "user-1", email: "agent@example.com" }),
    createStripeSession: async () => ({ ok: true, session: { id: "cs_test_1", url: "https://checkout.stripe.com/cs_test_1" } }),
    log: () => {},
    ...overrides,
  };
}

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const envBackup = {
  STRIPE_SECRET_KEY: Deno.env.get("STRIPE_SECRET_KEY"),
  STRIPE_PRICE_MONTHLY: Deno.env.get("STRIPE_PRICE_MONTHLY"),
  STRIPE_PRICE_ANNUAL: Deno.env.get("STRIPE_PRICE_ANNUAL"),
};
function setStripeEnv() {
  Deno.env.set("STRIPE_SECRET_KEY", "sk_test_fake");
  Deno.env.set("STRIPE_PRICE_MONTHLY", "price_monthly_fake");
  Deno.env.set("STRIPE_PRICE_ANNUAL", "price_annual_fake");
}
function restoreEnv() {
  for (const [k, v] of Object.entries(envBackup)) {
    if (v === undefined) Deno.env.delete(k);
    else Deno.env.set(k, v);
  }
}

Deno.test("OPTIONS preflight returns ok without touching auth or Stripe", async () => {
  const res = await handleRequest(new Request("https://example.com/create-checkout", { method: "OPTIONS" }), fakeDeps());
  assertEquals(res.status, 200);
});

Deno.test("missing Authorization header is rejected before any Stripe call", async () => {
  let stripeCalled = false;
  const deps = fakeDeps({
    verifyCaller: async () => ({ ok: false, reason: "no_token" }),
    createStripeSession: async () => {
      stripeCalled = true;
      return { ok: true, session: {} };
    },
  });
  const res = await handleRequest(req({ interval: "month" }), deps);
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "Authentication required");
  assertEquals(stripeCalled, false);
});

Deno.test("invalid JWT is rejected with a distinct message", async () => {
  const deps = fakeDeps({ verifyCaller: async () => ({ ok: false, reason: "invalid_token" }) });
  const res = await handleRequest(req({ interval: "month" }, { Authorization: "Bearer bad" }), deps);
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "Invalid session");
});

Deno.test("missing STRIPE_SECRET_KEY fails closed with an explicit error, not mock output", async () => {
  restoreEnv(); // ensure no Stripe key is set
  const res = await handleRequest(req({ interval: "month" }, { Authorization: "Bearer good" }), fakeDeps());
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "Payment not configured");
});

Deno.test("missing price id for the requested interval fails closed", async () => {
  Deno.env.set("STRIPE_SECRET_KEY", "sk_test_fake");
  Deno.env.delete("STRIPE_PRICE_MONTHLY");
  Deno.env.delete("STRIPE_PRICE_ANNUAL");
  const res = await handleRequest(req({ interval: "month" }, { Authorization: "Bearer good" }), fakeDeps());
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "Payment plan not configured");
  restoreEnv();
});

Deno.test("successful checkout returns the Stripe session url and forwards user identity", async () => {
  setStripeEnv();
  let capturedParams: URLSearchParams | undefined;
  const deps = fakeDeps({
    createStripeSession: async (params) => {
      capturedParams = params;
      return { ok: true, session: { id: "cs_test_1", url: "https://checkout.stripe.com/cs_test_1" } };
    },
  });
  const res = await handleRequest(req({ interval: "year" }, { Authorization: "Bearer good" }), deps);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.url, "https://checkout.stripe.com/cs_test_1");
  assertEquals(capturedParams?.get("client_reference_id"), "user-1");
  assertEquals(capturedParams?.get("customer_email"), "agent@example.com");
  assertEquals(capturedParams?.get("line_items[0][price]"), "price_annual_fake");
  restoreEnv();
});

Deno.test("a failed Stripe session creation surfaces as a 500, not a silent 200", async () => {
  setStripeEnv();
  const deps = fakeDeps({
    createStripeSession: async () => ({ ok: false, session: { error: { message: "card declined or whatever" } } }),
  });
  const res = await handleRequest(req({ interval: "month" }, { Authorization: "Bearer good" }), deps);
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "Failed to create checkout session");
  restoreEnv();
});
