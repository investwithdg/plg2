import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP_RELEASE_TAG, APP_VERSION } from "./version";

describe("Canonical repository versioning", () => {
  const repoRoot = path.resolve(__dirname, "../..");

  it("follows strict X.Y.Z semantic versioning", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_RELEASE_TAG).toBe(`v${APP_VERSION}`);
  });

  it("matches package.json and package-lock.json version fields", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
      version?: string;
    };
    const lock = JSON.parse(fs.readFileSync(path.join(repoRoot, "package-lock.json"), "utf8")) as {
      version?: string;
      packages?: { ""?: { version?: string } };
    };

    expect(pkg.version).toBe(APP_VERSION);
    expect(lock.version).toBe(APP_VERSION);
    expect(lock.packages?.[""]?.version).toBe(APP_VERSION);
  });

  it("matches the MCP server handshake version and top CHANGELOG.md release entry", () => {
    const mcpHandler = fs.readFileSync(
      path.join(repoRoot, "supabase/functions/mcp/handler.ts"),
      "utf8",
    );
    expect(mcpHandler).toContain(`version: "${APP_VERSION}"`);

    const changelog = fs.readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
    expect(changelog).toContain(`## [${APP_VERSION}]`);
  });
});
