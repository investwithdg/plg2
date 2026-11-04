// Listing export for Pro users (switching-cost lock: PLG becomes the system of record
// you export from). ADDITIVE infra; gate behind your Pro subscription check.
export type ExportFormat = "markdown" | "csv" | "json" | "txt";

export interface ExportableListing {
  address?: string;
  headline?: string;
  body: string;
  createdAt?: string;
  channel?: string;
}

export function exportListing(
  listing: ExportableListing,
  format: ExportFormat = "markdown",
): string {
  if (format === "json") return JSON.stringify(listing, null, 2);
  if (format === "csv") {
    const headers = ["address", "headline", "channel", "createdAt", "body"];
    const cells = headers.map((h) => csvCell((listing as unknown as Record<string, unknown>)[h]));
    return headers.join(",") + "\n" + cells.join(",");
  }
  if (format === "txt") {
    const parts = [
      listing.headline ?? "Listing",
      listing.address ?? "",
      listing.createdAt ? `Generated ${listing.createdAt}` : "",
      "",
      listing.body,
    ];
    return parts.filter(Boolean).join("\n");
  }
  const parts = [
    listing.headline ? "# " + listing.headline : "# Listing",
    listing.address ? "**" + listing.address + "**" : "",
    "",
    listing.body,
  ];
  return parts.filter(Boolean).join("\n");
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return '"' + s.replaceAll('"', '""') + '"';
}

/**
 * Builds a filesystem-safe base filename (no extension) from a property
 * address and copy type, e.g. "123-main-st-austin-tx-mls".
 */
export function buildExportFilename(address: string | undefined, label: string): string {
  const base = (address || "listing")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return [base || "listing", suffix].filter(Boolean).join("-");
}

/**
 * Triggers a browser download of the given text content as a .txt file.
 * No-op outside the browser (SSR safety).
 */
export function downloadTextFile(filename: string, content: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
