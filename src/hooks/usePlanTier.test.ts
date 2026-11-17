import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import {
  normalizePlanTier,
  isSubscriptionActive,
  resolveEffectivePlan,
  usePlanTier,
} from "./usePlanTier";

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder.mockReturnValue({
            limit: mockLimit,
          }),
        }),
      }),
    })),
  },
}));

describe("usePlanTier helpers", () => {
  describe("normalizePlanTier", () => {
    it("handles exact lowercase strings", () => {
      expect(normalizePlanTier("free")).toBe("free");
      expect(normalizePlanTier("pro")).toBe("pro");
      expect(normalizePlanTier("elite")).toBe("elite");
    });

    it("handles uppercase and mixed case strings", () => {
      expect(normalizePlanTier("PRO")).toBe("pro");
      expect(normalizePlanTier("Pro")).toBe("pro");
      expect(normalizePlanTier("ELITE")).toBe("elite");
      expect(normalizePlanTier("Elite")).toBe("elite");
      expect(normalizePlanTier("FREE")).toBe("free");
    });

    it("handles plan names with suffixes (monthly, annual, tier)", () => {
      expect(normalizePlanTier("pro_monthly")).toBe("pro");
      expect(normalizePlanTier("pro_annual")).toBe("pro");
      expect(normalizePlanTier("pro-tier")).toBe("pro");
      expect(normalizePlanTier("elite_monthly")).toBe("elite");
      expect(normalizePlanTier("elite_annual")).toBe("elite");
      expect(normalizePlanTier("elite-unlimited")).toBe("elite");
    });

    it("handles whitespace padding", () => {
      expect(normalizePlanTier("  pro  ")).toBe("pro");
      expect(normalizePlanTier("\tElite\n")).toBe("elite");
    });

    it("falls back to free for null, undefined, and unrecognized strings", () => {
      expect(normalizePlanTier(null)).toBe("free");
      expect(normalizePlanTier(undefined)).toBe("free");
      expect(normalizePlanTier("")).toBe("free");
      expect(normalizePlanTier("standard")).toBe("free");
      expect(normalizePlanTier(123)).toBe("free");
    });
  });

  describe("isSubscriptionActive", () => {
    const fixedNow = new Date("2026-11-16T12:00:00Z").getTime();

    it("considers active and trialing subscriptions active regardless of dates", () => {
      expect(isSubscriptionActive({ status: "active" }, fixedNow)).toBe(true);
      expect(isSubscriptionActive({ status: "trialing" }, fixedNow)).toBe(true);
      expect(isSubscriptionActive({ status: " ACTIVE " }, fixedNow)).toBe(true);
    });

    it("considers canceled subscription active if current_period_end is in the future", () => {
      expect(
        isSubscriptionActive(
          {
            status: "canceled",
            current_period_end: "2026-11-20T12:00:00Z",
          },
          fixedNow,
        ),
      ).toBe(true);
    });

    it("considers canceled subscription inactive if current_period_end has expired", () => {
      expect(
        isSubscriptionActive(
          {
            status: "canceled",
            current_period_end: "2026-11-10T12:00:00Z",
          },
          fixedNow,
        ),
      ).toBe(false);
    });

    it("returns false for null/empty status without future period end", () => {
      expect(isSubscriptionActive(null, fixedNow)).toBe(false);
      expect(isSubscriptionActive({ status: "incomplete" }, fixedNow)).toBe(false);
    });
  });

  describe("resolveEffectivePlan", () => {
    const fixedNow = new Date("2026-11-16T12:00:00Z").getTime();

    it("resolves active pro row", () => {
      expect(
        resolveEffectivePlan([{ plan: "pro_monthly", status: "active" }], null, fixedNow),
      ).toBe("pro");
    });

    it("resolves active elite row", () => {
      expect(
        resolveEffectivePlan([{ plan: "elite_annual", status: "active" }], null, fixedNow),
      ).toBe("elite");
    });

    it("gives elite precedence over pro when both are active", () => {
      expect(
        resolveEffectivePlan(
          [
            { plan: "pro", status: "active" },
            { plan: "elite", status: "active" },
          ],
          null,
          fixedNow,
        ),
      ).toBe("elite");
    });

    it("resolves canceled row with future period end", () => {
      expect(
        resolveEffectivePlan(
          [{ plan: "Pro", status: "canceled", current_period_end: "2026-11-30T00:00:00Z" }],
          null,
          fixedNow,
        ),
      ).toBe("pro");
    });

    it("falls back to metadata plan when no active DB rows exist", () => {
      expect(resolveEffectivePlan([], "Pro", fixedNow)).toBe("pro");
      expect(resolveEffectivePlan(null, "elite_monthly", fixedNow)).toBe("elite");
    });

    it("falls back to free when neither DB nor metadata is active", () => {
      expect(resolveEffectivePlan([], null, fixedNow)).toBe("free");
      expect(
        resolveEffectivePlan(
          [{ plan: "pro", status: "canceled", current_period_end: "2026-11-01T00:00:00Z" }],
          null,
          fixedNow,
        ),
      ).toBe("free");
    });
  });
});

describe("usePlanTier hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns free plan immediately when user is null", () => {
    const { result } = renderHook(() => usePlanTier(null));
    expect(result.current.plan).toBe("free");
    expect(result.current.loading).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isProUser).toBe(false);
    expect(result.current.isEliteUser).toBe(false);
  });

  it("resolves pro plan from database row", async () => {
    mockLimit.mockResolvedValueOnce({
      data: [{ plan: "pro_monthly", status: "active" }],
      error: null,
    });

    const user = { id: "user_pro_123", app_metadata: {}, user_metadata: {} } as unknown as User;
    const { result } = renderHook(() => usePlanTier(user));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe("pro");
    expect(result.current.isProUser).toBe(true);
    expect(result.current.isEliteUser).toBe(false);
  });

  it("resolves elite plan with elite precedence", async () => {
    mockLimit.mockResolvedValueOnce({
      data: [
        { plan: "elite", status: "active" },
        { plan: "pro", status: "active" },
      ],
      error: null,
    });

    const user = { id: "user_elite_456", app_metadata: {}, user_metadata: {} } as unknown as User;
    const { result } = renderHook(() => usePlanTier(user));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe("elite");
    expect(result.current.isProUser).toBe(true);
    expect(result.current.isEliteUser).toBe(true);
  });

  it("falls back to metadata plan when query returns an error", async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "database timeout" },
    });

    const user = {
      id: "user_meta_pro",
      app_metadata: { plan: "Pro" },
      user_metadata: {},
    } as unknown as User;
    const { result } = renderHook(() => usePlanTier(user));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe("pro");
    expect(result.current.isProUser).toBe(true);
  });
});
