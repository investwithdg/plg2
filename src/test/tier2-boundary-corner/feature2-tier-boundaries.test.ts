/**
 * feature2-tier-boundaries.test.ts
 *
 * Tier 2 Boundary & Corner Cases: Feature 2 (Pro Account Entitlements & Normalization Boundaries)
 *
 * Boundary Tests:
 * 1. Uppercase "PRO" normalization and entitlement resolution
 * 2. Whitespace padding (" pro ", "\n\tELITE \r") trimming and normalization
 * 3. Prefix matching ("pro_yearly", "pro_monthly", "pro-annual", "elite_monthly")
 * 4. Non-prefix occurrences like "PLG Pro" or "amateur_pro" correctly falling back to "free"
 * 5. Unknown/corrupted plan strings ("enterprise", "starter", numeric/object inputs) falling back to "free"
 * 6. Null, undefined, or missing user metadata handling
 * 7. Database network failure recovery preserving valid fallback without hook crash
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

describe("Feature 2: Pro Tier Normalization & Boundary Resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Uppercase "PRO"
  it("normalizes uppercase 'PRO' variants and grants full Pro user entitlement", async () => {
    expect(normalizePlanTier("PRO")).toBe("pro");
    expect(normalizePlanTier("ELITE")).toBe("elite");

    // Subscription row with uppercase plan string
    const row = { plan: "PRO", status: "active" };
    expect(isSubscriptionActive(row)).toBe(true);
    expect(resolveEffectivePlan([row])).toBe("pro");

    // Integration through usePlanTier hook
    mockLimit.mockResolvedValueOnce({
      data: [{ plan: "PRO", status: "active", created_at: "2026-11-15T00:00:00Z" }],
      error: null,
    });

    const user: User = {
      ...mockProUser,
      id: "user-uppercase-pro",
    };

    const { result } = renderHook(() => usePlanTier(user));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe("pro");
    expect(result.current.isProUser).toBe(true);
    expect(result.current.isEliteUser).toBe(false);
  });

  // Test 2: Whitespace padding
  it("trims and normalizes whitespace-padded plan strings (' pro ', '\\n\\tELITE \\r')", () => {
    expect(normalizePlanTier("  pro  ")).toBe("pro");
    expect(normalizePlanTier("\n\tpro\t\r")).toBe("pro");
    expect(normalizePlanTier("   elite   ")).toBe("elite");
    expect(normalizePlanTier("\r\n\t ELITE \n")).toBe("elite");
    expect(normalizePlanTier("   free   ")).toBe("free");

    // In effective plan resolution
    const paddedRows = [{ plan: "  PRO  ", status: "  active  " }];
    expect(resolveEffectivePlan(paddedRows)).toBe("pro");
  });

  // Test 3: Prefix matching
  it("resolves prefix variants ('pro_yearly', 'pro_monthly', 'pro-annual', 'elite_tier') to respective tiers", () => {
    const proPrefixVariants = [
      "pro_yearly",
      "pro_monthly",
      "pro-annual",
      "pro-monthly",
      "pro_custom_enterprise",
      "pro-trial-30d",
    ];

    for (const variant of proPrefixVariants) {
      expect(normalizePlanTier(variant)).toBe("pro");
    }

    const elitePrefixVariants = [
      "elite_yearly",
      "elite_monthly",
      "elite-pro-bundle",
      "elite_annual_sub",
    ];

    for (const variant of elitePrefixVariants) {
      expect(normalizePlanTier(variant)).toBe("elite");
    }
  });

  // Test 4: Non-prefix occurrences falling back to free
  it("rejects strings containing 'pro' as non-prefix ('PLG Pro', 'amateur_pro', 'non_pro') and falls back to free", () => {
    const nonPrefixProStrings = [
      "PLG Pro",
      "amateur_pro",
      "semi_pro",
      "not_a_pro",
      "my_pro_account",
      "x-pro",
    ];

    for (const str of nonPrefixProStrings) {
      expect(normalizePlanTier(str)).toBe("free");
    }

    // Resolves to free in effective plan
    const rows = nonPrefixProStrings.map((str) => ({ plan: str, status: "active" }));
    expect(resolveEffectivePlan(rows)).toBe("free");
  });

  // Test 5: Unknown/corrupt plan strings falling back to free
  it("safely falls back to 'free' when encountering unknown or corrupted plan types", () => {
    const corruptInputs = [
      "enterprise",
      "starter",
      "basic",
      "legacy_tier",
      "null",
      "undefined",
      "",
      "   ",
      12345,
      null,
      undefined,
      {},
      [],
      true,
      false,
    ];

    for (const input of corruptInputs) {
      expect(normalizePlanTier(input)).toBe("free");
    }

    expect(resolveEffectivePlan([{ plan: "garbage_val", status: "active" }])).toBe("free");
    expect(resolveEffectivePlan(null, "unknown_tier")).toBe("free");
  });

  // Test 6: Null or missing user metadata
  it("handles null or missing user metadata without throwing and defaults to free", async () => {
    mockLimit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    // User with null metadata objects
    const bareUser = {
      id: "user-bare-meta",
      user_metadata: null,
      app_metadata: null,
    } as unknown as User;

    const { result } = renderHook(() => usePlanTier(bareUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe("free");
    expect(result.current.isProUser).toBe(false);
    expect(result.current.isEliteUser).toBe(false);
  });

  // Test 7: Database network failure recovery
  it("recovers gracefully from database network failures or query rejections and preserves metadata fallback", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Simulate Supabase returning a network timeout error
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "504 Gateway Timeout: database cluster unreachable" },
    });

    const userWithProMeta: User = {
      id: "user-network-fail-pro",
      app_metadata: { plan: "pro_yearly" },
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
    } as User;

    const { result } = renderHook(() => usePlanTier(userWithProMeta));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Recovered using metadata fallback
    expect(result.current.plan).toBe("pro");
    expect(result.current.isProUser).toBe(true);

    // If query throws an unhandled rejection, try/catch catches it
    mockLimit.mockRejectedValueOnce(new Error("Connection terminated abruptly"));

    const { result: result2 } = renderHook(() => usePlanTier(userWithProMeta));

    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    expect(result2.current.plan).toBe("pro");
    expect(result2.current.isProUser).toBe(true);

    consoleSpy.mockRestore();
  });
});
