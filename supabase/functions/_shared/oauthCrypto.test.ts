import { assertEquals } from "./testAssert.ts";
import {
  canonicalizeResourceUri,
  generateOpaqueToken,
  isAllowedRedirectUri,
  isProOrElite,
  sha256Hex,
  verifyPkceS256,
} from "./oauthCrypto.ts";

Deno.test("isProOrElite: gates MCP access to paid plans only", () => {
  assertEquals(isProOrElite("pro"), true);
  assertEquals(isProOrElite("elite"), true);
  assertEquals(isProOrElite("free"), false);
  assertEquals(isProOrElite(null), false);
  assertEquals(isProOrElite(undefined), false);
  assertEquals(isProOrElite("trialing"), false);
  assertEquals(isProOrElite(""), false);
});

Deno.test("sha256Hex is deterministic and hex-encoded", async () => {
  const a = await sha256Hex("hello");
  const b = await sha256Hex("hello");
  assertEquals(a, b);
  assertEquals(/^[0-9a-f]{64}$/.test(a), true);
});

Deno.test("sha256Hex distinguishes different inputs", async () => {
  const a = await sha256Hex("token-a");
  const b = await sha256Hex("token-b");
  assertEquals(a === b, false);
});

Deno.test("generateOpaqueToken produces distinct, non-empty tokens", () => {
  const a = generateOpaqueToken();
  const b = generateOpaqueToken();
  assertEquals(a === b, false);
  assertEquals(a.length > 0, true);
});

Deno.test(
  "verifyPkceS256 accepts a matching verifier/challenge pair and rejects a mismatch",
  async () => {
    const verifier = "a-code-verifier-with-plenty-of-entropy-abc123";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    assertEquals(await verifyPkceS256(verifier, challenge), true);
    assertEquals(await verifyPkceS256("wrong-verifier", challenge), false);
    assertEquals(await verifyPkceS256("", challenge), false);
    assertEquals(await verifyPkceS256(verifier, ""), false);
  },
);

Deno.test("canonicalizeResourceUri lowercases scheme/host and strips a trailing slash", () => {
  assertEquals(canonicalizeResourceUri("HTTPS://Example.COM/Mcp/"), "https://example.com/Mcp");
  assertEquals(canonicalizeResourceUri("https://example.com"), "https://example.com");
  assertEquals(canonicalizeResourceUri("https://example.com/"), "https://example.com");
});

Deno.test("canonicalizeResourceUri rejects URIs with a fragment or malformed URIs", () => {
  assertEquals(canonicalizeResourceUri("https://example.com/mcp#frag"), null);
  assertEquals(canonicalizeResourceUri("not-a-url"), null);
});

Deno.test("isAllowedRedirectUri accepts https and localhost http, rejects everything else", () => {
  assertEquals(isAllowedRedirectUri("https://claude.ai/api/mcp/callback"), true);
  assertEquals(isAllowedRedirectUri("http://localhost:3000/callback"), true);
  assertEquals(isAllowedRedirectUri("http://127.0.0.1:8080/callback"), true);
  assertEquals(isAllowedRedirectUri("http://example.com/callback"), false);
  assertEquals(isAllowedRedirectUri("not-a-url"), false);
});
