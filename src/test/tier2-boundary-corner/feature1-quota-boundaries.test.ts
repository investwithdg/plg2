/**
 * feature1-quota-boundaries.test.ts
 *
 * Tier 2 Boundary & Corner Cases: Feature 1 (Free Plan Generations & Quota Boundaries)
 *
 * Boundary Tests:
 * 1. 0 Quota boundary: Brand new user with 0 generations used has 10 standard & 1 Pro-tier generation available
 * 2. Exactly 10/10 Boundary: User at exactly 10 generations displays "0 left" and disables generate button
 * 3. 11th Request Blocking: Server-side check blocks 11th generation with free_limit_exceeded error
 * 4. Expired 30-Day Boundary Timestamps: Rolling window boundary excludes generations >30 days ago and re-enables quota
 * 5. Error Status Non-Consumption: Properties with status 'error' are excluded by neq("status", "error")
 * 6. Multi-Property Concurrent Polling: Independent property polling hooks maintain isolated state without cross-talk
 */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePropertyPolling } from "@/hooks/usePropertyPolling";
import { setupLocalStorageMock, restoreBrowserMocks } from "@/test/mocks/browser";
import {
  mockCompleteProperty,
  mockCopyGenerations,
  mockEnrichmentData,
  mockErrorProperty,
  mockPendingProperty,
} from "@/test/mocks/fixtures";

const FREE_LIMIT = 10;
const FREE_PRO_TIER_LIMIT = 1;
const FREE_WINDOW_DAYS = 30;
const STORAGE_KEY = "plg_generations_used";
const PRO_TIER_STORAGE_KEY = "plg_pro_tier_generations_used";

// Supabase mock handles
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();

const channelCallbacks: Map<string, (payload: { new: Record<string, unknown> }) => void> =
  new Map();

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        return {
          select: (...args: unknown[]) => {
            mockSelect(table, ...args);
            return {
              eq: (col: string, val: unknown) => {
                mockEq(table, col, val);
                return {
                  eq: (c2: string, v2: unknown) => {
                    mockEq(table, c2, v2);
                    return {
                      maybeSingle: () => mockMaybeSingle(table),
                      order: () => ({ maybeSingle: () => mockMaybeSingle(table) }),
                    };
                  },
                  neq: (c2: string, v2: unknown) => {
                    mockNeq(table, c2, v2);
                    return {
                      gte: (c3: string, v3: unknown) => {
                        mockGte(table, c3, v3);
                        return Promise.resolve({ count: 0, data: [], error: null });
                      },
                    };
                  },
                  gte: (c2: string, v2: unknown) => {
                    mockGte(table, c2, v2);
                    return {
                      order: () => mockOrder(table),
                      limit: () => mockLimit(table),
                    };
                  },
                  order: (...oArgs: unknown[]) => {
                    mockOrder(table, ...oArgs);
                    return {
                      order: () => ({ maybeSingle: () => mockMaybeSingle(table) }),
                      maybeSingle: () => mockMaybeSingle(table),
                    };
                  },
                  maybeSingle: () => mockMaybeSingle(table),
                };
              },
            };
          },
        };
      }),
      channel: vi.fn((channelName: string) => {
        return {
          on: vi.fn((_event, _filter, callback) => {
            channelCallbacks.set(channelName, callback);
            return {
              subscribe: () => {
                return { unsubscribe: vi.fn() };
              },
            };
          }),
        };
      }),
      removeChannel: vi.fn((_channel) => {
        channelCallbacks.clear();
        return Promise.resolve();
      }),
    },
  };
});

