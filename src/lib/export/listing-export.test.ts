import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildExportFilename, downloadTextFile, exportListing } from "./listing-export";

describe("exportListing", () => {
  it("formats markdown with headline and address", () => {
    const out = exportListing(
      { headline: "Charming Bungalow", address: "123 Main St", body: "Great home." },
      "markdown",
    );
    expect(out).toContain("# Charming Bungalow");
    expect(out).toContain("**123 Main St**");
    expect(out).toContain("Great home.");
  });

  it("formats plain txt with address and generated date", () => {
    const out = exportListing(
      {
        headline: "MLS",
        address: "123 Main St",
        body: "Great home.",
        createdAt: "January 1, 2026",
      },
      "txt",
    );
    expect(out).toBe("MLS\n123 Main St\nGenerated January 1, 2026\nGreat home.");
  });

  it("formats json", () => {
    const listing = { headline: "MLS", body: "Great home." };
    const out = exportListing(listing, "json");
    expect(JSON.parse(out)).toEqual(listing);
  });

  it("formats csv with quoted cells", () => {
    const out = exportListing(
      { address: "123 Main St", headline: "MLS", body: "Great home, indeed." },
      "csv",
    );
    expect(out.split("\n")[0]).toBe("address,headline,channel,createdAt,body");
    expect(out).toContain('"Great home, indeed."');
  });

  it("defaults to markdown when body has no headline/address", () => {
    const out = exportListing({ body: "Just the facts." });
    expect(out).toBe("# Listing\nJust the facts.");
  });
});

describe("buildExportFilename", () => {
  it("slugifies address and appends the label", () => {
    expect(buildExportFilename("123 Main St, Austin, TX", "mls")).toBe("123-main-st-austin-tx-mls");
  });

  it("falls back to 'listing' when address is missing", () => {
    expect(buildExportFilename(undefined, "social")).toBe("listing-social");
  });

  it("strips punctuation from the label", () => {
    expect(buildExportFilename("42 Elm", "Email Copy!")).toBe("42-elm-email-copy");
  });
});

describe("downloadTextFile", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("creates and clicks a download link with a .txt extension", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadTextFile("123-main-st-mls", "Great home.");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
  });

  it("does not double up the .txt extension if already present", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, "appendChild");

    downloadTextFile("already-named.txt", "content");

    const appendedLink = appendSpy.mock.calls
      .map(([node]) => node)
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    expect(appendedLink?.download).toBe("already-named.txt");

    clickSpy.mockRestore();
    appendSpy.mockRestore();
  });
});
