import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FhaComplianceCertificateModal from "@/components/FhaComplianceCertificateModal";
import {
  mockCompleteProperty,
  mockViolationsProperty,
  mockEnrichmentData,
} from "@/test/mocks/fixtures";
import {
  setupWindowPrintMock,
  setupNavigatorClipboardMock,
} from "@/test/mocks/browser";
import { toast as sonnerToast } from "sonner";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("FhaComplianceCertificateModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupWindowPrintMock("success");
    setupNavigatorClipboardMock("success");
  });

  describe("Pro User Unblocked Print Action", () => {
    it("allows Pro users to trigger window.print directly without hitting onUpgradeIntent", () => {
      const printMock = setupWindowPrintMock("success");
      const onUpgradeIntent = vi.fn();

      render(
        <FhaComplianceCertificateModal
          isOpen={true}
          onClose={vi.fn()}
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
          onUpgradeIntent={onUpgradeIntent}
        />,
      );

      // Button states "Print / Save as PDF"
      const printBtn = screen.getByRole("button", {
        name: /Print \/ Save as PDF/i,
      });
      expect(printBtn).toBeInTheDocument();

      // Click print
      fireEvent.click(printBtn);

      // window.print executed, onUpgradeIntent NOT called
      expect(printMock).toHaveBeenCalledTimes(1);
      expect(onUpgradeIntent).not.toHaveBeenCalled();

      // No SAMPLE PREVIEW watermark on Pro certificate
      expect(screen.queryByText(/SAMPLE PREVIEW/i)).not.toBeInTheDocument();
    });
  });

  describe("Free User Gating & Paywall Intent", () => {
    it("displays SAMPLE PREVIEW watermark and invokes onUpgradeIntent without printing", () => {
      const printMock = setupWindowPrintMock("success");
      const onUpgradeIntent = vi.fn();

      render(
        <FhaComplianceCertificateModal
          isOpen={true}
          onClose={vi.fn()}
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={false}
          onUpgradeIntent={onUpgradeIntent}
        />,
      );

      // Watermark is visible
      expect(screen.getByText(/SAMPLE PREVIEW/i)).toBeInTheDocument();
      expect(screen.getByText(/PRO TIER REQUIRED FOR OFFICIAL FILING/i)).toBeInTheDocument();

      // Button prompts to unlock official PDF
      const unlockBtn = screen.getByRole("button", {
        name: /Unlock Official PDF \(Pro\)/i,
      });
      expect(unlockBtn).toBeInTheDocument();

      // Clicking triggers upgrade intent and does NOT invoke window.print
      fireEvent.click(unlockBtn);
      expect(onUpgradeIntent).toHaveBeenCalledTimes(1);
      expect(printMock).not.toHaveBeenCalled();
    });
  });

  describe("Defensive Sandbox Exception Handling", () => {
    it("catches DOMException from window.print and displays Sonner toast error without throwing", () => {
      // Simulate iframe sandbox print restriction throwing DOMException (SecurityError)
      setupWindowPrintMock("throw-dom-exception");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <FhaComplianceCertificateModal
          isOpen={true}
          onClose={vi.fn()}
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      const printBtn = screen.getByRole("button", {
        name: /Print \/ Save as PDF/i,
      });

      // Clicking must not throw an uncaught exception
      expect(() => {
        fireEvent.click(printBtn);
      }).not.toThrow();

      // Sonner toast error must be triggered with guidance
      expect(sonnerToast.error).toHaveBeenCalledWith(
        "Direct printing blocked by browser sandbox",
        expect.objectContaining({
          description:
            "Please open this page directly in a new tab or use your browser's Print command.",
        }),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Audit ID Clipboard Copying", () => {
    it("copies Document Audit ID to clipboard and displays confirmation toast", () => {
      const clipboardMock = setupNavigatorClipboardMock("success");

      render(
        <FhaComplianceCertificateModal
          isOpen={true}
          onClose={vi.fn()}
          property={mockViolationsProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={true}
        />,
      );

      const copyBtn = screen.getByRole("button", { name: /Copy ID/i });
      fireEvent.click(copyBtn);

      expect(clipboardMock.writeText).toHaveBeenCalledWith(
        expect.stringMatching(/^PLG-FHA-/),
      );
      expect(sonnerToast.success).toHaveBeenCalledWith(
        "Audit ID Copied!",
        expect.objectContaining({
          description: expect.stringMatching(/copied for your MLS or transaction file/),
        }),
      );
    });
  });
});
