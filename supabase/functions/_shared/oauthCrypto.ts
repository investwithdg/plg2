// Dependency-free crypto + validation helpers shared by the `oauth` authorization
// server and the `mcp` resource server. Only uses runtime globals (Web Crypto,
// TextEncoder, atob/btoa) — no imports — so this file (and anything that only
// imports it) can be loaded by `deno test` without resolving any blocked
// esm.sh/jsr/deno.land module.

export type PlanTier = "free" | "pro" | "elite";

/** MCP connector access is gated to paid plans — Pro and Elite only. */
export function isProOrElite(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "elite";
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 of a string, hex-encoded. Used to store authorization codes / access
 * tokens at rest as a hash rather than plaintext. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(digest);
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toBase64Url(digest);
}

/** PKCE (OAuth 2.1 §7.5.2, S256 only — we don't support the deprecated "plain"
 * method): verifies a code_verifier reproduces the stored code_challenge. */
export async function verifyPkceS256(
  codeVerifier: string,
  codeChallenge: string,
): Promise<boolean> {
  if (!codeVerifier || !codeChallenge) return false;
  const computed = await sha256Base64Url(codeVerifier);
  return computed === codeChallenge;
}

/** Generates a random, URL-safe opaque token/code with 256 bits of entropy. */
export function generateOpaqueToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** RFC 8707 resource-indicator canonicalization: lowercase scheme+host, no
 * fragment, no trailing slash (unless the path is just "/"). Returns null for
 * inputs that aren't a valid absolute URI or that carry a fragment. */
export function canonicalizeResourceUri(uri: string): string | null {
  try {
    const u = new URL(uri);
    if (u.hash) return null;
    const scheme = u.protocol.toLowerCase();
    const host = u.host.toLowerCase();
    let path = u.pathname;
    if (path.endsWith("/") && path !== "/") path = path.slice(0, -1);
    return `${scheme}//${host}${path === "/" ? "" : path}`;
  } catch {
    return null;
  }
}

/** Redirect URIs must be HTTPS, or plain HTTP on localhost/127.0.0.1 (OAuth 2.1
 * communication-security requirement carried into the MCP authorization spec). */
export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))
      return true;
    return false;
  } catch {
    return false;
  }
}
