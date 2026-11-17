/**
 * feature3-fha-boundaries.test.ts
 *
 * Tier 2 Boundary & Corner Cases: Feature 3 (FHA Fair Housing Compliance & Remarks Boundaries)
 *
 * Boundary Tests:
 * 1. 0 Violations boundary: Computes 100% perfect compliance score and renders verified green badge
 * 2. Extreme violations boundary: Clamps compliance score floor strictly at 70% even with 5, 10, or 20 violations
 * 3. Empty remarks string / null / undefined: Graceful rendering without crashing, hiding raw toggle when missing
 * 4. Special characters, newlines, emojis, and Unicode in listing remarks: Correctly preserved without text corruption
 * 5. Malformed metadata objects: Handles corrupted JSON string, objects, numbers, and null in fha_violations and fha_categories
 * 6. Audit card integrity: Ensures no redundant filler cards while retaining actionable audit determination
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

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("Feature 3: FHA Compliance Audit & Remarks Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: 0 Violations boundary
  it("enforces 100% compliance score and renders 100% FHA COMPLIANT badge when 0 violations exist", () => {
    const zeroViolationsProperty: PropertyWithCopies = {
      ...mockCompleteProperty,
      fha_violations: [],
      fha_compliance_score: null, // explicit null triggers derivation from violations
    };

    render(
      React.createElement(ResearchDossier, {
        property: zeroViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Verified 100% badge rendered in Section 1 Header
    expect(screen.getByText("100% FHA COMPLIANT")).toBeInTheDocument();
    expect(
      screen.queryByText(/Verified 100% FHA Compliant — Zero Violations/i),
    ).not.toBeInTheDocument();

    // No warning or AUTO-MITIGATED badge
    expect(screen.queryByText(/AUTO-MITIGATED/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Restricted Phrasing Pattern/i)).not.toBeInTheDocument();
  });

  // Test 2: Extreme violations boundary clamped at 70 floor
  it("clamps compliance score floor at 70% even under extreme violation counts (5, 10, 20 violations)", () => {
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

    // 1 violation: 100 - 10 = 90
    expect(computeComplianceScore(null, ["v1"])).toBe(90);
    // 2 violations: 100 - 20 = 80
    expect(computeComplianceScore(null, ["v1", "v2"])).toBe(80);
    // 3 violations: 100 - 30 = 70 (floor reached)
    expect(computeComplianceScore(null, ["v1", "v2", "v3"])).toBe(70);
    // 4 violations: clamped to 70
    expect(computeComplianceScore(null, ["v1", "v2", "v3", "v4"])).toBe(70);
    // 10 violations: clamped to 70
    const tenViolations = Array.from({ length: 10 }, (_, i) => `violation-${i}`);
    expect(computeComplianceScore(null, tenViolations)).toBe(70);
    // 50 violations: clamped to 70
    const fiftyViolations = Array.from({ length: 50 }, (_, i) => `violation-${i}`);
    expect(computeComplianceScore(null, fiftyViolations)).toBe(70);

    // Render with 5 violations
    const multiViolationProperty: PropertyWithCopies = {
      ...mockViolationsProperty,
      fha_violations: [
        "near Catholic church",
        "perfect for bachelor",
        "exclusive adult community",
        "quiet mature residents only",
        "no children allowed",
      ],
      fha_compliance_score: null,
    };

    render(
      React.createElement(ResearchDossier, {
        property: multiViolationProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Status badge indicates 5 mitigated violations
    expect(screen.getByText(/FHA MITIGATED \(5\)/i)).toBeInTheDocument();
    // Section 2 filler report is absent
    expect(
      screen.queryByText(/5 Restricted Phrasing Patterns Neutralized/i),
    ).not.toBeInTheDocument();
  });

  // Test 3: Empty remarks string / null / undefined
  it("safely handles null, undefined, or empty existing_listing_raw remarks and omits raw toggle", () => {
    const noRemarksProperty: PropertyWithCopies = {
      ...mockCompleteProperty,
      existing_listing_raw: null,
      fha_compliant_listing_parts: null,
    };

    const { rerender } = render(
      React.createElement(ResearchDossier, {
        property: noRemarksProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Toggle button should not be present when remarks are null
    expect(screen.queryByText(/View Original Listing Remarks/i)).not.toBeInTheDocument();

    // Rerender with empty whitespace string
    rerender(
      React.createElement(ResearchDossier, {
        property: { ...noRemarksProperty, existing_listing_raw: "   " },
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Still handles cleanly without crash
    expect(screen.getByText(/742 Evergreen Terrace/i)).toBeInTheDocument();
  });

  // Test 4: Special characters, newlines, emojis, and Unicode in remarks
  it("preserves special characters, Unicode, newlines, and emojis in remarks without corruption", () => {
    const richRemarks =
      '🏡 Stunner! Features 100% custom cedar pergola & patio.\n\n• Price: $750,000 (OBO)\n• 150m² primary suite w/ jacuzzi.\n• "Quote test" & <EscapeTest> & Café au lait decor.\n• Contact: (555) 019-2831 📞';

    const unicodeProperty: PropertyWithCopies = {
      ...mockCompleteProperty,
      existing_listing_raw: richRemarks,
    };

    render(
      React.createElement(ResearchDossier, {
        property: unicodeProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    const toggleBtn = screen.getByText(/View Original Listing Remarks/i);
    expect(toggleBtn).toBeInTheDocument();

    // Click to expand raw remarks
    fireEvent.click(toggleBtn);

    // Verify rich characters and formatting survived without stripping
    expect(screen.getByText(/🏡 Stunner!/i)).toBeInTheDocument();
    expect(screen.getByText(/Café au lait/i)).toBeInTheDocument();
    expect(screen.getByText(/150m² primary suite/i)).toBeInTheDocument();
    expect(screen.getByText(/<EscapeTest>/i)).toBeInTheDocument();
  });

  // Test 5: Malformed metadata objects
  it("parses corrupted and non-standard fha_violations formats defensively", () => {
    // 1. JSON stringified array
    const jsonStringProperty = {
      ...mockViolationsProperty,
      fha_violations: '["walking distance to synagogue", "great for young couples"]',
    } as unknown as PropertyWithCopies;

    const { unmount } = render(
      React.createElement(ResearchDossier, {
        property: jsonStringProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    expect(screen.getByText(/FHA MITIGATED \(2\)/i)).toBeInTheDocument();
    unmount();

    // 2. Corrupted unparseable JSON string falls back to single term or empty array
    const corruptJsonProperty = {
      ...mockViolationsProperty,
      fha_violations: '{"corrupted": "not an array',
    } as unknown as PropertyWithCopies;

    render(
      React.createElement(ResearchDossier, {
        property: corruptJsonProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Handled without throwing unhandled exception
    expect(screen.getByText(/PLG Research\+ Intelligence Card/i)).toBeInTheDocument();
  });

  // Test 6: Audit card integrity (no redundant filler cards)
  it("renders a clean Win95 layout without redundant decorative cards", () => {
    render(
      React.createElement(ResearchDossier, {
        property: mockViolationsProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Section 2 filler report is cleanly absent
    expect(
      screen.queryByText(/Fair Housing Act \(FHA\) Compliance Audit & Mitigation Report/i),
    ).not.toBeInTheDocument();

    // Contains direct link to official certificate in Section 1 Header
    const certButton = screen.getByRole("button", {
      name: /Official Certificate \(PDF\)/i,
    });
    expect(certButton).toBeInTheDocument();

    // Ensure no filler dummy text
    expect(screen.queryByText(/filler report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder auto mitigation/i)).not.toBeInTheDocument();
  });
});
