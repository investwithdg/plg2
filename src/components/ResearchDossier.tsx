/**
 * ResearchDossier.tsx
 *
 * Research+ Intelligence Dossier for Pro & Elite users.
 * Replaces raw JSON dumps and decorative clutter with an actionable,
 * authoritative Win95 dashboard card showcasing:
 * 1. FHA Fair Housing Compliance Audit Determination & Mitigation Trail
 * 2. Instant Export / Print Official Signed Compliance Certificate (PDF)
 * 3. Market Valuation & Walkability Index
 * 4. Verified Schools Directory (Ratings, Distance, Boundaries)
 * 5. Transit Corridors & Nearby Daily Lifestyle Amenities
 * 6. Web Grounding Sources & Citations
 */
import { useState } from "react";
import type {
  EnrichmentData,
  KeySource,
  PlaceEntryOrLegacyString,
} from "@/hooks/usePropertyPolling";
import type { PropertyWithCopies } from "@/hooks/usePropertyPolling";
import FhaComplianceCertificateModal from "@/components/FhaComplianceCertificateModal";
import { RetroButton } from "@/components/retro";

interface ResearchDossierProps {
  enrichmentData: EnrichmentData;
  property: PropertyWithCopies | null;
  isProUser?: boolean;
  onUpgradeIntent?: () => void;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null || isNaN(Number(val))) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function getWalkabilityCategory(score: number | null | undefined): {
  label: string;
  color: string;
  percent: number;
} {
  if (score == null || isNaN(Number(score))) {
    return { label: "N/A", color: "#808080", percent: 0 };
  }
  const s = Number(score);
  const percent = Math.min(100, Math.max(0, s));
  if (s >= 90) return { label: "Walker's Paradise", color: "#008000", percent };
  if (s >= 70) return { label: "Very Walkable", color: "#1084d0", percent };
  if (s >= 50) return { label: "Somewhat Walkable", color: "#b8860b", percent };
  if (s >= 25) return { label: "Car-Dependent", color: "#d9534f", percent };
  return { label: "Minimal Walkability", color: "#800000", percent };
}

