// Pure, dependency-free helpers for PLG long-lived MCP API keys.
// No Supabase/network imports — only Web Crypto (crypto.subtle / crypto.getRandomValues),
// which is a Deno/browser global and needs no import. This keeps the module unit-testable
// the same way handler.ts files in this repo are: directly, with no module resolution.
//
// Key format: "plg_live_" + 32 URL-safe base64 characters (24 random bytes).
// Only the SHA-256 hash of the full key is ever persisted (see api_keys.key_hash in the
// add_api_keys migration) — the plaintext is shown to the caller exactly once, at creation.

export const API_KEY_PREFIX = "plg_live_";

// How many characters of the random suffix are stored/shown as `key_prefix` so a user can
// tell their keys apart in a list without the full secret ever being persisted or re-shown.
const DISPLAY_PREFIX_RANDOM_CHARS = 8;

const RANDOM_BYTE_LENGTH = 24; // base64url-encodes to exactly 32 characters, no padding.

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generates a new plaintext API key. Accepts an injectable random-byte source purely for
 * testing determinism; real callers should omit it and let Web Crypto supply entropy.
 */
export function generateApiKey(
  randomBytes: Uint8Array = crypto.getRandomValues(new Uint8Array(RANDOM_BYTE_LENGTH)),
): string {
  return API_KEY_PREFIX + base64UrlFromBytes(randomBytes);
}

/** True if a bearer token is shaped like a PLG API key (vs. a Supabase session JWT). */
export function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

/** The short, safe-to-display, safe-to-store prefix used to identify a key in a list UI. */
export function apiKeyDisplayPrefix(fullKey: string): string {
  return fullKey.slice(0, API_KEY_PREFIX.length + DISPLAY_PREFIX_RANDOM_CHARS);
}

/** SHA-256 hex digest of the full key — the only form of the key ever stored. */
export async function hashApiKey(fullKey: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fullKey));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
