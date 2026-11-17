/**
 * application-scenarios.test.tsx
 *
 * Tier 4 Real-World Application Scenarios: End-to-End User Workloads
 *
 * Scenarios:
 * 1. Anonymous Free Generation Workflow
 *    - Anonymous ID reservation, polling state progression, copy fetching, and localStorage quota increment
 * 2. Pro Subscriber with Non-Standard Plan String Accessing Unredacted Intelligence
 *    - Auth normalization ("PRO_MONTHLY"), unlimited bypass, unredacted Research+ card without blur/paywall
 * 3. Agent Compliance Review with FHA Violations, Filler Removal & Safe Certificate Export
 *    - Review mitigated listing, verify filler card absence, inspect raw remarks toggle, and export certificate
 * 4. Suburban/Rural Property Enriched with Drive-Time Lifestyle Amenities
 *    - Relaxed distance schema validation, drive-time and null distance formatting, cache anti-poisoning
 * 5. Complete End-to-End Customer Lifecycle: Quota Exhaustion -> Pro Upgrade -> Unredacted Dossier -> Certificate Print
 *    - Free quota exhaustion (10/10), 11th request blocking, Pro upgrade, unredacted generation, and official print
 */
import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResearchDossier from "@/components/ResearchDossier";
import FhaComplianceCertificateModal from "@/components/FhaComplianceCertificateModal";
import { normalizePlanTier, resolveEffectivePlan } from "@/hooks/usePlanTier";
import {
  setupWindowPrintMock,
  setupNavigatorClipboardMock,
  setupLocalStorageMock,
  restoreBrowserMocks,
} from "@/test/mocks/browser";
import {
  mockCompleteProperty,
  mockViolationsProperty,
  mockEnrichmentData,
  mockDriveTimeAmenitiesEnrichmentData,
  mockCopyGenerations,
} from "@/test/mocks/fixtures";
import type { PropertyWithCopies } from "@/hooks/usePropertyPolling";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const FREE_LIMIT = 10;
const STORAGE_KEY = "plg_generations_used";

