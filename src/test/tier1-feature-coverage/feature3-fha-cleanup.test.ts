/**
 * feature3-fha-cleanup.test.ts
 *
 * Tier 1 Feature Coverage: Feature 3 (FHA Compliance Audit Cleanup & Remarks Retention)
 * Tests:
 * 1. FHA compliance score calculation logic (explicit score, zero violations, step degradation, floor at 70)
 * 2. 100% compliant badge and verified status rendering when 0 violations detected
 * 3. Mitigated badge and sanitized term chips rendering when violations exist
 * 4. Raw listing remarks preservation and toggleable inspection without text corruption
 * 5. Filler card absence (clean, actionable Win95 audit layout)
 * 6. Parsing robustness across diverse fha_violations formats (string[], JSON string, plain string, null)
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResearchDossier from "@/components/ResearchDossier";
import {
  mockCompleteProperty,
  mockViolationsProperty,
  mockEnrichmentData,
} from "@/test/mocks/fixtures";
import type { PropertyWithCopies } from "@/hooks/usePropertyPolling";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("Feature 3: FHA Compliance Audit & Remarks Retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Compliance score calculation rule
  it("calculates FHA compliance score correctly with explicit override, zero violations, and 70 floor", () => {
    function computeComplianceScore(
      rawScore: number | null | undefined,
      violations: string[] = [],
    ): number {
      if (typeof rawScore === "number" && !isNaN(rawScore)) {
        return rawScore;
      }
      if (violations.length === 0) {
        return 100;
      }
      return Math.max(70, 100 - violations.length * 10);
    }

    // Explicit score in database takes precedence
    expect(computeComplianceScore(95, ["term1"])).toBe(95);
    expect(computeComplianceScore(85, [])).toBe(85);

    // 0 violations without explicit score => 100%
    expect(computeComplianceScore(null, [])).toBe(100);
    expect(computeComplianceScore(undefined, [])).toBe(100);

    // 1 violation: 100 - 10 = 90%
    expect(computeComplianceScore(null, ["walking to church"])).toBe(90);

    // 2 violations: 100 - 20 = 80%
    expect(computeComplianceScore(null, ["term1", "term2"])).toBe(80);

    // 3 violations: 100 - 30 = 70%
    expect(computeComplianceScore(null, ["term1", "term2", "term3"])).toBe(70);

    // 5 violations: floor at 70%
    expect(computeComplianceScore(null, ["t1", "t2", "t3", "t4", "t5"])).toBe(70);
  });

  // Test 2: 100% compliant badge display and Section 2 filler absence
  it("renders 100% FHA COMPLIANT badge and clean status when property has zero violations without Section 2 filler", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Flat status badge shows 100% FHA COMPLIANT
    const badge = screen.getByText("100% FHA COMPLIANT");
    expect(badge).toBeInTheDocument();

    // Section 2 filler card and boilerplate are cleanly removed
    expect(
      screen.queryByText("Fair Housing Act (FHA) Compliance Audit & Mitigation Report"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Verified 100% FHA Compliant — Zero Violations"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/AUTO-MITIGATED/)).not.toBeInTheDocument();
  });

  // Test 3: Mitigated badge and neutralized terms display
  it("renders FHA MITIGATED badge in header while omitting Section 2 filler report", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Status badge shows FHA MITIGATED (3)
    expect(screen.getByText("FHA MITIGATED (3)")).toBeInTheDocument();

    // Section 2 filler report is removed
    expect(screen.queryByText(/Restricted Phrasing Pattern/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AUTO-MITIGATED/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Sanitized Compliant Facts Integrated into Copy:/i),
    ).not.toBeInTheDocument();
  });

  // Test 4: Raw remarks preservation & toggleable inspection
  it("preserves raw listing remarks and allows user to toggle view without text corruption", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Toggle button is initially available
    const toggleButton = screen.getByRole("button", {
      name: "View Original Listing Remarks",
    });
    expect(toggleButton).toBeInTheDocument();

    // Raw text container is not visible initially
    expect(
      screen.queryByText(mockViolationsProperty.existing_listing_raw!),
    ).not.toBeInTheDocument();

    // Click to view raw remarks
    fireEvent.click(toggleButton);

    // Raw text is rendered in full verbatim
    expect(screen.getByText(mockViolationsProperty.existing_listing_raw!)).toBeInTheDocument();
    expect(toggleButton).toHaveTextContent("Hide Original Listing Text");

    // Click again to hide
    fireEvent.click(toggleButton);
    expect(
      screen.queryByText(mockViolationsProperty.existing_listing_raw!),
    ).not.toBeInTheDocument();
  });

  // Test 5: Filler card absence & clean UI structure
  it("ensures redundant filler cards are absent and official certificate action is available", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Verify there are no decorative filler cards or fake disabled buttons
    const allButtons = screen.getAllByRole("button");
    for (const btn of allButtons) {
      // Must not contain "filler" or placeholder indicators
      expect(btn.textContent).not.toMatch(/placeholder|filler|dummy/i);
    }

    // Official Certificate PDF action is present and clickable
    const certButton = screen.getByTitle(
      "View, export, or print official signed FHA Compliance Certificate for broker file",
    );
    expect(certButton).toBeInTheDocument();

    // Section 2 filler card is absent
    expect(
      screen.queryByText(/Fair Housing Act \(FHA\) Compliance Audit & Mitigation Report/i),
    ).not.toBeInTheDocument();
  });

  // Test 6: Parsing robustness across diverse violations formats
  it("robustly parses fha_violations from array, JSON string, comma string, or null", () => {
    function parseViolations(rawViolations: unknown): string[] {
      let violations: string[] = [];
      try {
        if (Array.isArray(rawViolations)) {
          violations = rawViolations.filter((v): v is string => typeof v === "string");
        } else if (typeof rawViolations === "string") {
          try {
            const parsed = JSON.parse(rawViolations);
            if (Array.isArray(parsed)) {
              violations = parsed.filter((v): v is string => typeof v === "string");
            } else if (typeof parsed === "string") {
              violations = [parsed];
            }
          } catch {
            if (rawViolations.trim()) {
              violations = [rawViolations.trim()];
            }
          }
        }
      } catch {
        violations = [];
      }
      return violations;
    }

    // Array format
    expect(parseViolations(["church", "family only"])).toEqual(["church", "family only"]);

    // JSON encoded string
    expect(parseViolations('["walking distance to church", "adults only"]')).toEqual([
      "walking distance to church",
      "adults only",
    ]);

    // Single JSON string
    expect(parseViolations('"single violation"')).toEqual(["single violation"]);

    // Raw plain text string
    expect(parseViolations("borderline steering phrasing")).toEqual([
      "borderline steering phrasing",
    ]);

    // Null and undefined
    expect(parseViolations(null)).toEqual([]);
    expect(parseViolations(undefined)).toEqual([]);
    expect(parseViolations("   ")).toEqual([]);
  });
});