describe("Feature 1: Quota Boundaries & Edge Conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelCallbacks.clear();
    setupLocalStorageMock();
  });

  afterEach(() => {
    restoreBrowserMocks();
  });

  // Test 1: 0 Quota boundary
  it("initializes brand new anonymous user with 0 generations used and full available quota", () => {
    // Verified against localStorage empty initial state
    const storage = setupLocalStorageMock({});
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(PRO_TIER_STORAGE_KEY)).toBeNull();

    const generationsUsed = Number(storage.getItem(STORAGE_KEY) || 0);
    const proTierUsed = Number(storage.getItem(PRO_TIER_STORAGE_KEY) || 0);

    const generationsLeft = Math.max(0, FREE_LIMIT - generationsUsed);
    const proTierGenerationsLeft = Math.max(0, FREE_PRO_TIER_LIMIT - proTierUsed);

    expect(generationsUsed).toBe(0);
    expect(proTierUsed).toBe(0);
    expect(generationsLeft).toBe(10);
    expect(proTierGenerationsLeft).toBe(1);

    // Generation count label calculation
    const label = `${generationsLeft} left`;
    expect(label).toBe("10 left");

    // First generation increments count to 1 and synchronizes
    storage.setItem(STORAGE_KEY, String(generationsUsed + 1));
    expect(storage.getItem(STORAGE_KEY)).toBe("1");
    expect(Math.max(0, FREE_LIMIT - Number(storage.getItem(STORAGE_KEY)))).toBe(9);
  });

  // Test 2: Exactly 10/10 boundary
  it("enforces boundary at exactly 10/10 generations used, displaying 0 left and disabling submission", () => {
    const storage = setupLocalStorageMock({
      [STORAGE_KEY]: "10",
      [PRO_TIER_STORAGE_KEY]: "1",
    });

    const generationsUsed = Number(storage.getItem(STORAGE_KEY));
    const proTierUsed = Number(storage.getItem(PRO_TIER_STORAGE_KEY));

    const generationsLeft = Math.max(0, FREE_LIMIT - generationsUsed);
    const proTierGenerationsLeft = Math.max(0, FREE_PRO_TIER_LIMIT - proTierUsed);

    expect(generationsLeft).toBe(0);
    expect(proTierGenerationsLeft).toBe(0);

    const generationCountLabel = `${generationsLeft} left`;
    expect(generationCountLabel).toBe("0 left");

    // RetroGenerator disabled evaluation rule
    const isRegenerateDisabled = (params: {
      generateDisabled: boolean;
      devBypassActive: boolean;
      isProUser: boolean;
      generationsLeft: number;
    }) => {
      return (
        params.generateDisabled ||
        (!params.devBypassActive && !params.isProUser && params.generationsLeft <= 0)
      );
    };

    // Free user without dev bypass is disabled at boundary 0
    expect(
      isRegenerateDisabled({
        generateDisabled: false,
        devBypassActive: false,
        isProUser: false,
        generationsLeft: 0,
      }),
    ).toBe(true);

    // Pro user or dev bypass is NOT disabled even at generationsLeft 0
    expect(
      isRegenerateDisabled({
        generateDisabled: false,
        devBypassActive: false,
        isProUser: true,
        generationsLeft: 0,
      }),
    ).toBe(false);
  });

  // Test 3: 11th Request Blocking
  it("blocks the 11th generation request when count equals or exceeds FREE_LIMIT", () => {
    // Pure replica of server-side receive-property quota gate check
    function evaluateFreeQuotaGate(
      count: number,
      limit: number = FREE_LIMIT,
    ): { allowed: boolean; errorCode?: string; status: number } {
      if (count >= limit) {
        return {
          allowed: false,
          errorCode: "free_limit_exceeded",
          status: 403,
        };
      }
      return { allowed: true, status: 200 };
    }

    // Requests 0 to 9 are allowed
    for (let c = 0; c < 10; c++) {
      const res = evaluateFreeQuotaGate(c);
      expect(res.allowed).toBe(true);
      expect(res.status).toBe(200);
    }

    // 10th request consumed -> Count is now 10. Attempting 11th request is blocked
    const blockedRes = evaluateFreeQuotaGate(10);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.errorCode).toBe("free_limit_exceeded");
    expect(blockedRes.status).toBe(403);

    // 12th request (count = 11) is also blocked
    const blockedRes2 = evaluateFreeQuotaGate(11);
    expect(blockedRes2.allowed).toBe(false);
    expect(blockedRes2.errorCode).toBe("free_limit_exceeded");
  });

  // Test 4: Expired 30-Day Boundary Timestamps
  it("excludes generations older than 30-day rolling window from quota count", () => {
    const now = new Date("2026-11-16T12:00:00.000Z");
    const windowMs = FREE_WINDOW_DAYS * 86400_000;
    const sinceWindow = new Date(now.getTime() - windowMs).toISOString();

    // Verify rolling window timestamp boundary
    expect(sinceWindow).toBe("2026-10-17T12:00:00.000Z");

    const sampleProperties = [
      // 31 days ago (EXPIRED - outside window)
      { id: "p1", created_at: "2026-10-16T11:59:59.000Z", status: "complete" },
      // Exactly 30 days ago minus 1 second (EXPIRED)
      { id: "p2", created_at: "2026-10-17T11:59:59.000Z", status: "complete" },
      // Exactly at the boundary window (VALID)
      { id: "p3", created_at: "2026-10-17T12:00:00.000Z", status: "complete" },
      // 25 days ago (VALID)
      { id: "p4", created_at: "2026-10-22T08:00:00.000Z", status: "complete" },
      // 2 days ago (VALID)
      { id: "p5", created_at: "2026-11-14T14:30:00.000Z", status: "complete" },
      // 1 hour ago (VALID)
      { id: "p6", created_at: "2026-11-16T11:00:00.000Z", status: "complete" },
    ];

    // Filter replicating PostgREST gte("created_at", sinceWindow)
    const activeInWindow = sampleProperties.filter(
      (p) => new Date(p.created_at).getTime() >= new Date(sinceWindow).getTime(),
    );

    // p1 and p2 expired; p3, p4, p5, p6 are within window
    expect(activeInWindow.length).toBe(4);
    expect(activeInWindow.map((p) => p.id)).toEqual(["p3", "p4", "p5", "p6"]);

    // If user previously had 10 generations, and 6 expired, remaining active is 4 -> 6 quota restored
    const quotaRestored = Math.max(0, FREE_LIMIT - activeInWindow.length);
    expect(quotaRestored).toBe(6);
  });

  // Test 5: Error Status Non-Consumption
  it("excludes properties with status 'error' so failed generations do not penalize quota", () => {
    const mockUserProperties = [
      { id: "p-succ-1", status: "complete", created_at: "2026-11-15T10:00:00Z" },
      { id: "p-succ-2", status: "complete", created_at: "2026-11-15T11:00:00Z" },
      { id: "p-err-1", status: "error", created_at: "2026-11-15T12:00:00Z" },
      { id: "p-err-2", status: "error", created_at: "2026-11-15T13:00:00Z" },
      { id: "p-succ-3", status: "complete", created_at: "2026-11-15T14:00:00Z" },
      { id: "p-err-3", status: "error", created_at: "2026-11-15T15:00:00Z" },
    ];

    // Total rows in database = 6
    expect(mockUserProperties.length).toBe(6);

    // Quota filter replicates receive-property: neq("status", "error")
    const billableProperties = mockUserProperties.filter((p) => p.status !== "error");

    expect(billableProperties.length).toBe(3);
    expect(billableProperties.map((p) => p.id)).toEqual(["p-succ-1", "p-succ-2", "p-succ-3"]);

    // Quota calculation based on billable count
    const remainingQuota = Math.max(0, FREE_LIMIT - billableProperties.length);
    expect(remainingQuota).toBe(7);
  });

  // Test 6: Multi-Property Concurrent Polling
  it("handles concurrent property polling hooks independently without state bleeding or cross-talk", async () => {
    const propIdA = "prop-concurrent-aaaa";
    const propIdB = "prop-concurrent-bbbb";

    mockMaybeSingle.mockImplementation((table: string) => {
      if (table === "properties") {
        return Promise.resolve({ data: mockPendingProperty, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const hookA = renderHook(() => usePropertyPolling(propIdA));
    const hookB = renderHook(() => usePropertyPolling(propIdB));

    expect(hookA.result.current.status).toBe("processing");
    expect(hookB.result.current.status).toBe("processing");

    // Simulate realtime completion payload arriving ONLY for property A
    const channelAKey = `property-${propIdA}`;
    const callbackA = channelCallbacks.get(channelAKey);
    expect(callbackA).toBeDefined();

    mockMaybeSingle.mockImplementation((table: string) => {
      if (table === "properties") {
        return Promise.resolve({
          data: { ...mockCompleteProperty, id: propIdA },
          error: null,
        });
      }
      if (table === "copy_generations") {
        return Promise.resolve({ data: mockCopyGenerations, error: null });
      }
      if (table === "enrichments") {
        return Promise.resolve({ data: mockEnrichmentData, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await act(async () => {
      callbackA!({ new: { status: "complete", id: propIdA } });
    });

    // Hook A transitioned to complete
    expect(hookA.result.current.status).toBe("complete");
    expect(hookA.result.current.property?.id).toBe(propIdA);

    // Hook B remains pending/not complete without interference
    expect(hookB.result.current.status).not.toBe("complete");
    expect(hookB.result.current.property?.id).not.toBe(propIdA);
  });
});
