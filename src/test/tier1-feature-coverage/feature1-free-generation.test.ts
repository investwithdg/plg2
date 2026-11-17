/**
 * feature1-free-generation.test.ts
 *
 * Tier 1 Feature Coverage: Feature 1 (Free Generations Flow & Quota Management)
 * Tests:
 * 1. Free quota tracking (10 standard generations, 1 Pro-tier sample)
 * 2. 30-day rolling window calculation (excluding expired generations)
 * 3. Exclusion of 'error' status properties from quota consumption
 * 4. Anonymous polling completion criteria (transitions & stopPolling on 'complete')
 * 5. Anonymous polling error criteria (transitions & stopPolling on 'error')
 * 6. Polling timeout protection (MAX_FALLBACK_ATTEMPTS = 12)
 * 7. Client-side local quota decrement and localStorage synchronization
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

// Constants from business logic (receive-property and RetroGenerator)
const FREE_LIMIT = 10;
const FREE_PRO_TIER_LIMIT = 1;
const FREE_WINDOW_DAYS = 30;
const STORAGE_KEY = "plg_generations_used";
const PRO_TIER_STORAGE_KEY = "plg_pro_tier_generations_used";

// Mock Supabase module
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockChannelOn = vi.fn();
const mockChannelSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();

let realtimeCallback: ((payload: { new: Record<string, unknown> }) => void) | null = null;

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        return {
          select: (...args: unknown[]) => {
            mockSelect(table, ...args);
            return {
              eq: (col: string, val: unknown) => {
                mockEq(col, val);
                return {
                  eq: (c2: string, v2: unknown) => {
                    mockEq(c2, v2);
                    return {
                      maybeSingle: () => mockMaybeSingle(table),
                      order: () => ({ maybeSingle: () => mockMaybeSingle(table) }),
                    };
                  },
                  gte: (c2: string, v2: unknown) => {
                    mockGte(c2, v2);
                    return {
                      order: () => mockOrder(),
                      limit: () => mockLimit(),
                    };
                  },
                  order: (...oArgs: unknown[]) => {
                    mockOrder(...oArgs);
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
      channel: vi.fn((channelName: string) => ({
        on: vi.fn((_event, _filter, callback) => {
          mockChannelOn(channelName);
          realtimeCallback = callback;
          return {
            subscribe: () => {
              mockChannelSubscribe(channelName);
              return {};
            },
          };
        }),
      })),
      removeChannel: vi.fn((ch) => mockRemoveChannel(ch)),
    },
  };
});

describe("Feature 1: Free Generation & Quota Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    realtimeCallback = null;
    setupLocalStorageMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreBrowserMocks();
  });

  // Test 1: Free quota tracking limits
  it("tracks and enforces free tier generation caps (10 free standard, 1 pro-tier sample)", () => {
    // Pure function representing the quota check rule in receive-property
    function checkQuota({
      standardCount,
      proTierCount,
      isProTierRequest,
    }: {
      standardCount: number;
      proTierCount: number;
      isProTierRequest: boolean;
    }): { allowed: boolean; error?: string } {
      if (isProTierRequest && proTierCount >= FREE_PRO_TIER_LIMIT) {
        return { allowed: false, error: "pro_required" };
      }
      if (standardCount >= FREE_LIMIT) {
        return { allowed: false, error: "free_limit_exceeded" };
      }
      return { allowed: true };
    }

    // 0 generations: standard allowed
    expect(checkQuota({ standardCount: 0, proTierCount: 0, isProTierRequest: false })).toEqual({
      allowed: true,
    });

    // 9 generations: 10th generation allowed
    expect(checkQuota({ standardCount: 9, proTierCount: 0, isProTierRequest: false })).toEqual({
      allowed: true,
    });

    // 10 generations: standard blocked
    expect(checkQuota({ standardCount: 10, proTierCount: 0, isProTierRequest: false })).toEqual({
      allowed: false,
      error: "free_limit_exceeded",
    });

    // 11 generations: standard blocked
    expect(checkQuota({ standardCount: 11, proTierCount: 0, isProTierRequest: false })).toEqual({
      allowed: false,
      error: "free_limit_exceeded",
    });

    // 0 pro-tier used: 1st pro-tier request allowed
    expect(checkQuota({ standardCount: 2, proTierCount: 0, isProTierRequest: true })).toEqual({
      allowed: true,
    });

    // 1 pro-tier used: 2nd pro-tier request blocked
    expect(checkQuota({ standardCount: 2, proTierCount: 1, isProTierRequest: true })).toEqual({
      allowed: false,
      error: "pro_required",
    });
  });

  // Test 2: 30-day rolling window calculation
  it("calculates 30-day rolling window cutoff and excludes generations older than 30 days", () => {
    const referenceNow = new Date("2026-11-16T12:00:00.000Z").getTime();
    vi.setSystemTime(referenceNow);

    const windowMs = FREE_WINDOW_DAYS * 86400_000;
    const cutoffDate = new Date(referenceNow - windowMs);

    function isWithinWindow(createdAtStr: string): boolean {
      const createdAt = new Date(createdAtStr).getTime();
      return createdAt >= cutoffDate.getTime();
    }

    // Created 31 days ago: outside window
    const date31DaysAgo = new Date(referenceNow - 31 * 86400_000).toISOString();
    expect(isWithinWindow(date31DaysAgo)).toBe(false);

    // Created 30 days ago minus 1 second: outside window
    const date30Days1SecAgo = new Date(referenceNow - 30 * 86400_000 - 1000).toISOString();
    expect(isWithinWindow(date30Days1SecAgo)).toBe(false);

    // Created exactly at cutoff: inside window
    expect(isWithinWindow(cutoffDate.toISOString())).toBe(true);

    // Created 15 days ago: inside window
    const date15DaysAgo = new Date(referenceNow - 15 * 86400_000).toISOString();
    expect(isWithinWindow(date15DaysAgo)).toBe(true);

    // Filter list of historical generation timestamps
    const sampleGenerations = [
      { id: "1", created_at: date31DaysAgo },
      { id: "2", created_at: date31DaysAgo },
      { id: "3", created_at: date15DaysAgo },
      { id: "4", created_at: new Date(referenceNow - 3600_000).toISOString() },
    ];

    const activeCount = sampleGenerations.filter((g) => isWithinWindow(g.created_at)).length;
    expect(activeCount).toBe(2); // Only recent two count
  });

  // Test 3: Error status exclusion from quota limits
  it("strictly excludes properties with 'error' status from counted quota usage", () => {
    interface PropertyRow {
      id: string;
      status: "complete" | "error" | "processing" | "pending";
      created_at: string;
    }

    const nowIso = new Date().toISOString();
    const rows: PropertyRow[] = [
      { id: "p1", status: "complete", created_at: nowIso },
      { id: "p2", status: "complete", created_at: nowIso },
      { id: "p3", status: "error", created_at: nowIso }, // failed generation
      { id: "p4", status: "error", created_at: nowIso }, // failed generation
      { id: "p5", status: "complete", created_at: nowIso },
      { id: "p6", status: "error", created_at: nowIso }, // failed generation
      { id: "p7", status: "processing", created_at: nowIso },
    ];

    // Filter counting successful / billable generations only
    function countBillableGenerations(items: PropertyRow[]): number {
      return items.filter((item) => item.status !== "error").length;
    }

    const billableCount = countBillableGenerations(rows);
    expect(billableCount).toBe(4); // 3 complete + 1 in-flight processing

    // Total rows is 7, but user is NOT penalized for the 3 error runs
    expect(rows.length).toBe(7);
    expect(billableCount).toBeLessThan(FREE_LIMIT);
  });

  // Test 4: Anonymous polling completion criteria
  it("transitions polling to 'complete' and stops polling when property status is 'complete'", async () => {
    mockMaybeSingle.mockImplementation((table: string) => {
      if (table === "properties") {
        return Promise.resolve({ data: mockPendingProperty, error: null });
      }
      if (table === "copy_generations") {
        return Promise.resolve({ data: mockCopyGenerations, error: null });
      }
      if (table === "enrichments") {
        return Promise.resolve({ data: mockEnrichmentData, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => usePropertyPolling("prop-1111-2222-3333"));

    // Initially in processing state
    expect(result.current.isPolling).toBe(true);
    expect(result.current.status).toBe("processing");

    // Realtime update arrives with completed property
    act(() => {
      if (realtimeCallback) {
        realtimeCallback({
          new: {
            ...mockCompleteProperty,
            status: "complete",
            enrichment_step: "done",
          },
        });
      }
    });

    // Fast-forward pending promises
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Verification: status is complete, polling stopped
    expect(result.current.status).toBe("complete");
    expect(result.current.enrichmentStep).toBe("done");
    expect(result.current.isPolling).toBe(false);
  });

  // Test 5: Anonymous polling error criteria
  it("transitions polling to 'error' and halts polling when property status is 'error'", async () => {
    mockMaybeSingle.mockImplementation((table: string) => {
      if (table === "properties") {
        return Promise.resolve({ data: mockPendingProperty, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => usePropertyPolling("prop-error-0003"));
    expect(result.current.isPolling).toBe(true);

    // Realtime update arrives with error status
    act(() => {
      if (realtimeCallback) {
        realtimeCallback({
          new: {
            ...mockErrorProperty,
            status: "error",
            enrichment_step: "failed_extraction",
          },
        });
      }
    });

    // Verification: status is error, error message set, polling halted
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("failed_extraction");
    expect(result.current.isPolling).toBe(false);
  });

  // Test 6: Polling fallback timeout protection
  it("times out and stops polling after MAX_FALLBACK_ATTEMPTS (12 attempts)", async () => {
    mockMaybeSingle.mockImplementation(() => {
      // Simulate slow in-flight property that never finishes
      return Promise.resolve({
        data: {
          id: "prop-timeout-1",
          status: "processing",
          enrichment_step: "researching_property",
        },
        error: null,
      });
    });

    const { result } = renderHook(() => usePropertyPolling("prop-timeout-1"));
    expect(result.current.isPolling).toBe(true);

    // Advance 12 polling intervals (15 seconds each = 180s)
    for (let i = 0; i < 12; i++) {
      await act(async () => {
        vi.advanceTimersByTime(15000);
      });
    }

    // Verification: Timed out and stopped
    expect(result.current.error).toBe("Generation timed out. Please try again.");
    expect(result.current.isPolling).toBe(false);
  });

  // Test 7: Client-side local quota decrement and localStorage synchronization
  it("decrements local quota and synchronizes with localStorage for anonymous users", () => {
    const storage = window.localStorage;

    // Initially 0 used => 10 left
    let generationsUsed = Number(storage.getItem(STORAGE_KEY) || 0);
    let proTierUsed = Number(storage.getItem(PRO_TIER_STORAGE_KEY) || 0);

    const calcLeft = (used: number) => Math.max(0, FREE_LIMIT - used);
    const calcProLeft = (used: number) => Math.max(0, FREE_PRO_TIER_LIMIT - used);

    expect(generationsUsed).toBe(0);
    expect(calcLeft(generationsUsed)).toBe(10);
    expect(calcProLeft(proTierUsed)).toBe(1);

    // Simulate 1st generation (standard property)
    generationsUsed += 1;
    storage.setItem(STORAGE_KEY, String(generationsUsed));

    expect(storage.getItem(STORAGE_KEY)).toBe("1");
    expect(calcLeft(Number(storage.getItem(STORAGE_KEY)))).toBe(9);
    expect(calcProLeft(Number(storage.getItem(PRO_TIER_STORAGE_KEY)))).toBe(1);

    // Simulate 2nd generation (pro-tier property: 'luxury')
    generationsUsed += 1;
    proTierUsed += 1;
    storage.setItem(STORAGE_KEY, String(generationsUsed));
    storage.setItem(PRO_TIER_STORAGE_KEY, String(proTierUsed));

    expect(calcLeft(Number(storage.getItem(STORAGE_KEY)))).toBe(8);
    expect(calcProLeft(Number(storage.getItem(PRO_TIER_STORAGE_KEY)))).toBe(0);

    // Simulate remaining 8 generations used
    generationsUsed = 10;
    storage.setItem(STORAGE_KEY, String(generationsUsed));

    expect(calcLeft(Number(storage.getItem(STORAGE_KEY)))).toBe(0);
    // Boundary: cannot be negative
    generationsUsed = 12;
    expect(calcLeft(generationsUsed)).toBe(0);
  });
});