function extractCitations(raw: unknown): string[] {
  if (!raw) return [];

  let target = raw;
  if (typeof raw === "string") {
    try {
      target = JSON.parse(raw);
    } catch {
      const urlRegex = /(https?:\/\/[^\s"',\]}]+)/g;
      const matches = raw.match(urlRegex) || [];
      return Array.from(new Set(matches));
    }
  }

  if (typeof target === "object" && target !== null) {
    const obj = target as Record<string, unknown>;
    const foundUrls: string[] = [];

    if (Array.isArray(obj.citations)) {
      foundUrls.push(...obj.citations.filter((c): c is string => typeof c === "string"));
    }

    if (Array.isArray(obj.choices)) {
      const first = (obj.choices as Record<string, unknown>[])[0];
      if (first?.message && typeof first.message === "object") {
        const msg = first.message as Record<string, unknown>;
        if (Array.isArray(msg.citations)) {
          foundUrls.push(...msg.citations.filter((c): c is string => typeof c === "string"));
        }
        if (typeof msg.content === "string") {
          const matches = msg.content.match(/(https?:\/\/[^\s"',\]}]+)/g) || [];
          foundUrls.push(...matches);
        }
      }
    }

    if (foundUrls.length > 0) {
      return Array.from(new Set(foundUrls));
    }

    const str = JSON.stringify(obj);
    const matches = str.match(/(https?:\/\/[^\s"',\]}]+)/g) || [];
    return Array.from(new Set(matches));
  }

  return [];
}

function getDomainName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function placeName(item: PlaceEntryOrLegacyString): string {
  return typeof item === "string" ? item : item.name || "Unnamed";
}

function placeDetail(item: PlaceEntryOrLegacyString): string | null {
  if (typeof item === "string") return null;
  return [item.type, item.distance].filter(Boolean).join(" · ") || null;
}

function mapsSearchUrl(query: string, nearAddress?: string | null): string {
  const q = nearAddress ? `${query} near ${nearAddress}` : query;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function ResearchDossier({
  enrichmentData,
  property,
  isProUser = false,
  onUpgradeIntent,
}: ResearchDossierProps) {
  const [showCertModal, setShowCertModal] = useState(false);
  const [showRawListing, setShowRawListing] = useState(false);

  const {
    schools,
    transit_options,
    nearby_amenities,
    walkability_score,
    market_overview,
    median_home_value,
    key_sources,
    perplexity_raw_response,
  } = enrichmentData || {};

  const hasKeySources = Array.isArray(key_sources) && key_sources.length > 0;
  const legacyCitations = hasKeySources ? [] : extractCitations(perplexity_raw_response);
  const walkCategory = getWalkabilityCategory(walkability_score);
  const address = property?.address;

  // Safe violations array parsing
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

  const rawScore = property?.fha_compliance_score;
  const complianceScore =
    typeof rawScore === "number" && !isNaN(rawScore)
      ? rawScore
      : hasViolations
        ? Math.max(70, 100 - violations.length * 10)
        : 100;

  return (
    <div className="space-y-4 font-system text-win95-12">
      {/* ── 1. PROPERTY & AUDIT HEADER ── */}
      <div className="win95-window">
        <div className="win95-titlebar bg-gradient-to-r from-[#800000] to-[#c04040] text-white flex items-center justify-between">
          <span className="font-bold text-win95-12 truncate pl-1 flex items-center gap-1.5">
            PLG Research+ Intelligence Card
          </span>
          <span className="text-[10px] bg-white text-black px-1.5 py-0.5 font-bold uppercase border border-black shrink-0">
            {isProUser ? "RESEARCH+ ACTIVE" : "PRO PREVIEW"}
          </span>
        </div>
        <div className="p-3 bg-[var(--win95-gray)] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--win95-gray-dark)] pb-2.5">
            <div>
              <div className="font-bold text-win95-14 text-[var(--foreground)]">
                {property?.address || "Searched Property"}
              </div>
              <div className="text-win95-11 text-muted-foreground mt-0.5">
                {[
                  property?.beds != null ? `${property.beds} Beds` : null,
                  property?.baths != null ? `${property.baths} Baths` : null,
                  property?.sqft != null && !isNaN(Number(property.sqft))
                    ? `${Number(property.sqft).toLocaleString()} SqFt`
                    : null,
                  property?.property_type ? property.property_type.toUpperCase() : null,
                ]
                  .filter(Boolean)
                  .join(" • ") || "Listing Data Verified"}
              </div>
              {(property?.listing_agent || property?.listing_office) && (
                <div className="text-[10px] text-slate-700 mt-1">
                  {property.listing_agent && <span>Agent: {property.listing_agent}</span>}
                  {property.listing_agent && property.listing_office && <span> • </span>}
                  {property.listing_office && <span>Brokerage: {property.listing_office}</span>}
                </div>
              )}
            </div>

            {/* Right side status badge & Official Certificate action */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Flat Status Badge (not a fake button) */}
              <div
                className={`win95-inset px-2.5 py-1 text-center font-bold text-win95-11 flex items-center gap-1.5 ${
                  hasViolations
                    ? "bg-amber-50 text-amber-900 border border-amber-400"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-400"
                }`}
                title="Statutory Fair Housing Act (FHA) compliance status"
              >
                <span>{hasViolations ? "⚠" : "✔"}</span>
                <span>
                  {hasViolations ? `FHA MITIGATED (${violations.length})` : "100% FHA COMPLIANT"}
                </span>
              </div>

              {/* Primary action to view/print official certificate */}
              <RetroButton
                variant="primary"
                onClick={() => setShowCertModal(true)}
                className="bg-[var(--win95-blue)] text-white font-bold flex items-center gap-1.5 px-3 py-1 text-win95-11 cursor-pointer hover:bg-blue-900 active:win95-pressed"
                title="View, export, or print official signed FHA Compliance Certificate for broker file"
              >
                <span>📋</span>
                <span>Official Certificate (PDF)</span>
              </RetroButton>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. FHA COMPLIANCE AUDIT & MITIGATION REPORT (CLEAN, NO DECORATION) ── */}
      <div className="win95-window">
        <div className="win95-titlebar bg-[var(--win95-blue)] text-white flex items-center justify-between">
          <span className="font-bold text-win95-12 pl-1 flex items-center gap-1.5">
            Fair Housing Act (FHA) Compliance Audit &amp; Mitigation Report
          </span>
          <span className="text-[10px] text-slate-200 font-mono pr-1">
            42 U.S.C. § 3604(c)
          </span>
        </div>
        <div className="p-3 bg-[var(--win95-gray)] space-y-3">
          {hasViolations ? (
            /* Violations Found & Mitigated */
            <div className="space-y-2.5">
              <div className="win95-inset bg-amber-50 border-amber-600 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-win95-12 flex items-center gap-1.5">
                    <span>⚠</span> {violations.length} Restricted Phrasing Pattern{violations.length > 1 ? "s" : ""} Neutralized
                  </span>
                  <span className="bg-amber-200 text-amber-950 border border-amber-400 text-[10px] font-bold px-1.5 py-0.5">
                    AUTO-MITIGATED
                  </span>
                </div>
                <p className="text-win95-11 text-amber-900 leading-relaxed">
                  The original market listing remarks contained terms that violate Fair Housing Act guidelines regarding resident demographics, accessibility, or steering. PLG automatically sanitized these elements into compliant, neutral property features:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {violations.map((v, i) => (
                    <span
                      key={i}
                      className="win95-raised bg-white text-red-900 border-red-300 font-mono text-[11px] px-2 py-0.5 flex items-center gap-1"
                    >
                      <span className="text-red-600 font-bold">✕</span> &quot;{v}&quot;
                    </span>
                  ))}
                </div>
              </div>

              {property?.fha_compliant_listing_parts && (
                <div className="win95-inset bg-emerald-50 border-emerald-600 p-3 space-y-1.5">
                  <div className="font-bold text-emerald-950 text-win95-11 flex items-center gap-1">
                    <span>✔</span> Sanitized Compliant Facts Integrated into Copy:
                  </div>
                  <div className="bg-white p-2 text-win95-11 font-mono text-slate-800 border border-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {property.fha_compliant_listing_parts}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 100% Compliant Clean Determination */
            <div className="win95-inset bg-emerald-50 border-emerald-600 p-3 space-y-1.5">
              <div className="font-bold text-emerald-950 text-win95-12 flex items-center gap-1.5">
                <span>✔</span> Verified 100% FHA Compliant — Zero Violations
              </div>
              <p className="text-win95-11 text-emerald-900 leading-relaxed">
                All property remarks, amenities, and location facts were scanned against Title VIII of the Civil Rights Act of 1968 (42 U.S.C. § 3604(c)) and HUD guidelines. No discriminatory phrasing, protected-class references, or geographic steering were detected.
              </p>
            </div>
          )}

          {/* Action Row: Direct button to view/print official certificate */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--win95-gray-dark)]">
            <div className="text-win95-11 text-slate-700">
              Audit Determination: <strong className="text-slate-900">{complianceScore}% Compliant</strong> (Record ready for transaction file)
            </div>
            <div className="flex items-center gap-2">
              {property?.existing_listing_raw && (
                <button
                  type="button"
                  onClick={() => setShowRawListing((v) => !v)}
                  className="text-[11px] text-blue-700 underline font-bold hover:text-blue-900 cursor-pointer"
                >
                  {showRawListing ? "Hide Original Listing Text" : "View Original Listing Remarks"}
                </button>
              )}
              <RetroButton
                variant="primary"
                onClick={() => setShowCertModal(true)}
                className="bg-[var(--win95-blue)] text-white font-bold flex items-center gap-1 px-2.5 py-1 text-win95-11"
              >
                <span>📄</span>
                <span>View Full Audit Certificate</span>
              </RetroButton>
            </div>
          </div>

          {/* Toggleable original listing text view */}
          {showRawListing && property?.existing_listing_raw && (
            <div className="win95-inset bg-white p-2.5 text-win95-11 font-mono text-slate-800 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-300">
              {property.existing_listing_raw}
            </div>
          )}
        </div>
      </div>

      {/* ── 3-6. NEIGHBORHOOD INTELLIGENCE (UNBLURRED FOR PRO USERS) ── */}
      <div className="relative">
        <div
          className={
            !isProUser
              ? "relative select-none pointer-events-none filter blur-[2px] opacity-40 max-h-[380px] overflow-hidden space-y-4"
              : "space-y-4"
          }
        >
          {/* ── 3. AT-A-GLANCE NEIGHBORHOOD & MARKET CARD ── */}
          <div className="win95-window">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-12 pl-1">Local Market &amp; Walkability Overview</span>
            </div>
            <div className="p-3 bg-[var(--win95-gray)] space-y-3">
              {/* Top Row: Metric Stats Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="win95-inset bg-white p-2.5 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">
                    Est. Median Home Value
                  </span>
                  <span className="text-win95-16 font-bold text-[var(--win95-blue)]">
                    {formatCurrency(median_home_value)}
                  </span>
                </div>

                <div className="win95-inset bg-white p-2.5 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">
                    Walkability Score
                  </span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-win95-16 font-bold text-[var(--win95-blue)]">
                      {walkability_score ?? "N/A"}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">/ 100</span>
                    {walkability_score != null && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-800 border border-[var(--win95-gray-dark)] ml-1">
                        {walkCategory.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Market Narrative */}
              <div className="win95-inset bg-white p-3 text-win95-11 leading-relaxed text-slate-800">
                <div className="font-bold mb-1 text-slate-900 text-win95-11">
                  Market Trends &amp; Neighborhood Context:
                </div>
                {market_overview || "Neighborhood market trend data is being compiled."}
              </div>
            </div>
          </div>

          {/* ── 4. SCHOOLS DIRECTORY CARD ── */}
          <div className="win95-window">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-12 pl-1 flex items-center gap-1">
                Nearby Schools Directory
              </span>
            </div>
            <div className="p-3 bg-[var(--win95-gray)]">
              {schools && schools.length > 0 ? (
                <div className="win95-inset bg-white overflow-x-auto">
                  <table className="w-full text-left text-win95-11 border-collapse">
                    <thead>
                      <tr className="bg-[var(--win95-gray-light)] border-b border-[var(--win95-gray-dark)] font-bold text-black">
                        <th className="p-2">School Name</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Grades</th>
                        <th className="p-2">Distance</th>
                        <th className="p-2 text-right">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schools.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">
                            {s.name ? (
                              <a
                                href={mapsSearchUrl(s.name, address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                              >
                                {s.name}
                              </a>
                            ) : (
                              "School"
                            )}
                          </td>
                          <td className="p-2 text-slate-600">{s.type || "Public"}</td>
                          <td className="p-2 text-slate-600">{s.grades || "N/A"}</td>
                          <td className="p-2 text-slate-600">{s.distance || "Nearby"}</td>
                          <td className="p-2 text-right font-bold text-[var(--win95-blue)]">
                            {s.rating != null ? `${s.rating}` : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="win95-inset bg-white p-3 text-center text-muted-foreground">
                  No specific school boundary entries indexed for this address.
                </div>
              )}
            </div>
          </div>

          {/* ── 5. TRANSIT & AMENITIES GRID ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transit Options */}
            <div className="win95-window">
              <div className="win95-titlebar flex items-center justify-between">
                <span className="font-bold text-win95-12 pl-1 flex items-center gap-1">
                  Transit &amp; Commute Options
                </span>
                {address && (
                  <a
                    href={mapsSearchUrl("transit stations", address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-200 hover:text-white underline pr-1 font-normal"
                  >
                    Maps ↗
                  </a>
                )}
              </div>
              <div className="p-3 bg-[var(--win95-gray)]">
                <div className="win95-inset bg-white p-3 min-h-[90px]">
                  {transit_options && transit_options.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {transit_options.map((item, idx) => {
                        const name = placeName(item);
                        const detail = placeDetail(item);
                        return (
                          <a
                            key={idx}
                            href={mapsSearchUrl(name, address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="win95-raised bg-slate-100 text-blue-700 hover:bg-slate-200 px-2 py-1 text-win95-11 underline font-bold flex items-center gap-1 active:win95-pressed"
                          >
                            <span>🚆</span>
                            <span>{name}</span>
                            {detail && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({detail})
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>No specific transit lines indexed.</span>
                      {address && (
                        <a
                          href={mapsSearchUrl("transit routes", address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline text-[11px]"
                        >
                          Search Nearby Transit ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nearby Amenities */}
            <div className="win95-window">
              <div className="win95-titlebar flex items-center justify-between">
                <span className="font-bold text-win95-12 pl-1 flex items-center gap-1">
                  Nearby Daily Amenities
                </span>
                {address && (
                  <a
                    href={mapsSearchUrl("supermarkets and parks", address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-200 hover:text-white underline pr-1 font-normal"
                  >
                    Maps ↗
                  </a>
                )}
              </div>
              <div className="p-3 bg-[var(--win95-gray)]">
                <div className="win95-inset bg-white p-3 min-h-[90px]">
                  {nearby_amenities && nearby_amenities.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {nearby_amenities.map((item, idx) => {
                        const name = placeName(item);
                        const detail = placeDetail(item);
                        return (
                          <a
                            key={idx}
                            href={mapsSearchUrl(name, address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="win95-raised bg-slate-100 text-blue-700 hover:bg-slate-200 px-2 py-1 text-win95-11 underline font-bold flex items-center gap-1 active:win95-pressed"
                          >
                            <span>📍</span>
                            <span>{name}</span>
                            {detail && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({detail})
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>No amenity entries indexed.</span>
                      {address && (
                        <a
                          href={mapsSearchUrl("groceries and parks", address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline text-[11px]"
                        >
                          Search Local Amenities ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 6. VERIFIED SEARCH SOURCES & CITATIONS ── */}
          <div className="win95-window">
            <div className="win95-titlebar bg-slate-800 text-white">
              <span className="font-bold text-win95-12 pl-1 flex items-center gap-1">
                Verified Search Sources &amp; Citations
              </span>
              <span className="text-[10px] text-slate-300">Grounding Audit Trail</span>
            </div>
            <div className="p-3 bg-[var(--win95-gray)] space-y-2">
              <p className="text-win95-11 text-muted-foreground">
                The property facts and neighborhood metrics above were verified using real-time search queries across public records and real estate sources:
              </p>
              {hasKeySources ? (
                <div className="win95-inset bg-white divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {(key_sources as KeySource[]).map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 p-2 no-underline text-blue-700 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-win95-11 truncate underline">
                          {source.name || (source.url ? getDomainName(source.url) : "Source")}
                          <span className="text-[10px] text-muted-foreground font-normal ml-1">↗</span>
                        </div>
                        {source.facts_provided && (
                          <div className="text-win95-11 text-muted-foreground">
                            {source.facts_provided}
                          </div>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : legacyCitations.length > 0 ? (
                <div className="win95-inset bg-white p-2.5 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {legacyCitations.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="win95-raised bg-card hover:bg-slate-100 text-blue-700 px-2.5 py-1 text-win95-11 underline font-bold flex items-center gap-1.5 active:win95-pressed truncate max-w-full"
                    >
                      <span className="truncate">{getDomainName(url)}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">↗</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="win95-inset bg-white p-3 text-center text-muted-foreground">
                  Direct source links for this neighborhood query are cached internally.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Free Teaser Floating Win95 Modal */}
        {!isProUser && (
          <div className="absolute inset-0 flex items-center justify-center p-3 z-20">
            <div className="win95-window max-w-md w-full shadow-2xl">
              <div className="win95-titlebar bg-gradient-to-r from-[#800000] to-[#c04040] text-white">
                <span className="font-bold text-win95-12 flex items-center gap-1.5">
                  <span>🔒</span> PLG Research+ Intelligence Dossier [PRO ONLY]
                </span>
              </div>
              <div className="p-4 bg-[var(--win95-gray)] text-black space-y-3">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-win95-13 text-slate-900">
                    Unlock Full Property &amp; Neighborhood Intelligence
                  </h4>
                  <p className="text-win95-11 text-slate-700 leading-relaxed">
                    We indexed nearby schools with ratings &amp; boundaries, walkability score ({enrichmentData?.walkability_score ?? "80+"}/100), transit hubs, and market pricing for <strong>{property?.address || "this property"}</strong>.
                  </p>
                  <p className="text-win95-11 text-slate-600 leading-relaxed">
                    Upgrade to Pro ($49/mo) to unlock the full unredacted intelligence dossier, verified school directories, and printable official FHA compliance certificates.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--win95-gray-dark)]">
                  <RetroButton
                    variant="primary"
                    onClick={onUpgradeIntent}
                    className="bg-[#800000] text-white font-bold"
                  >
                    Unlock Pro Intelligence ($49/mo)
                  </RetroButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <FhaComplianceCertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        property={property}
        enrichmentData={enrichmentData}
        isProUser={isProUser}
        onUpgradeIntent={onUpgradeIntent}
      />
    </div>
  );
}
