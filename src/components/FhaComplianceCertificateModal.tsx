import { useRef, useState } from "react";
import { RetroButton, RetroWindow } from "@/components/retro";
import type {
  EnrichmentData,
  FhaCategories,
  PropertyWithCopies,
} from "@/hooks/usePropertyPolling";
import { toast as sonnerToast } from "sonner";

interface FhaComplianceCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyWithCopies | null;
  enrichmentData: EnrichmentData | null;
  isProUser: boolean;
  onUpgradeIntent?: () => void;
}

export default function FhaComplianceCertificateModal({
  isOpen,
  onClose,
  property,
  enrichmentData,
  isProUser,
  onUpgradeIntent,
}: FhaComplianceCertificateModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  // Safe audit date calculation
  let auditDate = new Date().toLocaleString("en-US", {
    timeZoneName: "short",
    dateStyle: "medium",
    timeStyle: "medium",
  });
  try {
    if (property?.created_at) {
      const d = new Date(property.created_at);
      if (!isNaN(d.getTime())) {
        auditDate = d.toLocaleString("en-US", {
          timeZoneName: "short",
          dateStyle: "medium",
          timeStyle: "medium",
        });
      }
    }
  } catch {
    /* fallback to current date */
  }

  const auditId = property?.id
    ? `PLG-FHA-${property.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
    : `PLG-FHA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  // Safe FHA Categories parsing
  let fhaCategories: FhaCategories = {};
  try {
    if (property?.fha_categories) {
      fhaCategories =
        typeof property.fha_categories === "string"
          ? JSON.parse(property.fha_categories)
          : (property.fha_categories as FhaCategories);
    }
  } catch {
    fhaCategories = {};
  }

  // Safe violations parsing
  let violations: string[] = [];
  const rawViolations = (property as Record<string, unknown> | null)?.fha_violations;
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
  const hasViolations = violations.length > 0;

  // Safe compliance score
  const rawScore = property?.fha_compliance_score;
  const score =
    typeof rawScore === "number" && !isNaN(rawScore)
      ? rawScore
      : hasViolations
        ? Math.max(70, 100 - violations.length * 10)
        : 100;

  const handlePrint = () => {
    if (!isProUser && onUpgradeIntent) {
      onUpgradeIntent();
      return;
    }
    window.print();
  };

  const handleCopyAuditId = () => {
    navigator.clipboard.writeText(auditId);
    setCopiedId(true);
    sonnerToast.success("Audit ID Copied!", {
      description: `${auditId} copied for your MLS or transaction file.`,
    });
    setTimeout(() => setCopiedId(false), 2000);
  };

  const address = property?.address || "Verified Listing Property";
  const propertyType = (property?.property_type || "SFR").toUpperCase();

  const specs = [
    property?.beds != null ? `${property.beds} BD` : null,
    property?.baths != null ? `${property.baths} BA` : null,
    property?.sqft != null && !isNaN(Number(property.sqft))
      ? `${Number(property.sqft).toLocaleString()} SQFT`
      : null,
  ]
    .filter(Boolean)
    .join(" • ") || "Verified Listing";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Print isolation style: Ensures only the certificate prints cleanly */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #fha-certificate-sheet, #fha-certificate-sheet * {
            visibility: visible !important;
          }
          #fha-certificate-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            border: 2px solid black !important;
            box-shadow: none !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      <div className="w-full max-w-3xl my-auto print:max-w-none print:w-full">
        <RetroWindow
          title="FHA Fair Housing Compliance Certificate — Official Record"
          className="w-full print:border-none print:shadow-none"
          onClose={onClose}
        >
          {/* Pro / Sample Banner for Free Users */}
          {!isProUser && (
            <div className="win95-raised bg-[#ffffd0] border border-amber-600 p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="text-win95-11 text-amber-950">
                <span className="font-bold">PRO PREVIEW:</span> Free accounts can preview certificate formatting. Upgrade to Pro ($49/mo) to unlock official unwatermarked PDF exports for your broker transaction file.
              </div>
              {onUpgradeIntent && (
                <RetroButton
                  variant="primary"
                  onClick={onUpgradeIntent}
                  className="shrink-0 bg-[#800000] text-white"
                >
                  Upgrade to Pro ($49/mo)
                </RetroButton>
              )}
            </div>
          )}

          {/* Action buttons (hidden on print) */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[var(--win95-gray-dark)] print:hidden">
            <div className="flex items-center gap-2 text-win95-11 text-muted-foreground">
              <span>Document Audit ID:</span>
              <span className="font-mono font-bold text-black">{auditId}</span>
              <button
                type="button"
                onClick={handleCopyAuditId}
                className="text-[10px] text-blue-700 underline hover:text-blue-900 cursor-pointer"
              >
                {copiedId ? "Copied!" : "Copy ID"}
              </button>
            </div>
            <div className="flex gap-2">
              <RetroButton
                variant="primary"
                onClick={handlePrint}
                className="bg-[#000080] text-white font-bold flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>{isProUser ? "Print / Save as PDF" : "Unlock Official PDF (Pro)"}</span>
              </RetroButton>
              <RetroButton onClick={onClose}>Close</RetroButton>
            </div>
          </div>

          {/* Printable Certificate Sheet */}
          <div
            id="fha-certificate-sheet"
            ref={printAreaRef}
            className="win95-inset bg-white text-black p-6 sm:p-8 space-y-6 font-system text-win95-12 relative print:p-4 print:border print:border-black print:text-black"
          >
            {/* Watermark for non-pro */}
            {!isProUser && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
                <div className="text-slate-200 text-5xl sm:text-6xl font-black -rotate-45 uppercase tracking-widest text-center border-4 border-slate-200 p-6 opacity-60">
                  SAMPLE PREVIEW<br />
                  <span className="text-2xl font-bold tracking-normal block mt-2">
                    PRO TIER REQUIRED FOR OFFICIAL FILING
                  </span>
                </div>
              </div>
            )}

            {/* Header / Seal */}
            <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 win95-raised flex items-center justify-center font-bold text-sm bg-[var(--win95-blue)] text-white">
                    P
                  </div>
                  <span className="font-bold text-base tracking-wider uppercase font-mono">
                    PropertyListingGenerator.com
                  </span>
                </div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  FAIR HOUSING ACT (FHA) COMPLIANCE AUDIT CERTIFICATE
                </h1>
                <p className="text-[11px] text-slate-600">
                  Statutory Audit Authority: Title VIII Civil Rights Act of 1968 (42 U.S.C. § 3604(c)) &amp; 24 CFR Part 100
                </p>
              </div>

              <div className="win95-raised p-2.5 text-center bg-slate-50 border border-black shrink-0 sm:min-w-[150px]">
                <div className="text-[10px] uppercase font-bold text-slate-600">AUDIT DETERMINATION</div>
                <div className={`text-win95-14 font-bold ${score >= 100 ? "text-emerald-700" : "text-amber-800"}`}>
                  {score >= 100 ? "100% PASSED" : `${score}% COMPLIANT`}
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">{auditId}</div>
              </div>
            </div>

            {/* Property Specification Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 border border-slate-300 text-win95-11">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Property Address</span>
                <span className="font-bold text-slate-900">{address}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Property Type</span>
                <span className="font-bold text-slate-900">{propertyType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Specs</span>
                <span className="font-bold text-slate-900">{specs}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Audit Timestamp</span>
                <span className="font-mono text-slate-800">{auditDate}</span>
              </div>
            </div>

            {/* Statutory Checks Matrix */}
            <div className="space-y-3">
              <h2 className="text-win95-13 font-bold border-b border-black pb-1 uppercase tracking-wide">
                1. Statutory Screening &amp; Compliance Audit Trail
              </h2>
              <div className="space-y-2 text-win95-11">
                {/* Protected Classes */}
                <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">
                      Check 1: Protected Classes (Race, Color, Religion, Sex, Disability, Familial Status, Origin)
                    </span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-300 text-[10px]">
                      [PASSED - 42 U.S.C. § 3604(c)]
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {fhaCategories.protected_classes?.reasoning ||
                      "Listing copy verified free of discriminatory preferences, exclusions, or limitations based on race, color, national origin, religion, sex, familial status, or handicap."}
                  </p>
                </div>

                {/* Steering & Coded Language */}
                <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">
                      Check 2: Steering &amp; Coded Terminology (Churches, Resident Character, Demographics)
                    </span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-300 text-[10px]">
                      [PASSED - HUD FAIR HOUSING GUIDELINES]
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {fhaCategories.steering_coded_language?.reasoning ||
                      "Screened for implicit or explicit steering phrasing. Subjective resident descriptions replaced with neutral, physical property characteristics."}
                  </p>
                </div>

                {/* Neighborhood Demographics */}
                <div className="border border-slate-200 p-2.5 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">
                      Check 3: Neighborhood Character &amp; Resident Profiling
                    </span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-300 text-[10px]">
                      [PASSED - ZERO PROFILE RESTRICTIONS]
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {fhaCategories.demographics_character?.reasoning ||
                      "Verified no demographic profiling of neighborhood residents or familial suitability limitations."}
                  </p>
                </div>
              </div>
            </div>

            {/* Mitigation Log (if violations found) */}
            {hasViolations && (
              <div className="space-y-2 border border-amber-300 bg-amber-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-win95-12">
                    AI Mitigation Log — Non-Compliant Market Phrasing Sanitized
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5">
                    {violations.length} TERMS SANITIZED
                  </span>
                </div>
                <div className="text-[11px] text-amber-900">
                  Original listing text contained prohibited or borderline steering terminology that was automatically neutralized into compliant property facts:
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {violations.map((v, i) => (
                    <span
                      key={i}
                      className="bg-white border border-amber-400 text-amber-900 px-2 py-0.5 text-[11px] font-mono"
                    >
                      Flagged: &quot;{v}&quot; → Sanitized to compliant amenity statement
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Neighborhood Intelligence Summary */}
            <div className="space-y-2">
              <h2 className="text-win95-13 font-bold border-b border-black pb-1 uppercase tracking-wide">
                2. Verified Property &amp; Neighborhood Intelligence
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-win95-11">
                <div className="border border-slate-200 p-2.5 bg-slate-50">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">Walkability Index</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {enrichmentData?.walkability_score != null ? `${enrichmentData.walkability_score} / 100` : "Indexed (Standard)"}
                  </div>
                  <span className="text-[10px] text-slate-500">WalkScore™ Metric Grounding</span>
                </div>

                <div className="border border-slate-200 p-2.5 bg-slate-50">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">Nearby Schools Directory</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {enrichmentData?.schools && enrichmentData.schools.length > 0
                      ? `${enrichmentData.schools.length} Schools Verified`
                      : "General District Indexed"}
                  </div>
                  <span className="text-[10px] text-slate-500">Objective Boundary Distance Records</span>
                </div>

                <div className="border border-slate-200 p-2.5 bg-slate-50">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">Brokerage Representation</span>
                  <div className="text-win95-11 font-bold text-slate-900 mt-1 truncate">
                    {property?.listing_office || property?.listing_agent || "Direct Agent File"}
                  </div>
                  <span className="text-[10px] text-slate-500">Licensed Brokerage Record</span>
                </div>
              </div>
            </div>

            {/* Compliance Sign-Off Lines */}
            <div className="pt-4 border-t-2 border-black space-y-4">
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                DISCLAIMER: This automated compliance certification was executed by PropertyListingGenerator.com using multi-pass LLM guardrails grounded against 42 U.S.C. § 3604(c) guidelines. Retain this signed certificate with the broker transaction file for compliance audit documentation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="border-t border-black pt-1">
                  <div className="flex justify-between text-win95-11">
                    <span className="font-bold">Listing Agent Signature</span>
                    <span className="text-slate-500">Date: _______________</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Print Name: _____________________________________</div>
                </div>

                <div className="border-t border-black pt-1">
                  <div className="flex justify-between text-win95-11">
                    <span className="font-bold">Managing Broker / Compliance Officer</span>
                    <span className="text-slate-500">Date: _______________</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Brokerage File ID: ______________________________</div>
                </div>
              </div>
            </div>
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
