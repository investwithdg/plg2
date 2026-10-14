// Listing export for Pro users (switching-cost lock: PLG becomes the system of record
// you export from). ADDITIVE infra; gate behind your Pro subscription check.
export type ExportFormat = "markdown" | "csv" | "json";

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
