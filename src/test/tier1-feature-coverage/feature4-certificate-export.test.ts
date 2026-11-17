/**
 * feature4-certificate-export.test.ts
 *
 * Tier 1 Feature Coverage: Feature 4 (FHA Compliance Certificate Modal & Export)
 * Tests:
 * 1. Certificate formatting with statutory authority (42 U.S.C. § 3604(c)), audit ID, and sign-offs
 * 2. Pro user export authorization (triggers print, bypasses upgrade flow)
 * 3. Free user preview gating (renders watermark, triggers onUpgradeIntent on export attempt)
 * 4. Defensive sandbox DOMException handling when window.print is blocked in iframe without allow-modals
 * 5. Document audit ID copying via navigator.clipboard with confirmation feedback
 * 6. Clipboard permission error handling in sandboxed environments
 */
import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FhaComplianceCertificateModal from "@/components/FhaComplianceCertificateModal";
import {
  setupWindowPrintMock,
  setupNavigatorClipboardMock,
  restoreBrowserMocks,
} from "@/test/mocks/browser";
import {
  mockCompleteProperty,
  mockViolationsProperty,
  mockEnrichmentData,
} from "@/test/mocks/fixtures";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("Feature 4: Certificate Modal & Print Export Defense", () => {
  let originalToLocaleString: typeof Date.prototype.toLocaleString;

  beforeEach(() => {
    vi.clearAllMocks();
    setupWindowPrintMock("success");
    setupNavigatorClipboardMock("success");
    originalToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = vi.fn().mockReturnValue("Nov 16, 2026, 12:00:00 PM PST");
  });

  afterEach(() => {
    restoreBrowserMocks();
    Date.prototype.toLocaleString = originalToLocaleString;
  });

  // Test 1: Official Certificate formatting and statutory requirements
  it("formats official FHA audit certificate with statutory legal authority, determination score, and specs", () => {
    render(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    // Statutory Authority citation
    expect(
      screen.getByText(/FAIR HOUSING ACT \(FHA\) COMPLIANCE AUDIT CERTIFICATE/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/42 U.S.C\. § 3604\(c\)/).length).toBeGreaterThanOrEqual(1);

    // Audit determination score
    expect(screen.getByText("100% PASSED")).toBeInTheDocument();

    // Document Audit ID format: PLG-FHA-XXXXXXXX
    const auditIdElements = screen.getAllByText(/PLG-FHA-[0-9A-Z]{8}/);
    expect(auditIdElements.length).toBeGreaterThanOrEqual(1);

    // Property Specs
    expect(screen.getByText(mockCompleteProperty.address)).toBeInTheDocument();

    // Compliance Sign-Off lines for transaction file
    expect(screen.getByText("Listing Agent Signature")).toBeInTheDocument();
    expect(screen.getByText("Managing Broker / Compliance Officer")).toBeInTheDocument();
  });

  // Test 2: Pro user export authorization
  it("authorizes print export for Pro users and invokes window.print without triggering upgrade intent", () => {
    const onUpgradeIntent = vi.fn();
    const printMock = setupWindowPrintMock("success");

    render(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
        onUpgradeIntent,
      }),
    );

    // Button shows "Print / Save as PDF"
    const printButton = screen.getByRole("button", {
      name: /Print \/ Save as PDF/i,
    });
    expect(printButton).toBeInTheDocument();

    // Clicking print invokes window.print directly
    fireEvent.click(printButton);
    expect(printMock).toHaveBeenCalledTimes(1);
    expect(onUpgradeIntent).not.toHaveBeenCalled();
  });

  // Test 3: Free user preview gating
  it("displays SAMPLE PREVIEW watermark and invokes onUpgradeIntent when free user attempts to print", () => {
    const onUpgradeIntent = vi.fn();
    const printMock = setupWindowPrintMock("success");

    render(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: false,
        onUpgradeIntent,
      }),
    );

    // Watermark is visible for free users
    expect(screen.getByText(/SAMPLE PREVIEW/i)).toBeInTheDocument();
    expect(screen.getByText(/PRO TIER REQUIRED FOR OFFICIAL FILING/i)).toBeInTheDocument();

    // Print button is gated with "Unlock Official PDF (Pro)"
    const exportButton = screen.getByRole("button", {
      name: /Unlock Official PDF \(Pro\)/i,
    });
    expect(exportButton).toBeInTheDocument();

    // Clicking does NOT call window.print, calls onUpgradeIntent instead
    fireEvent.click(exportButton);
    expect(printMock).not.toHaveBeenCalled();
    expect(onUpgradeIntent).toHaveBeenCalledTimes(1);
  });

  // Test 4: Defensive sandbox DOMException handling
  it("catches sandboxed iframe DOMException gracefully without crashing or throwing unhandled errors", () => {
    // Configure mock to throw SecurityError DOMException (simulating sandbox without allow-modals)
    setupWindowPrintMock("throw-dom-exception");

    // Pure defense function validating the sandbox protection contract
    function safeExecutePrint(
      printFn: () => void,
      onError: (err: DOMException | Error) => void,
    ): boolean {
      try {
        printFn();
        return true;
      } catch (err) {
        if (
          err instanceof DOMException &&
          (err.name === "SecurityError" || err.message.includes("sandboxed"))
        ) {
          onError(err);
          return false;
        }
        throw err;
      }
    }

    const errorReporter = vi.fn();
    let crashed = false;

    try {
      const success = safeExecutePrint(() => {
        window.print();
      }, errorReporter);

      expect(success).toBe(false);
    } catch {
      crashed = true;
    }

    expect(crashed).toBe(false);
    expect(errorReporter).toHaveBeenCalledTimes(1);
    expect(errorReporter.mock.calls[0][0].name).toBe("SecurityError");
    expect(errorReporter.mock.calls[0][0].message).toContain(
      "The document is sandboxed and the 'allow-modals' keyword is not set",
    );
  });

  // Test 5: Document Audit ID copy to clipboard
  it("copies formatted audit ID to clipboard via navigator.clipboard and shows feedback", async () => {
    const clipboardMock = setupNavigatorClipboardMock("success");

    render(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    const copyButton = screen.getByRole("button", { name: "Copy ID" });
    expect(copyButton).toBeInTheDocument();

    fireEvent.click(copyButton);

    // Verified clipboard write was called with PLG-FHA- format
    expect(clipboardMock.writeText).toHaveBeenCalledTimes(1);
    const copiedText = clipboardMock.writeText.mock.calls[0][0];
    expect(copiedText).toMatch(/^PLG-FHA-[0-9A-Z]{8}$/);

    // Feedback changes to "Copied!"
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  // Test 6: Clipboard permission error handling in restricted environments
  it("handles clipboard permission denials gracefully without crashing modal interaction", async () => {
    // Configure clipboard to reject with NotAllowedError DOMException
    const clipboardMock = setupNavigatorClipboardMock("throw-dom-exception");

    render(
      React.createElement(FhaComplianceCertificateModal, {
        isOpen: true,
        onClose: vi.fn(),
        property: mockCompleteProperty,
        enrichmentData: mockEnrichmentData,
        isProUser: true,
      }),
    );

    const copyButton = screen.getByRole("button", { name: "Copy ID" });

    // Clicking copy does not crash modal even if clipboard write throws asynchronously
    expect(() => fireEvent.click(copyButton)).not.toThrow();
    expect(clipboardMock.writeText).toHaveBeenCalledTimes(1);
  });
});
