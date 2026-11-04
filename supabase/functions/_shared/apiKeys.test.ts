import { assertEquals } from "./testAssert.ts";
import {
  API_KEY_PREFIX,
  apiKeyDisplayPrefix,
  generateApiKey,
  hashApiKey,
  isApiKey,
} from "./apiKeys.ts";

Deno.test("generateApiKey produces a plg_live_-prefixed key with a 32-char random suffix", () => {
  const key = generateApiKey(new Uint8Array(24).fill(7));
  assertEquals(key.startsWith(API_KEY_PREFIX), true);
  assertEquals(key.length, API_KEY_PREFIX.length + 32);
});

Deno.test(
  "generateApiKey is deterministic for a given byte source (and thus varies with entropy)",
  () => {
    const a = generateApiKey(new Uint8Array(24).fill(1));
    const b = generateApiKey(new Uint8Array(24).fill(2));
    assertEquals(a === b, false);
    assertEquals(generateApiKey(new Uint8Array(24).fill(1)), a);
  },
);

Deno.test("isApiKey distinguishes PLG API keys from Supabase session JWTs", () => {
  assertEquals(isApiKey("plg_live_abc123"), true);
  assertEquals(isApiKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.foo.bar"), false);
  assertEquals(isApiKey(""), false);
});

Deno.test(
  "apiKeyDisplayPrefix returns the fixed prefix plus 8 random chars, never the full key",
  () => {
    const key = generateApiKey(new Uint8Array(24).fill(3));
    const prefix = apiKeyDisplayPrefix(key);
    assertEquals(prefix.length, API_KEY_PREFIX.length + 8);
    assertEquals(key.startsWith(prefix), true);
    assertEquals(prefix.length < key.length, true);
  },
);

Deno.test("hashApiKey is a stable, non-reversible-looking 64-char hex SHA-256 digest", async () => {
  const key = "plg_live_abcdefghijklmnopqrstuvwxyz012345";
  const hash1 = await hashApiKey(key);
  const hash2 = await hashApiKey(key);
  assertEquals(hash1, hash2);
  assertEquals(hash1.length, 64);
  assertEquals(/^[0-9a-f]{64}$/.test(hash1), true);
  assertEquals(hash1 === key, false);
});

Deno.test("hashApiKey produces different digests for different keys", async () => {
  const h1 = await hashApiKey("plg_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const h2 = await hashApiKey("plg_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assertEquals(h1 === h2, false);
});
