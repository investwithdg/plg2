// Smoke tests for the MCP edge function. Real network/Supabase/Stripe calls are
// never exercised — handleRequest() takes an injectable McpDeps so these test the
// request/response contract and the auth gate, not the live services behind it.
import { assertEquals } from "../_shared/testAssert.ts";
import { handleRequest, runTool, type McpDeps, type Violation } from "./handler.ts";

function fakeDeps(overrides: Partial<McpDeps> = {}): McpDeps {
  return {
    verifyCaller: async () => ({ userId: "user-1", plan: "pro" }),
    invokeReceiveProperty: async () => ({ propertyId: "prop-1", success: true }),
    waitForCompletion: async () => ({ status: "complete", mls: "MLS copy", social: "Social copy" }),
    checkCompliance: async () => ({ passed: true, violations: [] as Violation[] }),
    checkRateLimit: async () => ({ allowed: true }),
    getProtectedResourceMetadata: () => ({
      resource: "https://project.supabase.co/functions/v1/mcp",
      authorization_servers: ["https://project.supabase.co/functions/v1/oauth"],
    }),
    ...overrides,
  };
}

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

Deno.test("initialize returns the protocol handshake result, echoing the request id", async () => {
  const res = await handleRequest(
    req({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }),
    fakeDeps(),
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.jsonrpc, "2.0");
  assertEquals(body.id, 1);
  assertEquals(typeof body.result.protocolVersion, "string");
  assertEquals(body.result.capabilities.tools, {});
  assertEquals(typeof body.result.serverInfo.name, "string");
});

Deno.test("notifications/initialized returns a bare 202 with no JSON-RPC body", async () => {
  const res = await handleRequest(req({ jsonrpc: "2.0", method: "notifications/initialized" }), fakeDeps());
  assertEquals(res.status, 202);
  const text = await res.text();
  assertEquals(text, "");
});

Deno.test("a bare GET (not the well-known metadata path) is rejected cleanly, not a 500", async () => {
  const res = await handleRequest(new Request("https://example.com/mcp"), fakeDeps());
  assertEquals(res.status, 405);
});

Deno.test("malformed JSON body returns a JSON-RPC parse error, not an opaque 500", async () => {
  const res = await handleRequest(
    new Request("https://example.com/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    }),
    fakeDeps(),
  );
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, -32700);
});

Deno.test("tools/list returns the tool catalog without requiring auth", async () => {
  const res = await handleRequest(req({ jsonrpc: "2.0", id: 2, method: "tools/list" }), fakeDeps());
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.id, 2);
  const names = body.result.tools.map((t: { name: string }) => t.name);
  assertEquals(names, ["generate_listing", "compliance_check", "rewrite_for_channel"]);
});

Deno.test("tools/call generate_listing without a Bearer token is rejected", async () => {
  const deps = fakeDeps({ verifyCaller: async () => null });
  const result = await runTool("generate_listing", { details: "123 Main St" }, null, deps);
  assertEquals((result as { error?: string }).error, "unauthorized");
});

Deno.test("tools/call generate_listing forwards to receive-property and waits for completion", async () => {
  const invoked: unknown[] = [];
  const deps = fakeDeps({
    invokeReceiveProperty: async (args) => {
      invoked.push(args);
      return { propertyId: "prop-42", success: true };
    },
  });
  const result = await runTool(
    "generate_listing",
    { details: "123 Main St, Springfield" },
    "Bearer test-jwt",
    deps,
  );
  assertEquals(result, { propertyId: "prop-42", status: "complete", mls: "MLS copy", social: "Social copy" });
  assertEquals((invoked[0] as { address?: string }).address, "123 Main St, Springfield");
});

Deno.test("tools/call generate_listing returns 'processing' if generation doesn't finish before the timeout", async () => {
  const deps = fakeDeps({ waitForCompletion: async () => null });
  const result = await runTool("generate_listing", { url: "https://zillow.com/x" }, "Bearer test-jwt", deps);
  assertEquals((result as { status: string }).status, "processing");
  assertEquals((result as { propertyId: string }).propertyId, "prop-1");
});

Deno.test("tools/call generate_listing rejects empty arguments", async () => {
  const result = await runTool("generate_listing", {}, "Bearer test-jwt", fakeDeps());
  assertEquals((result as { error?: string }).error, "invalid_arguments");
});