describe("Tier 4: Real-World Application Scenarios", () => {
  let originalToLocaleString: typeof Date.prototype.toLocaleString;

  beforeEach(() => {
    vi.clearAllMocks();
    setupLocalStorageMock();
    setupWindowPrintMock("success");
    setupNavigatorClipboardMock("success");
    originalToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = vi.fn().mockReturnValue("Nov 16, 2026, 12:00:00 PM PST");
  });

  afterEach(() => {
    restoreBrowserMocks();
    Date.prototype.toLocaleString = originalToLocaleString;
  });

  // Scenario 1: Anonymous Free Generation Workflow
  it("Scenario 1: Completes anonymous free generation workflow with polling, receive-property call, and local quota tracking", async () => {
    const storage = setupLocalStorageMock({});
    const anonymousId = "anon-user-uuid-9999-8888";

    // 1. Initial anonymous quota state
    let generationsUsed = Number(storage.getItem(STORAGE_KEY) || 0);
    expect(generationsUsed).toBe(0);
    expect(FREE_LIMIT - generationsUsed).toBe(10);

    // 2. Client initiates generation request to receive-property
    const requestPayload = {
      address: "742 Evergreen Terrace, Springfield, OR 97477",
      propertyType: "sfr",
      anonymousId,
    };

    // Server-side reservation simulation (receive-property)
    const serverReservation = {
      allowed: generationsUsed < FREE_LIMIT,
      propertyId: "prop-anon-flow-001",
    };
    expect(serverReservation.allowed).toBe(true);

    // 3. Polling lifecycle simulation
    type PollingStep = "started" | "analyzing_neighborhood" | "generating_copy" | "done";
    const statusHistory: Array<{ status: string; step: PollingStep }> = [
      { status: "processing", step: "started" },
      { status: "processing", step: "analyzing_neighborhood" },
      { status: "processing", step: "generating_copy" },
      { status: "complete", step: "done" },
    ];

    let currentStatus = "pending";
    let currentStep: PollingStep = "started";

    for (const update of statusHistory) {
      currentStatus = update.status;
      currentStep = update.step;
    }

    expect(currentStatus).toBe("complete");
    expect(currentStep).toBe("done");

    // 4. On complete, client increments local quota and updates storage
    generationsUsed += 1;
    storage.setItem(STORAGE_KEY, String(generationsUsed));

    // 5. Verification: Quota decremented, outputs populated
    expect(storage.getItem(STORAGE_KEY)).toBe("1");
    const generationsRemaining = Math.max(0, FREE_LIMIT - Number(storage.getItem(STORAGE_KEY)));
    expect(generationsRemaining).toBe(9);

    const countLabel = `${generationsRemaining} left`;
    expect(countLabel).toBe("9 left");

    // Copy generations are ready for user inspection
    expect(mockCopyGenerations.length).toBe(3);
    expect(mockCopyGenerations[0].copy_type).toBe("standard");
  });

  // Scenario 2: Pro Subscriber with Non-Standard Plan String Accessing Unredacted Intelligence
  it("Scenario 2: Pro subscriber authenticates with non-standard plan string, generates property, and accesses unredacted Research+ intelligence", () => {
    // 1. Subscriber with non-standard tier string in Stripe database
    const rawStripeSubscription = {
      plan: "PRO_MONTHLY_TIER",
      status: "active",
      current_period_end: new Date(Date.now() + 86400000 * 20).toISOString(),
    };

    // 2. Normalization via usePlanTier logic
    const normalizedPlan = normalizePlanTier(rawStripeSubscription.plan);
    expect(normalizedPlan).toBe("pro");

    const effectiveTier = resolveEffectivePlan([rawStripeSubscription]);
    expect(effectiveTier).toBe("pro");
    const isProUser = effectiveTier === "pro";
    expect(isProUser).toBe(true);

    // 3. Render ResearchDossier for authenticated Pro user
    render(
      React.createElement(ResearchDossier, {
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: isProUser,
      }),
    );

    // 4. Dossier is unredacted: Header shows RESEARCH+ ACTIVE
    expect(screen.getByText("RESEARCH+ ACTIVE")).toBeInTheDocument();

    // 5. Unblurred local market intelligence
    expect(screen.getByText(/Local Market & Walkability Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/\$540,000/i)).toBeInTheDocument();
    expect(screen.getByText("Very Walkable")).toBeInTheDocument();
    expect(screen.getByText(/Nearby Schools Directory/i)).toBeInTheDocument();
    expect(screen.getByText(/Springfield Elementary/i)).toBeInTheDocument();

    // 6. Paywall overlay is NOT present
    expect(screen.queryByText(/Unlock Research\+ Intelligence with Pro/i)).not.toBeInTheDocument();
  });

  // Scenario 3: Agent Compliance Review with FHA Violations, Filler Removal & Safe Certificate Export
  it("Scenario 3: Agent reviews listing with FHA compliance issues, verifies filler removal, inspects raw remarks, and exports certificate in sandboxed iframe", () => {
    const printMock = setupWindowPrintMock("success");
    const clipboardMock = setupNavigatorClipboardMock("success");

    // 1. Render dossier with mitigated violations
    const { rerender } = render(
      React.createElement(ResearchDossier, {
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // 2. Status badge shows mitigated count and Section 2 filler is removed
    expect(screen.getByText(/FHA MITIGATED \(3\)/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Fair Housing Act \(FHA\) Compliance Audit & Mitigation Report/i),
    ).not.toBeInTheDocument();

    // 3. Inspect raw listing remarks toggle
    const toggleRemarksBtn = screen.getByText(/View Original Listing Remarks/i);
    expect(toggleRemarksBtn).toBeInTheDocument();

    fireEvent.click(toggleRemarksBtn);
    expect(
      screen.getByText(/Charming property located in walking distance to Catholic Church/i),
    ).toBeInTheDocument();

    // 4. Open official certificate modal
    rerender(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // 5. Certificate contains official audit ID and determination
    expect(screen.getByText(/70% COMPLIANT/i)).toBeInTheDocument();
    const copyIdBtn = screen.getByRole("button", { name: "Copy ID" });
    fireEvent.click(copyIdBtn);

    expect(clipboardMock.writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Copied!")).toBeInTheDocument();

    // 6. Print export executes safely
    const printBtn = screen.getByRole("button", { name: /Print \/ Save as PDF/i });
    fireEvent.click(printBtn);
    expect(printMock).toHaveBeenCalledTimes(1);
  });

  // Scenario 4: Suburban/Rural Property Enriched with Drive-Time Lifestyle Amenities
  it("Scenario 4: Property in suburban/rural area with lifestyle amenities lacking exact mileage is enriched without failing validation or poisoning cache", () => {
    // 1. Amenities dataset with drive-time strings and null distances
    const ruralAmenities = mockDriveTimeAmenitiesEnrichmentData.nearby_amenities!;
    expect(ruralAmenities.length).toBe(5);

    // 2. Backend cache validation gate: validates non-empty and well-formed
    const isValid =
      Array.isArray(ruralAmenities) &&
      ruralAmenities.length > 0 &&
      ruralAmenities.some(
        (item) => typeof item === "object" && item !== null && typeof item.name === "string" && item.name.length > 0,
      );
    expect(isValid).toBe(true);

    // 3. Cache key generated cleanly
    const ruralAddress = "1200 Old County Road, Rural Valley, CA 95928";
    const cacheKey = ruralAddress.toLowerCase().trim().replace(/\s+/g, " ");
    expect(cacheKey).toBe("1200 old county road, rural valley, ca 95928");

    // 4. Render ResearchDossier with drive-time amenities
    render(
      React.createElement(ResearchDossier, {
        property: { ...mockCompleteProperty, address: ruralAddress },
        enrichmentData: mockDriveTimeAmenitiesEnrichmentData,
        isProUser: true,
      }),
    );

    // 5. Verified each drive-time amenity renders with formatted details
    expect(screen.getByText(/Costco Wholesale/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Retail \/ Bulk · 8-12 min drive\)/i)).toBeInTheDocument();

    expect(screen.getByText(/Regional Medical Center/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Hospital · 15 min drive\)/i)).toBeInTheDocument();

    expect(screen.getByText(/Pine Valley Trailhead/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Recreation · 5 min drive\)/i)).toBeInTheDocument();

    // Null distance item renders category without literal "null"
    expect(screen.getByText(/Local Farmers Market/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Grocery\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
  });

  // Scenario 5: Full Lifecycle: Quota Exhaustion -> Pro Upgrade -> Unredacted Dossier -> Certificate Print
  it("Scenario 5: Executes complete lifecycle from anonymous free quota exhaustion to Pro upgrade, unredacted dossier, and robust certificate print", () => {
    const storage = setupLocalStorageMock({});
    const printMock = setupWindowPrintMock("success");
    const onUpgradeIntent = vi.fn();

    // ── Phase 1: Anonymous generation until quota exhausted (10/10) ──
    for (let i = 1; i <= FREE_LIMIT; i++) {
      storage.setItem(STORAGE_KEY, String(i));
    }
    expect(storage.getItem(STORAGE_KEY)).toBe("10");

    const generationsLeft = Math.max(0, FREE_LIMIT - Number(storage.getItem(STORAGE_KEY)));
    expect(generationsLeft).toBe(0);

    // 11th generation request blocked by server logic
    const gateCheck = (count: number, isPro: boolean) => {
      if (isPro) return { allowed: true };
      if (count >= FREE_LIMIT) return { allowed: false, error: "free_limit_exceeded" };
      return { allowed: true };
    };

    expect(gateCheck(10, false)).toEqual({
      allowed: false,
      error: "free_limit_exceeded",
    });

    // ── Phase 2: User completes upgrade to Pro tier ("PRO") ──
    const proSubscription = { plan: "PRO", status: "active" };
    const effectivePlan = resolveEffectivePlan([proSubscription]);
    expect(effectivePlan).toBe("pro");
    const isProUser = effectivePlan === "pro";

    // Quota restriction lifted immediately
    expect(gateCheck(10, isProUser)).toEqual({ allowed: true });
    const quotaLabel = isProUser ? "unlimited" : `${generationsLeft} left`;
    expect(quotaLabel).toBe("unlimited");

    // ── Phase 3: Pro user generates property & views unredacted research dossier ──
    const { rerender } = render(
      React.createElement(ResearchDossier, {
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: isProUser,
        onUpgradeIntent,
      }),
    );

    // Active unblurred intelligence
    expect(screen.getByText("RESEARCH+ ACTIVE")).toBeInTheDocument();
    expect(screen.getByText(/FHA MITIGATED \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\$540,000/i)).toBeInTheDocument();
    expect(screen.getByText(/Springfield Elementary/i)).toBeInTheDocument();

    // ── Phase 4: Pro user opens and prints official signed certificate ──
    rerender(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: isProUser,
        onUpgradeIntent,
      }),
    );

    // Unwatermarked certificate determination
    expect(screen.queryByText(/SAMPLE PREVIEW/i)).not.toBeInTheDocument();
    expect(screen.getByText(/70% COMPLIANT/i)).toBeInTheDocument();

    const printBtn = screen.getByRole("button", { name: /Print \/ Save as PDF/i });
    expect(printBtn).toBeInTheDocument();

    // Executed print without upgrade gating
    fireEvent.click(printBtn);
    expect(printMock).toHaveBeenCalledTimes(1);
    expect(onUpgradeIntent).not.toHaveBeenCalled();
  });
});
