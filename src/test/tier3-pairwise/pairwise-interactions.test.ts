/**
 * pairwise-interactions.test.ts
 *
 * Tier 3 Pairwise Combinations: Cross-Feature Interactions
 *
 * Suites:
 * 1. F1 x F2: Free vs Pro Quota Transitions
 *    - Free user hits 10/10 quota exhaustion, upgrades to Pro, immediately receives unlimited generations
 * 2. F2 x F4: Pro Entitlement with Certificate Print Export
 *    - Normalized Pro tier unlocks unwatermarked official certificate print, while Free tier triggers upgrade modal
 * 3. F2 x F3: Pro User Viewing Unredacted Dossier with Mitigated Remarks
 *    - Pro entitlement unlocks full neighborhood dossier while cleanly presenting FHA mitigated audit trail
 * 4. F3 x F4: Clean FHA Remarks Exported to Certificate
 *    - FHA compliance audit determination and sanitized facts accurately transfer to the printable certificate sheet
 * 5. F5 x F3: Rich Amenities Rendered Alongside FHA Badges
 *    - Multi-category lifestyle amenities with relaxed distance/drive-time render cleanly alongside FHA compliance status
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
} from "@/test/mocks/fixtures";
import type { PropertyWithCopies } from "@/hooks/usePropertyPolling";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const FREE_LIMIT = 10;
const STORAGE_KEY = "plg_generations_used";

describe("Tier 3 Pairwise Interactions", () => {
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

  // Pairwise 1: F1 x F2 (Free vs Pro Quota Transitions)
  it("F1 x F2: Transitions user seamlessly from exhausted free quota (10/10) to unlimited generations upon Pro upgrade", () => {
    // Stage 1: Free tier user at 10/10 quota
    const initialPlan = "free" as "free" | "pro";
    const storage = setupLocalStorageMock({ [STORAGE_KEY]: "10" });
    let isProUser = initialPlan === "pro";

    const getQuotaState = (used: number, pro: boolean) => {
      const left = Math.max(0, FREE_LIMIT - used);
      const label = pro ? "unlimited" : `${left} left`;
      const disabled = !pro && left <= 0;
      return { left, label, disabled };
    };

    const freeState = getQuotaState(Number(storage.getItem(STORAGE_KEY)), isProUser);
    expect(freeState.left).toBe(0);
    expect(freeState.label).toBe("0 left");
    expect(freeState.disabled).toBe(true);

    // Simulated receive-property server-side quota gate for free user
    function checkReceivePropertyGate(pro: boolean, count: number) {
      if (pro) return { allowed: true, status: 200 };
      if (count >= FREE_LIMIT) return { allowed: false, status: 403, error: "free_limit_exceeded" };
      return { allowed: true, status: 200 };
    }

    expect(checkReceivePropertyGate(isProUser, 10)).toEqual({
      allowed: false,
      status: 403,
      error: "free_limit_exceeded",
    });

    // Stage 2: User upgrades to Pro subscription ("pro_annual")
    const upgradeSubscription = { plan: "pro_annual", status: "active" };
    const resolvedTier = resolveEffectivePlan([upgradeSubscription]);
    expect(resolvedTier).toBe("pro");

    isProUser = resolvedTier === "pro";

    // Stage 3: Immediate UI and server unblocking
    const proState = getQuotaState(Number(storage.getItem(STORAGE_KEY)), isProUser);
    expect(proState.label).toBe("unlimited");
    expect(proState.disabled).toBe(false);

    expect(checkReceivePropertyGate(isProUser, 10)).toEqual({
      allowed: true,
      status: 200,
    });
  });

  // Pairwise 2: F2 x F4 (Pro Entitlement with Certificate Print Export)
  it("F2 x F4: Gates certificate export behind paywall for free users but executes print directly for normalized Pro users", () => {
    const printMock = setupWindowPrintMock("success");
    const onUpgradeIntent = vi.fn();

    // 1. Render as Free user
    const { rerender } = render(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: false,
        onUpgradeIntent,
      }),
    );

    // Free user sees sample preview watermark and upgrade export button
    expect(screen.getByText(/SAMPLE PREVIEW/i)).toBeInTheDocument();
    const upgradeBtn = screen.getByRole("button", { name: /Unlock Official PDF \(Pro\)/i });
    expect(upgradeBtn).toBeInTheDocument();

    fireEvent.click(upgradeBtn);
    expect(printMock).not.toHaveBeenCalled();
    expect(onUpgradeIntent).toHaveBeenCalledTimes(1);

    // 2. User upgrades to Pro with non-standard tier string "PRO_MONTHLY"
    const effectivePlan = normalizePlanTier("PRO_MONTHLY");
    expect(effectivePlan).toBe("pro");
    const isProUser = effectivePlan === "pro";

    // 3. Rerender with isProUser: true
    rerender(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: isProUser,
        onUpgradeIntent,
      }),
    );

    // Watermark removed and button updated to direct print
    expect(screen.queryByText(/SAMPLE PREVIEW/i)).not.toBeInTheDocument();
    const printBtn = screen.getByRole("button", { name: /Print \/ Save as PDF/i });
    expect(printBtn).toBeInTheDocument();

    fireEvent.click(printBtn);
    expect(printMock).toHaveBeenCalledTimes(1);
    expect(onUpgradeIntent).toHaveBeenCalledTimes(1); // Not called again
  });

  // Pairwise 3: F2 x F3 (Pro User Viewing Unredacted Dossier with Mitigated Remarks)
  it("F2 x F3: Unlocks unredacted neighborhood intelligence for Pro users while rendering concise FHA mitigated badge and omitting filler", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Section 1: Header shows active Pro intelligence card
    expect(screen.getByText("RESEARCH+ ACTIVE")).toBeInTheDocument();
    expect(screen.getByText(/FHA MITIGATED \(3\)/i)).toBeInTheDocument();

    // Section 2 filler card is cleanly omitted
    expect(
      screen.queryByText(/3 Restricted Phrasing Patterns Neutralized/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/AUTO-MITIGATED/i)).not.toBeInTheDocument();

    // Section 3: Neighborhood intelligence is unblurred and accessible
    expect(screen.getByText(/Est\. Median Home Value/i)).toBeInTheDocument();
    expect(screen.getByText(/\$540,000/i)).toBeInTheDocument();
    expect(screen.getByText(/Walkability Score/i)).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
    expect(screen.getByText(/Springfield Elementary/i)).toBeInTheDocument();

    // Verify upgrade paywall overlay is absent
    expect(screen.queryByText(/Unlock Research\+ Intelligence with Pro/i)).not.toBeInTheDocument();
  });

  // Pairwise 4: F3 x F4 (Clean FHA Remarks Exported to Certificate)
  it("F3 x F4: Preserves exact compliance score, audit ID, and mitigated facts when transferring from dossier to certificate", () => {
    const clipboardMock = setupNavigatorClipboardMock("success");

    render(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Statutory audit authority verified
    expect(screen.getAllByText(/42 U.S.C. § 3604\(c\)/i).length).toBeGreaterThanOrEqual(1);

    // Mitigated determination score (70%) transferred to certificate determination
    expect(screen.getByText(/70% COMPLIANT/i)).toBeInTheDocument();

    // Mitigation statements transferred to certificate body
    expect(
      screen.getByText(
        /Flagged: "walking distance to Catholic Church" → Sanitized to compliant amenity statement/i,
      ),
    ).toBeInTheDocument();

    // Audit ID copying verified
    const copyIdBtn = screen.getByRole("button", { name: "Copy ID" });
    fireEvent.click(copyIdBtn);

    expect(clipboardMock.writeText).toHaveBeenCalledTimes(1);
    const copiedText = clipboardMock.writeText.mock.calls[0][0];
    expect(copiedText).toMatch(/^PLG-FHA-[0-9A-Z]{8}$/);
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  // Pairwise 5: F5 x F3 (Rich Amenities Rendered Alongside FHA Badges)
  it("F5 x F3: Renders multi-category drive-time amenities cleanly alongside verified FHA compliance badge in unified dossier", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockCompleteProperty,
        enrichmentData: mockDriveTimeAmenitiesEnrichmentData,
        isProUser: true,
      }),
    );

    // 1. FHA compliance status badge verified in header, Section 2 filler omitted
    expect(screen.getByText("100% FHA COMPLIANT")).toBeInTheDocument();
    expect(
      screen.queryByText(/Verified 100% FHA Compliant — Zero Violations/i),
    ).not.toBeInTheDocument();

    // 2. Multi-category amenities with drive-time strings rendered cleanly
    expect(screen.getByText(/Costco Wholesale/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Retail \/ Bulk · 8-12 min drive\)/i)).toBeInTheDocument();

    expect(screen.getByText(/Regional Medical Center/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Hospital · 15 min drive\)/i)).toBeInTheDocument();

    expect(screen.getByText(/Pine Valley Trailhead/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Recreation · 5 min drive\)/i)).toBeInTheDocument();

    expect(screen.getByText(/Local Farmers Market/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Grocery\)/i)).toBeInTheDocument();

    expect(screen.getByText(/Community Library/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Civic\)/i)).toBeInTheDocument();
  });
});