Deno.test("tools/call compliance_check flags a baseline prohibited phrase", async () => {
  const deps = fakeDeps({
    checkCompliance: async (text) => {
      const violations: Violation[] = text.toLowerCase().includes("no children")
        ? [{ pattern: "no children", severity: "error", guidance: "Familial status." }]
        : [];
      return { passed: violations.length === 0, violations };
    },
  });
  const result = await runTool(
    "compliance_check",
    { text: "Charming 2BR, no children please" },
    "Bearer test-jwt",
    deps,
  );
  assertEquals((result as { passed: boolean }).passed, false);
  assertEquals((result as { violations: Violation[] }).violations.length, 1);
});

Deno.test("tools/call for an unknown tool returns an error shape", async () => {
  const result = await runTool("delete_everything", {}, "Bearer test-jwt", fakeDeps());
  assertEquals((result as { error?: string }).error, "unknown tool: delete_everything");
});

Deno.test("generate_listing passes the resolved caller userId, not the raw bearer token, to invokeReceiveProperty", async () => {
  const seen: unknown[] = [];
  const deps = fakeDeps({
    verifyCaller: async () => ({ userId: "resolved-user-id", plan: "pro" }),
    invokeReceiveProperty: async (args, userId) => {
      seen.push(userId);
      return { propertyId: "prop-1", success: true };
    },
  });
  await runTool("generate_listing", { details: "123 Main St" }, "Bearer plg_live_abc123", deps);
  assertEquals(seen[0], "resolved-user-id");
});

Deno.test("a rate-limited caller gets a rate_limited error instead of the tool running", async () => {
  const deps = fakeDeps({ checkRateLimit: async () => ({ allowed: false, retryAfterSeconds: 120 }) });
  const result = await runTool("compliance_check", { text: "clean copy" }, "Bearer test-jwt", deps);
  assertEquals((result as { error?: string }).error, "rate_limited");
  assertEquals((result as { retryAfterSeconds?: number }).retryAfterSeconds, 120);
});

Deno.test("handleRequest tools/call surfaces a rate limit as 429 with Retry-After", async () => {
  const deps = fakeDeps({ checkRateLimit: async () => ({ allowed: false, retryAfterSeconds: 45 }) });
  const res = await handleRequest(
    req({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: "compliance_check", arguments: { text: "clean copy" } },
    }),
    deps,
  );
  assertEquals(res.status, 429);
  assertEquals(res.headers.get("Retry-After"), "45");
  const body = await res.json();
  assertEquals(body.id, 9);
  assertEquals(body.error.code, -32002);
});

Deno.test("GET .well-known/oauth-protected-resource returns the OAuth resource metadata, no auth required", async () => {
  const res = await handleRequest(
    new Request("https://example.com/mcp/.well-known/oauth-protected-resource"),
    fakeDeps(),
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.resource, "https://project.supabase.co/functions/v1/mcp");
  assertEquals(body.authorization_servers, ["https://project.supabase.co/functions/v1/oauth"]);
});

Deno.test("handleRequest tools/call without a valid caller returns 401 with a WWW-Authenticate resource_metadata URL", async () => {
  const deps = fakeDeps({ verifyCaller: async () => null });
  const res = await handleRequest(
    req({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "compliance_check", arguments: { text: "clean copy" } },
    }),
    deps,
  );
  assertEquals(res.status, 401);
  const header = res.headers.get("WWW-Authenticate");
  assertEquals(
    header,
    'Bearer resource_metadata="https://example.com/mcp/.well-known/oauth-protected-resource"',
  );
  const body = await res.json();
  assertEquals(body.id, 3);
  assertEquals(body.error.code, -32001);
});

Deno.test("end-to-end: OPTIONS preflight, unknown method, and a full tools/call round-trip", async () => {
  const preflight = await handleRequest(new Request("https://example.com/mcp", { method: "OPTIONS" }), fakeDeps());
  assertEquals(preflight.status, 200);

  const unknownMethod = await handleRequest(req({ jsonrpc: "2.0", id: 4, method: "bogus" }), fakeDeps());
  assertEquals(unknownMethod.status, 200);
  const unknownBody = await unknownMethod.json();
  assertEquals(unknownBody.error.code, -32601);

  const call = await handleRequest(
    req(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "compliance_check", arguments: { text: "clean copy" } },
      },
      { Authorization: "Bearer test-jwt" },
    ),
    fakeDeps(),
  );
  assertEquals(call.status, 200);
  const body = await call.json();
  const parsed = JSON.parse(body.result.content[0].text);
  assertEquals(parsed.passed, true);
});
