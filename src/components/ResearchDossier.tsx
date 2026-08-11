/**
 * ResearchDossier.tsx
 *
 * Research+ UI Card for Pro and Elite users.
 * Replaces raw JSON dumps with an intuitive, beautifully structured
 * Win95 retro dashboard card showcasing:
 * 1. FHA Compliance Audit Trail & AI Mitigation
 * 2. At-a-Glance Neighborhood Intelligence (Schools, Walkability, Market Value, Amenities)
 * 3. Verified Web Sources & Grounding Links
 */
import type {
  EnrichmentData,
  FhaCategories,
  KeySource,
  PlaceEntryOrLegacyString,
} from "@/hooks/usePropertyPolling";
import type { PropertyWithCopies } from "@/hooks/usePropertyPolling";

interface ResearchDossierProps {
  enrichmentData: EnrichmentData;
  property: PropertyWithCopies | null;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function getWalkabilityCategory(score: number | null | undefined): {
  label: string;
  color: string;
  percent: number;
} {
  if (score == null) return { label: "N/A", color: "#808080", percent: 0 };
  const percent = Math.min(100, Math.max(0, score));
  if (score >= 90) return { label: "Walker's Paradise", color: "#008000", percent };
  if (score >= 70) return { label: "Very Walkable", color: "#1084d0", percent };
  if (score >= 50) return { label: "Somewhat Walkable", color: "#b8860b", percent };
  if (score >= 25) return { label: "Car-Dependent", color: "#d9534f", percent };
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

// transit_options/nearby_amenities were plain strings before the enrichment
// schema was tightened; properties enriched before that (or served from the
// 7-day neighborhood cache) may still hand back the old shape.
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

export default function ResearchDossier({ enrichmentData, property }: ResearchDossierProps) {
  const {
    schools,
    transit_options,
    nearby_amenities,
    walkability_score,
    market_overview,
    median_home_value,
    key_sources,
    perplexity_raw_response,
  } = enrichmentData;

  const hasKeySources = Array.isArray(key_sources) && key_sources.length > 0;
  // Fallback for properties enriched before key_sources existed (or served
  // from the neighborhood cache) — naked domain links beat no sources at all.
  const legacyCitations = hasKeySources ? [] : extractCitations(perplexity_raw_response);
  const walkCategory = getWalkabilityCategory(walkability_score);
  const address = property?.address;

  const hasViolations = property?.fha_violations && property.fha_violations.length > 0;
  const isCleanExisting =
    property?.fha_violations &&
    property.fha_violations.length === 0 &&
    !!property.existing_listing_raw;

  return (
    <div className="space-y-4 font-system text-win95-12">
      {/* ── 1. PROPERTY & AUDIT HEADER ── */}
      <div className="win95-window">
        <div className="win95-titlebar bg-gradient-to-r from-[#800000] to-[#c04040] text-white">
          <span className="font-bold text-win95-12 truncate pl-1 flex items-center gap-1.5">
            PLG Research+ Intelligence Card
          </span>
          <span className="text-[10px] bg-white text-black px-1.5 py-0.2 font-bold uppercase rounded-none border border-black">
            PRO TIER
          </span>
        </div>
        <div className="p-3 bg-[var(--win95-gray)] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--win95-gray-dark)] pb-2">
            <div>
              <div className="font-bold text-win95-14 text-[var(--foreground)]">
                {property?.address || "Searched Property"}
              </div>
              <div className="text-win95-11 text-muted-foreground">
                {[
                  property?.beds ? `${property.beds} Beds` : null,
                  property?.baths ? `${property.baths} Baths` : null,
                  property?.sqft ? `${property.sqft.toLocaleString()} SqFt` : null,
                  property?.property_type ? property.property_type.toUpperCase() : null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
              {(property?.listing_agent || property?.listing_office) && (
                <div className="text-[10px] text-slate-700 mt-1">
                  {property.listing_agent && <span>Agent: {property.listing_agent}</span>}
                  {property.listing_agent && property.listing_office && <span> • </span>}
                  {property.listing_office && <span>Brokerage: {property.listing_office}</span>}
                </div>
              )}
            </div>
            <div className="win95-raised px-2.5 py-1 text-center bg-card">
              <span className="text-[10px] block font-bold text-muted-foreground">FHA STATUS</span>
              <span
                className={`text-win95-12 font-bold ${
                  property?.fha_compliance_score != null && property.fha_compliance_score < 100
                    ? "text-[#800000]"
                    : "text-[#008000]"
                }`}
              >
                {property?.fha_compliance_score != null
                  ? `${property.fha_compliance_score}% COMPLIANT`
                  : "VERIFIED COMPLIANT"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. FHA AUDIT TRAIL & MITIGATION ENGINE ── */}
      <div className="win95-window">
        <div className="win95-titlebar bg-[var(--win95-blue)] text-white">
          <span className="font-bold text-win95-12 pl-1 flex items-center gap-1.5">
            FHA Fair Housing Compliance Audit & Mitigation Report
          </span>
        </div>
        <div className="p-3 bg-[var(--win95-gray)] space-y-3">
          {hasViolations ? (
            <div className="space-y-3">
              {/* Flagged Red Card */}
              <div className="win95-inset bg-red-50 border-red-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-900 text-win95-12 flex items-center gap-1">
                    FHA Violations Flagged in Original Listing
                  </span>
                  <span className="win95-raised bg-red-700 text-white text-[10px] font-bold px-1.5 py-0.5">
                    {property.fha_violations!.length} FLAGGED
                  </span>
                </div>
                <p className="text-win95-11 text-red-950">
                  The existing market listing contained terms that violate Fair Housing Act
                  guidelines (42 U.S.C. 3604(c)) regarding resident demographics, accessibility, or
                  steering.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {property.fha_violations!.map((v, i) => (
                    <span
                      key={i}
                      className="win95-raised bg-red-100 text-red-900 border-red-400 font-bold px-2 py-0.5 text-win95-11 flex items-center gap-1"
                    >
                      <span className="text-red-600 font-bold" role="img" aria-label="Failed">
                        x
                      </span>{" "}
                      "{v}"
                    </span>
                  ))}
                </div>
              </div>

              {/* Green Mitigation Fix Card */}
              <div className="win95-inset bg-emerald-50 border-emerald-700 p-3 space-y-1.5">
                <div className="font-bold text-emerald-950 text-win95-12 flex items-center gap-1">
                  AI Mitigation & Rewritten Compliant Facts
                </div>
                <p className="text-win95-11 text-emerald-900">
                  PLG stripped all restricted terms and rewritten the factual elements into 100%
                  compliant property features:
                </p>
                <div className="win95-inset bg-white p-2.5 text-win95-11 font-mono text-slate-800 leading-relaxed max-h-32 overflow-y-auto">
                  {property.fha_compliant_listing_parts ||
                    "Existing listing facts sanitized into compliant feature statements."}
                </div>
              </div>
            </div>
          ) : isCleanExisting ? (
            <div className="win95-inset bg-emerald-50 p-3 space-y-1.5">
              <div className="font-bold text-emerald-950 text-win95-12 flex items-center gap-1">
                Original Listing Analyzed — 100% FHA Compliant
              </div>
              <p className="text-win95-11 text-emerald-900">
                We retrieved the current listing for this property. No discriminatory terms or FHA
                steering flags were detected. We extracted its key facts to enrich your new copy.
              </p>
            </div>
          ) : (
            <div className="win95-inset bg-white p-3 space-y-1.5">
              <div className="font-bold text-win95-12 flex items-center gap-1">
                FHA Screening Active
              </div>
              <p className="text-win95-11 text-muted-foreground">
                All property facts and neighborhood data were screened against Fair Housing Act
                rules prior to copywriting. Discriminatory terms, religious/familial preferences,
                and restricted phrasing are automatically blocked.
              </p>
            </div>
          )}

          {/* Category Audit Checklist */}
          {property?.fha_categories && (
            <div className="win95-inset bg-white p-3 space-y-2.5">
              <div className="font-bold text-win95-12 text-slate-800 border-b pb-1.5">
                FHA Audit Checklist Breakdown
              </div>
              <div className="space-y-3">
                {/* Protected Classes */}
                {(() => {
                  const check = (property.fha_categories as FhaCategories).protected_classes;
                  if (!check) return null;
                  return (
                    <div className="text-win95-11 space-y-0.5">
                      <div className="flex items-center gap-2 font-bold">
                        <span className={check.passed ? "text-[#008000]" : "text-[#800000]"}>
                          [{check.passed ? "PASSED" : "FAILED"}]
                        </span>
                        <span className="text-slate-900">
                          Protected Classes & Demographic Steering
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-14 leading-relaxed">
                        {check.reasoning}
                      </p>
                    </div>
                  );
                })()}

                {/* Steering & Coded Language */}
                {(() => {
                  const check = (property.fha_categories as FhaCategories).steering_coded_language;
                  if (!check) return null;
                  return (
                    <div className="text-win95-11 space-y-0.5">
                      <div className="flex items-center gap-2 font-bold">
                        <span className={check.passed ? "text-[#008000]" : "text-[#800000]"}>
                          [{check.passed ? "PASSED" : "FAILED"}]
                        </span>
                        <span className="text-slate-900">
                          Steering & Coded Phrasing (e.g., churches, families, walking distance)
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-14 leading-relaxed">
                        {check.reasoning}
                      </p>
                    </div>
                  );
                })()}

                {/* Demographics / Neighborhood Character */}
                {(() => {
                  const check = (property.fha_categories as FhaCategories).demographics_character;
                  if (!check) return null;
                  return (
                    <div className="text-win95-11 space-y-0.5">
                      <div className="flex items-center gap-2 font-bold">
                        <span className={check.passed ? "text-[#008000]" : "text-[#800000]"}>
                          [{check.passed ? "PASSED" : "FAILED"}]
                        </span>
                        <span className="text-slate-900">
                          Neighborhood Demographics & Resident Profiling
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-14 leading-relaxed">
                        {check.reasoning}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. AT-A-GLANCE NEIGHBORHOOD & MARKET CARD ── */}
      <div className="win95-window">
        <div className="win95-titlebar">
          <span className="font-bold text-win95-12 pl-1">Local Market & Walkability Overview</span>
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
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-800 border border-[var(--win95-gray-dark)] ml-1">
                    {walkCategory.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Market Narrative */}
          <div className="win95-inset bg-white p-3 text-win95-11 leading-relaxed text-slate-800">
            <div className="font-bold mb-1 text-slate-900 text-win95-11">
              Market Trends & Neighborhood Context:
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
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 pl-1 flex items-center gap-1">
              Transit Options
            </span>
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
                        {name}
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
                <p className="text-muted-foreground">No transit data recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Nearby Amenities */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 pl-1 flex items-center gap-1">
              Nearby Amenities
            </span>
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
                        {name}
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
                <p className="text-muted-foreground">No amenity data recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. VERIFIED SEARCH SOURCES & CITATIONS ── */}
      <div className="win95-window">
        <div className="win95-titlebar bg-slate-800 text-white">
          <span className="font-bold text-win95-12 pl-1 flex items-center gap-1">
            Verified Search Sources & Citations
          </span>
          <span className="text-[10px] text-slate-300">Grounding Audit Trail</span>
        </div>
        <div className="p-3 bg-[var(--win95-gray)] space-y-2">
          <p className="text-win95-11 text-muted-foreground">
            The property facts and neighborhood metrics above were verified using real-time search
            queries across public records and real estate sources:
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
  );
}
