// Smoke tests for the manage-api-keys edge function. Real network/Supabase calls are never
// exercised — handleRequest()/dispatch() take an injectable ManageApiKeysDeps so these test
// the request/response contract, the auth gate, and (critically) the Pro/Elite plan gate on
// key creation, without touching a live Supabase project.
import { assertEquals } from "../_shared/testAssert.ts";
import { dispatch, handleRequest, type ApiKeySummary, type ManageApiKeysDeps } from "./handler.ts";

function fakeDeps(overrides: Partial<ManageApiKeysDeps> = {}): ManageApiKeysDeps {
  return {
    verifyCaller: async () => ({ ok: true, userId: "user-1" }),
    getUserPlan: async () => "pro",
    createApiKey: async (userId, name) => ({
      id: "key-1",
      name: name ?? null,
      keyPrefix: "plg_live_abcd1234",
      key: "plg_live_abcd1234efghijklmnopqrstuvwxyz01",
      createdAt: "2026-07-29T00:00:00.000Z",
    }),
    listApiKeys: async () =>
      [
        {
          id: "key-1",
          name: "Claude Desktop",
          keyPrefix: "plg_live_abcd1234",
          createdAt: "2026-07-29T00:00:00.000Z",
          lastUsedAt: null,
          revokedAt: null,
        },
      ] as ApiKeySummary[],
    revokeApiKey: async () => ({ ok: true }),
    ...overrides,
  };
}

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/manage-api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

Deno.test("handleRequest rejects requests with no Authorization header", async () => {
  const deps = fakeDeps({ verifyCaller: async () => ({ ok: false, reason: "no_token" }) });
  const res = await handleRequest(req({ action: "list" }), deps);
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "unauthorized");
  assertEquals(body.message, "Authentication required");
});

Deno.test("handleRequest rejects an invalid session token", async () => {
  const deps = fakeDeps({ verifyCaller: async () => ({ ok: false, reason: "invalid_token" }) });
  const res = await handleRequest(req({ action: "list" }, { Authorization: "Bearer bogus" }), deps);
  assertEquals(res.status, 401);
});

Deno.test(
  "dispatch create: a Pro user can create a key and receives the plaintext exactly once",
  async () => {
    const deps = fakeDeps({ getUserPlan: async () => "pro" });
    const { status, body } = await dispatch("create", { name: "Claude Desktop" }, "user-1", deps);
    assertEquals(status, 200);
    assertEquals(body.key, "plg_live_abcd1234efghijklmnopqrstuvwxyz01");
    assertEquals(body.name, "Claude Desktop");
    assertEquals(typeof body.keyPrefix, "string");
    assertEquals(Object.prototype.hasOwnProperty.call(body, "keyHash"), false);
  },
);

Deno.test("dispatch create: an Elite user can also create a key", async () => {
  const deps = fakeDeps({ getUserPlan: async () => "elite" });
  const { status } = await dispatch("create", {}, "user-1", deps);
  assertEquals(status, 200);
});

Deno.test(
  "dispatch create: a free-tier user is rejected with a clear upgrade message, and no key is created",
  async () => {
    let createCalled = false;
    const deps = fakeDeps({
      getUserPlan: async () => "free",
      createApiKey: async () => {
        createCalled = true;
        throw new Error("should not be called");
      },
    });
    const { status, body } = await dispatch("create", {}, "user-1", deps);
    assertEquals(status, 403);
    assertEquals(body.error, "forbidden_plan");
    assertEquals(body.message, "API key generation requires a Pro or Elite plan.");
    assertEquals(createCalled, false);
  },
);

Deno.test("dispatch list: returns key metadata only, never the hash or plaintext", async () => {
  const { status, body } = await dispatch("list", {}, "user-1", fakeDeps());
  assertEquals(status, 200);
  const keys = body.keys as ApiKeySummary[];
  assertEquals(keys.length, 1);
  assertEquals(keys[0].id, "key-1");
  assertEquals(keys[0].keyPrefix, "plg_live_abcd1234");
  assertEquals(Object.prototype.hasOwnProperty.call(keys[0], "key"), false);
  assertEquals(Object.prototype.hasOwnProperty.call(keys[0], "keyHash"), false);
});

Deno.test(
  "dispatch list/revoke: stay ungated by plan so a downgraded user can still see and revoke keys",
  async () => {
    let planChecked = false;
    const deps = fakeDeps({
      getUserPlan: async () => {
        planChecked = true;
        return "free";
      },
    });

    const listed = await dispatch("list", {}, "user-1", deps);
    assertEquals(listed.status, 200);
    assertEquals((listed.body.keys as ApiKeySummary[]).length, 1);

    const revoked = await dispatch("revoke", { id: "key-1" }, "user-1", deps);
    assertEquals(revoked.status, 200);
    assertEquals(revoked.body.ok, true);

    assertEquals(planChecked, false);
  },
);

Deno.test("dispatch revoke: requires an id", async () => {
  const { status, body } = await dispatch("revoke", {}, "user-1", fakeDeps());
  assertEquals(status, 400);
  assertEquals(body.error, "invalid_arguments");
});

Deno.test("dispatch revoke: succeeds for a key the caller owns", async () => {
  const revoked: string[] = [];
  const deps = fakeDeps({
    revokeApiKey: async (userId, keyId) => {
      revoked.push(`${userId}:${keyId}`);
      return { ok: true };
    },
  });
  const { status, body } = await dispatch("revoke", { id: "key-1" }, "user-1", deps);
  assertEquals(status, 200);
  assertEquals(body.ok, true);
  assertEquals(revoked, ["user-1:key-1"]);
});

Deno.test(
  "dispatch revoke: 404s for a key the caller doesn't own or that doesn't exist",
  async () => {
    const deps = fakeDeps({ revokeApiKey: async () => ({ ok: false, error: "not_found" }) });
    const { status, body } = await dispatch("revoke", { id: "someone-elses-key" }, "user-1", deps);
    assertEquals(status, 404);
    assertEquals(body.error, "not_found");
  },
);

Deno.test("dispatch: an unknown action returns a 400 error shape", async () => {
  const { status, body } = await dispatch("delete_everything", {}, "user-1", fakeDeps());
  assertEquals(status, 400);
  assertEquals(body.error, "unknown action: delete_everything");
});

Deno.test("end-to-end: OPTIONS preflight and a full authenticated create round-trip", async () => {
  const preflight = await handleRequest(
    new Request("https://example.com/manage-api-keys", { method: "OPTIONS" }),
    fakeDeps(),
  );
  assertEquals(preflight.status, 200);

  const res = await handleRequest(
    req({ action: "create", name: "Cursor" }, { Authorization: "Bearer test-jwt" }),
    fakeDeps({ getUserPlan: async () => "pro" }),
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.name, "Cursor");
  assertEquals(typeof body.key, "string");
});
