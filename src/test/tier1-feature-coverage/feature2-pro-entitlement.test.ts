/**
 * feature2-pro-entitlement.test.ts
 *
 * Tier 1 Feature Coverage: Feature 2 (Pro Account Entitlements & Normalization)
 * Tests:
 * 1. Plan tier string normalization (case-insensitivity, trim, prefixes: "pro", "PRO", "Pro", "pro_annual", "elite")
 * 2. Subscription active status resolution (active, trialing, unexpired period-end grace)
 * 3. Precedence & multi-tier resolution (Elite > Pro > Free)
 * 4. User metadata fallback when subscription table has no active rows or query fails
 * 5. usePlanTier hook interface contract ({ plan, loading, isLoading, isProUser, isEliteUser })
 * 6. Case-insensitive database row resolution in usePlanTier hook
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  usePlanTier,
  normalizePlanTier,
  isSubscriptionActive,
  resolveEffectivePlan,
} from "@/hooks/usePlanTier";
import {
  mockFreeUser,
  mockProUser,
  mockEliteUser,
  mockActiveProSubscription,
  mockActiveEliteSubscription,
  mockCanceledSubscription,
} from "@/test/mocks/fixtures";
import type { User } from "@supabase/supabase-js";

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (col: string, val: unknown) => {
            mockEq(col, val);
            return {
              order: (...oArgs: unknown[]) => {
                mockOrder(...oArgs);
                return {
                  limit: (...lArgs: unknown[]) => mockLimit(...lArgs),
                };
              },
            };
          },
        };
      },
    })),
  },
}));

describe("Feature 2: Pro Entitlement Resolution & Normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: String normalization & case insensitivity
  it("normalizes diverse plan string variants (pro, PRO, Pro, pro_annual, elite, whitespace) to canonical tiers", () => {
    // Pro variants
    expect(normalizePlanTier("pro")).toBe("pro");
    expect(normalizePlanTier("PRO")).toBe("pro");
    expect(normalizePlanTier("Pro")).toBe("pro");
    expect(normalizePlanTier("PrO")).toBe("pro");
    expect(normalizePlanTier("  pro  ")).toBe("pro");
    expect(normalizePlanTier("\tPRO\n")).toBe("pro");
    expect(normalizePlanTier("pro_annual")).toBe("pro");
    expect(normalizePlanTier("pro_monthly")).toBe("pro");
    expect(normalizePlanTier("pro-yearly")).toBe("pro");

    // Elite variants
    expect(normalizePlanTier("elite")).toBe("elite");
    expect(normalizePlanTier("ELITE")).toBe("elite");
    expect(normalizePlanTier("Elite")).toBe("elite");
    expect(normalizePlanTier("  elite_annual ")).toBe("elite");
    expect(normalizePlanTier("elite_monthly")).toBe("elite");

    // Free / Unknown / Invalid fallbacks
    expect(normalizePlanTier("free")).toBe("free");
    expect(normalizePlanTier("FREE")).toBe("free");
    expect(normalizePlanTier("Free")).toBe("free");
    expect(normalizePlanTier("")).toBe("free");
    expect(normalizePlanTier("   ")).toBe("free");
    expect(normalizePlanTier(null)).toBe("free");
    expect(normalizePlanTier(undefined)).toBe("free");
    expect(normalizePlanTier(12345)).toBe("free");
    expect(normalizePlanTier({ plan: "pro" })).toBe("free");
    expect(normalizePlanTier("starter")).toBe("free");
    expect(normalizePlanTier("unknown_tier")).toBe("free");
  });

  // Test 2: Active subscription status determination
  it("determines active entitlement from status and unexpired billing periods", () => {
    const now = new Date("2026-11-16T12:00:00.000Z").getTime();
    const futureDate = new Date(now + 7 * 86400_000).toISOString(); // 7 days in future
    const pastDate = new Date(now - 2 * 86400_000).toISOString(); // 2 days in past

    // Status 'active' or 'trialing'
    expect(isSubscriptionActive({ status: "active" }, now)).toBe(true);
    expect(isSubscriptionActive({ status: "ACTIVE" }, now)).toBe(true);
    expect(isSubscriptionActive({ status: "trialing" }, now)).toBe(true);

    // Canceled but current_period_end is in the future (grace period / paid until cycle ends)
    expect(isSubscriptionActive({ status: "canceled", current_period_end: futureDate }, now)).toBe(
      true,
    );

    // Canceled and current_period_end is in the past (expired)
    expect(isSubscriptionActive({ status: "canceled", current_period_end: pastDate }, now)).toBe(
      false,
    );

    // Null/undefined inputs
    expect(isSubscriptionActive(null, now)).toBe(false);
    expect(isSubscriptionActive(undefined, now)).toBe(false);
    expect(isSubscriptionActive({ status: "incomplete" }, now)).toBe(false);
  });

  // Test 3: Multi-row precedence (Elite > Pro > Free)
  it("prioritizes Elite entitlement over Pro when multiple active subscription rows exist", () => {
    // Both elite and pro active rows present
    const rows = [
      { plan: "pro", status: "active" },
      { plan: "elite", status: "active" },
    ];
    expect(resolveEffectivePlan(rows)).toBe("elite");

    // Pro active row present
    const proOnlyRows = [
      { plan: "pro_annual", status: "active" },
      { plan: "free", status: "active" },
    ];
    expect(resolveEffectivePlan(proOnlyRows)).toBe("pro");

    // Inactive pro row + inactive elite row
    const inactiveRows = [
      { plan: "pro", status: "canceled" },
      { plan: "elite", status: "incomplete" },
    ];
    expect(resolveEffectivePlan(inactiveRows)).toBe("free");
  });

  // Test 4: Metadata fallback when subscription table is empty or query fails
  it("falls back to user_metadata or app_metadata when no active subscription row exists", () => {
    // Empty subscription rows with metaPlan "pro"
    expect(resolveEffectivePlan([], "pro")).toBe("pro");
    expect(resolveEffectivePlan([], "PRO")).toBe("pro");
    expect(resolveEffectivePlan([], "elite")).toBe("elite");

    // Null subscription rows with metaPlan "pro_annual"
    expect(resolveEffectivePlan(null, "pro_annual")).toBe("pro");

    // Active subscription row in DB overrides stale metadata
    const activeProRow = [{ plan: "pro", status: "active" }];
    expect(resolveEffectivePlan(activeProRow, "free")).toBe("pro");

    // No rows and no metadata plan defaults safely to "free"
    expect(resolveEffectivePlan([], null)).toBe("free");
    expect(resolveEffectivePlan([], "")).toBe("free");
  });

  // Test 5: usePlanTier hook interface contract
  it("satisfies the interface contract with plan, loading, isLoading, isProUser, and isEliteUser", async () => {
    // Case A: Unauthenticated user
    const { result: unauthResult } = renderHook(() => usePlanTier(null));
    expect(unauthResult.current).toEqual({
      plan: "free",
      loading: false,
      isLoading: false,
      isProUser: false,
      isEliteUser: false,
    });

    // Case B: Authenticated Pro user
    mockLimit.mockResolvedValueOnce({
      data: [mockActiveProSubscription],
      error: null,
    });

    const { result: proResult } = renderHook(() => usePlanTier(mockProUser));
    expect(proResult.current.loading).toBe(true);

    await waitFor(() => {
      expect(proResult.current.loading).toBe(false);
    });

    expect(proResult.current.plan).toBe("pro");
    expect(proResult.current.isProUser).toBe(true);
    expect(proResult.current.isEliteUser).toBe(false);
    expect(proResult.current.isLoading).toBe(false);

    // Case C: Authenticated Elite user
    mockLimit.mockResolvedValueOnce({
      data: [mockActiveEliteSubscription],
      error: null,
    });

    const { result: eliteResult } = renderHook(() => usePlanTier(mockEliteUser));
    await waitFor(() => {
      expect(eliteResult.current.loading).toBe(false);
    });

    expect(eliteResult.current.plan).toBe("elite");
    expect(eliteResult.current.isProUser).toBe(true);
    expect(eliteResult.current.isEliteUser).toBe(true);
  });

  // Test 6: Case-insensitive database row resolution in usePlanTier hook
  it("resolves uppercase 'PRO' and prefix 'pro_annual' database rows to active Pro entitlement in hook", async () => {
    const userWithUppercaseDbRow: User = {
      id: "user-uppercase-db",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00.000Z",
    } as User;

    mockLimit.mockResolvedValueOnce({
      data: [{ plan: "PRO", status: "active", created_at: "2026-01-01T00:00:00.000Z" }],
      error: null,
    });

    const { result } = renderHook(() => usePlanTier(userWithUppercaseDbRow));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe("pro");
    expect(result.current.isProUser).toBe(true);
  });

  // Test 7: Graceful error recovery with metadata fallback when database query throws
  it("recovers gracefully and applies metadata fallback when database query returns error", async () => {
    const userWithMetaFallback: User = {
      id: "user-meta-fallback",
      app_metadata: { plan: "pro" },
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00.000Z",
    } as User;

    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "connection timeout" },
    });

    const { result } = renderHook(() => usePlanTier(userWithMetaFallback));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe("pro");
    expect(result.current.isProUser).toBe(true);
  });
});
