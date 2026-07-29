import { assertEquals } from "./testAssert.ts";
import { isMcpEligiblePlan, resolvePlanTier } from "./planTier.ts";

Deno.test("resolvePlanTier: no rows -> free", () => {
  assertEquals(resolvePlanTier(null), "free");
  assertEquals(resolvePlanTier(undefined), "free");
  assertEquals(resolvePlanTier([]), "free");
});

Deno.test("resolvePlanTier: only counts a row with status 'active'", () => {
  assertEquals(resolvePlanTier([{ plan: "pro", status: "trialing" }]), "free");
  assertEquals(resolvePlanTier([{ plan: "pro", status: "canceled" }]), "free");
  assertEquals(resolvePlanTier([{ plan: "pro", status: "active" }]), "pro");
});

Deno.test("resolvePlanTier: elite beats pro when both are somehow present", () => {
  assertEquals(
    resolvePlanTier([
      { plan: "pro", status: "active" },
      { plan: "elite", status: "active" },
    ]),
    "elite",
  );
});

Deno.test("isMcpEligiblePlan: pro and elite are eligible, free is not", () => {
  assertEquals(isMcpEligiblePlan("pro"), true);
  assertEquals(isMcpEligiblePlan("elite"), true);
  assertEquals(isMcpEligiblePlan("free"), false);
  assertEquals(isMcpEligiblePlan(null), false);
  assertEquals(isMcpEligiblePlan(undefined), false);
  assertEquals(isMcpEligiblePlan("bogus"), false);
});
