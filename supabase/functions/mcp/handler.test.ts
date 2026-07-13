// Smoke tests for the MCP edge function. Real network/Supabase/Stripe calls are
// never exercised — handleRequest() takes an injectable McpDeps so these test the
// request/response contract and the auth gate, not the live services behind it.
import { assertEquals } from "../_shared/testAssert.ts";
import { handleRequest, runTool, type McpDeps, type Violation } from "./handler.ts";

function fakeDeps(overrides: Partial<McpDeps> = {}): McpDeps {
  return {
    verifyCaller: async () => ({ userId: "user-1" }),
    invokeReceiveProperty: async () => ({ propertyId: "prop-1", success: true }),
    waitForCompletion: async () => ({ status: "complete", mls: "MLS copy", social: "Social copy" }),
    checkCompliance: async () => ({ passed: true, violations: [] as Violation[] }),
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

Deno.test("tools/list returns the tool catalog without requiring auth", async () => {
  const res = await handleRequest(req({ method: "tools/list" }), fakeDeps());
  assertEquals(res.status, 200);
  const body = await res.json();
  const names = body.tools.map((t: { name: string }) => t.name);
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

Deno.test("end-to-end: OPTIONS preflight, unknown method, and a full tools/call round-trip", async () => {
  const preflight = await handleRequest(new Request("https://example.com/mcp", { method: "OPTIONS" }), fakeDeps());
  assertEquals(preflight.status, 200);

  const unknownMethod = await handleRequest(req({ method: "bogus" }), fakeDeps());
  assertEquals(unknownMethod.status, 400);

  const call = await handleRequest(
    req(
      { method: "tools/call", params: { name: "compliance_check", arguments: { text: "clean copy" } } },
      { Authorization: "Bearer test-jwt" },
    ),
    fakeDeps(),
  );
  assertEquals(call.status, 200);
  const body = await call.json();
  const parsed = JSON.parse(body.content[0].text);
  assertEquals(parsed.passed, true);
});
