import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResearchDossier from "@/components/ResearchDossier";
import {
  mockCompleteProperty,
  mockViolationsProperty,
  mockEnrichmentData,
} from "@/test/mocks/fixtures";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("ResearchDossier Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dynamic Reactivity of isProUser", () => {
    it("renders PRO PREVIEW badge, blur styling, and teaser modal when isProUser is false", () => {
      const onUpgradeIntent = vi.fn();
      const { rerender } = render(
        <ResearchDossier
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={false}
          onUpgradeIntent={onUpgradeIntent}
        />,
      );

      // Header indicates Pro Preview
      expect(screen.getByText("PRO PREVIEW")).toBeInTheDocument();

      // Paywall teaser modal is displayed
      expect(screen.getByText("PLG Research+ Intelligence Dossier [PRO ONLY]")).toBeInTheDocument();
      expect(
        screen.getByText("Unlock Full Property & Neighborhood Intelligence"),
      ).toBeInTheDocument();

      // Clicking upgrade intent triggers callback
      const upgradeBtn = screen.getByRole("button", {
        name: /Unlock Pro Intelligence/i,
      });
      fireEvent.click(upgradeBtn);
      expect(onUpgradeIntent).toHaveBeenCalledTimes(1);

      // Dynamically updates when isProUser flips to true
      rerender(
        <ResearchDossier
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
          onUpgradeIntent={onUpgradeIntent}
        />,
      );

      // Header updates to active Pro status
      expect(screen.getByText("RESEARCH+ ACTIVE")).toBeInTheDocument();
      expect(screen.queryByText("PRO PREVIEW")).not.toBeInTheDocument();

      // Paywall teaser is removed
      expect(
        screen.queryByText("PLG Research+ Intelligence Dossier [PRO ONLY]"),
      ).not.toBeInTheDocument();

      // Neighborhood intelligence is immediately accessible
      expect(screen.getByText("Est. Median Home Value")).toBeInTheDocument();
      expect(screen.getByText("Walkability Score")).toBeInTheDocument();
    });
  });

  describe("Section 2 Removal (Filler Elimination)", () => {
    it("omits Section 2 card, AUTO-MITIGATED badge, and statutory boilerplate for compliant listings", () => {
      render(
        <ResearchDossier
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      // Section 2 titlebar and badges must NOT be rendered
      expect(
        screen.queryByText("Fair Housing Act (FHA) Compliance Audit & Mitigation Report"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("42 U.S.C. § 3604(c)")).not.toBeInTheDocument();
      expect(screen.queryByText(/AUTO-MITIGATED/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText("Verified 100% FHA Compliant — Zero Violations"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Audit Determination:/i)).not.toBeInTheDocument();
    });

    it("omits Section 2 card and AUTO-MITIGATED badge for listings with violations", () => {
      render(
        <ResearchDossier
          property={mockViolationsProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      // Section 2 filler content must NOT be rendered
      expect(
        screen.queryByText("Fair Housing Act (FHA) Compliance Audit & Mitigation Report"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/AUTO-MITIGATED/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Restricted Phrasing Pattern/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Sanitized Compliant Facts Integrated into Copy:/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("FHA Status Badge in Section 1 Header", () => {
    it("renders concise '100% FHA COMPLIANT' badge when zero violations exist", () => {
      render(
        <ResearchDossier
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      const badge = screen.getByText("100% FHA COMPLIANT");
      expect(badge).toBeInTheDocument();
      expect(badge.closest("div")).toHaveClass("bg-emerald-50");
    });

    it("renders concise 'FHA MITIGATED (N)' badge when violations exist", () => {
      render(
        <ResearchDossier
          property={mockViolationsProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      const badge = screen.getByText("FHA MITIGATED (3)");
      expect(badge).toBeInTheDocument();
      expect(badge.closest("div")).toHaveClass("bg-amber-50");
    });
  });

  describe("Preservation of Raw Listing Remarks Toggle", () => {
    it("renders toggle button in Section 1 and reveals raw remarks on click", () => {
      render(
        <ResearchDossier
          property={mockViolationsProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      // Toggle button is present
      const toggleBtn = screen.getByRole("button", {
        name: "View Original Listing Remarks",
      });
      expect(toggleBtn).toBeInTheDocument();

      // Raw remarks are initially hidden
      expect(
        screen.queryByText(mockViolationsProperty.existing_listing_raw!),
      ).not.toBeInTheDocument();

      // Click to inspect
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveTextContent("Hide Original Listing Text");
      expect(screen.getByText(mockViolationsProperty.existing_listing_raw!)).toBeInTheDocument();

      // Click again to hide
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveTextContent("View Original Listing Remarks");
      expect(
        screen.queryByText(mockViolationsProperty.existing_listing_raw!),
      ).not.toBeInTheDocument();
    });

    it("omits toggle button when existing_listing_raw is null or undefined", () => {
      const noRemarksProperty = {
        ...mockCompleteProperty,
        existing_listing_raw: null,
      };

      render(
        <ResearchDossier
          property={noRemarksProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /Original Listing Remarks/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Official Certificate (PDF) Button & Modal Interaction", () => {
    it("renders Official Certificate (PDF) button in Section 1 and opens certificate modal on click", () => {
      render(
        <ResearchDossier
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      const certBtn = screen.getByRole("button", {
        name: /Official Certificate \(PDF\)/i,
      });
      expect(certBtn).toBeInTheDocument();

      // Modal is not visible initially
      expect(
        screen.queryByText("FHA Fair Housing Compliance Certificate — Official Record"),
      ).not.toBeInTheDocument();

      // Clicking opens the modal
      fireEvent.click(certBtn);
      expect(
        screen.getByText("FHA Fair Housing Compliance Certificate — Official Record"),
      ).toBeInTheDocument();
    });
  });
});
