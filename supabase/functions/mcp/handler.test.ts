// Smoke tests for the MCP edge function. Real network/Supabase/Stripe calls are
// never exercised — handleRequest() takes an injectable McpDeps so these test the
// request/response contract and the auth gate, not the live services behind it.
import { assertEquals } from "../_shared/testAssert.ts";
import {
  clampListingLimit,
  handleRequest,
  LISTING_COPY_MAX_CHARS,
  LISTINGS_DEFAULT_LIMIT,
  LISTINGS_MAX_LIMIT,
  runTool,
  TOOLS,
  type ListingSummary,
  type McpDeps,
  type PropertyResearch,
  type Violation,
} from "./handler.ts";

// Two users' listings share one store on purpose. deps.ts queries with the SERVICE ROLE key,
// which bypasses RLS entirely, so in production nothing but an explicit user_id filter keeps
// these rows apart. selectListings below reproduces exactly that shape — the filter is applied
// to the userId it is HANDED, so if runTool ever sourced that from caller-supplied arguments
// the ownership tests below hand back user-2's row instead of silently passing.
const LISTING_ROWS: Array<ListingSummary & { ownerId: string }> = [
  {
    ownerId: "user-1",
    propertyId: "prop-1",
    address: "1 Own St, Cleves, OH 45002",
    status: "complete",
    createdAt: "2026-07-30T00:00:00Z",
    mls: "My MLS copy",
    social: "My social copy",
    email: "My email copy",
  },
  {
    ownerId: "user-1",
    propertyId: "prop-2",
    address: "2 Own St, Cleves, OH 45002",
    status: "processing",
    createdAt: "2026-07-29T00:00:00Z",
  },
  {
    ownerId: "user-2",
    propertyId: "prop-99",
    address: "99 Someone Else Ave, Indianapolis, IN 46205",
    status: "complete",
    createdAt: "2026-07-31T00:00:00Z",
    mls: "ANOTHER USER'S PRIVATE COPY",
  },
];

function selectListings(
  userId: string,
  filters: { propertyId?: string; limit?: number; since?: string },
): ListingSummary[] {
  return LISTING_ROWS.filter((row) => row.ownerId === userId)
    .filter((row) => !filters.propertyId || row.propertyId === filters.propertyId)
    .filter((row) => !filters.since || row.createdAt >= filters.since)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, filters.limit ?? LISTINGS_DEFAULT_LIMIT)
    .map(({ ownerId: _ownerId, ...listing }) => listing);
}

// Shaped after a real enrichment_cache row (cache_key "cleves, oh 45002").
const RESEARCH: PropertyResearch = {
  matched_key: "cleves, oh 45002",
  researched_at: "2026-07-30T11:47:28Z",
  schools: [{ name: "Miami Whitewater Elementary School", rating: 8, distance: "2.5 mi" }],
  transit_options: [],
  nearby_amenities: [],
  walkability_score: null,
  market_overview: "Median home sale price around $234,900.",
  median_home_value: 234900,
  key_sources: [{ name: "Realtor.com Local Market", url: "https://www.realtor.com/" }],
};

function fakeDeps(overrides: Partial<McpDeps> = {}): McpDeps {
  return {
    verifyCaller: async () => ({ userId: "user-1", plan: "pro" }),
    invokeReceiveProperty: async () => ({ propertyId: "prop-1", success: true }),
    waitForCompletion: async () => ({ status: "complete", mls: "MLS copy", social: "Social copy" }),
    checkCompliance: async () => ({ passed: true, violations: [] as Violation[] }),
    checkRateLimit: async () => ({ allowed: true }),
    listListings: async (userId, filters) => selectListings(userId, filters),
    getPropertyResearch: async () => RESEARCH,
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
  assertEquals(names, [
    "generate_listing",
    "compliance_check",
    "rewrite_for_channel",
    "list_listings",
    "get_property_research",
  ]);
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

// --- list_listings ---------------------------------------------------------------------

Deno.test("tools/call list_listings returns the caller's listings with their generated copy", async () => {
  const result = await runTool("list_listings", {}, "Bearer test-jwt", fakeDeps());
  const { count, listings } = result as { count: number; listings: ListingSummary[] };
  assertEquals(count, 2);
  // Newest first, and a still-generating listing comes back with no copy fields rather than
  // being hidden — that's exactly the case an agent polls this tool for.
  assertEquals(
    listings.map((l) => l.propertyId),
    ["prop-1", "prop-2"],
  );
  assertEquals(listings[0].mls, "My MLS copy");
  assertEquals(listings[0].social, "My social copy");
  assertEquals(listings[0].email, "My email copy");
  assertEquals(listings[1].status, "processing");
  assertEquals(listings[1].mls, undefined);
});

Deno.test("tools/call list_listings never returns another user's listings", async () => {
  const result = await runTool("list_listings", {}, "Bearer test-jwt", fakeDeps());
  const { listings } = result as { listings: ListingSummary[] };
  // user-2's row sorts NEWEST of the three, so an unfiltered query would put it first.
  assertEquals(
    listings.some((l) => l.propertyId === "prop-99"),
    false,
  );
  assertEquals(
    listings.some((l) => (l.mls ?? "").includes("ANOTHER USER")),
    false,
  );
});

Deno.test("tools/call list_listings scopes to the VERIFIED caller, not to caller-supplied arguments", async () => {
  const scopedTo: string[] = [];
  const deps = fakeDeps({
    listListings: async (userId, filters) => {
      scopedTo.push(userId);
      return selectListings(userId, filters);
    },
  });
  // A hostile client naming another user every way it can, and asking for that user's property.
  const result = await runTool(
    "list_listings",
    { userId: "user-2", user_id: "user-2", ownerId: "user-2", propertyId: "prop-99" },
    "Bearer test-jwt",
    deps,
  );
  // The scope handed to the data layer is the verified caller and nothing else.
  assertEquals(scopedTo, ["user-1"]);
  // ...so another user's property id resolves to nothing, not to their copy.
  assertEquals((result as { count: number }).count, 0);
  assertEquals((result as { listings: ListingSummary[] }).listings, []);
});

Deno.test("tools/call list_listings passes propertyId and since through as narrowing filters", async () => {
  const seen: Array<{ propertyId?: string; since?: string; limit?: number }> = [];
  const deps = fakeDeps({
    listListings: async (userId, filters) => {
      seen.push(filters);
      return selectListings(userId, filters);
    },
  });
  const result = await runTool(
    "list_listings",
    { propertyId: "prop-1", since: "2026-07-30T00:00:00Z" },
    "Bearer test-jwt",
    deps,
  );
  assertEquals(seen[0].propertyId, "prop-1");
  assertEquals(seen[0].since, "2026-07-30T00:00:00Z");
  assertEquals((result as { count: number }).count, 1);
});

Deno.test("clampListingLimit bounds a caller-supplied limit and defaults anything unusable", async () => {
  assertEquals(clampListingLimit(undefined), LISTINGS_DEFAULT_LIMIT);
  assertEquals(clampListingLimit("not a number"), LISTINGS_DEFAULT_LIMIT);
  assertEquals(clampListingLimit(0), LISTINGS_DEFAULT_LIMIT);
  assertEquals(clampListingLimit(-5), LISTINGS_DEFAULT_LIMIT);
  assertEquals(clampListingLimit(5), 5);
  assertEquals(clampListingLimit(7.9), 7);
  assertEquals(clampListingLimit(10_000), LISTINGS_MAX_LIMIT);
  assertEquals(clampListingLimit(Infinity), LISTINGS_DEFAULT_LIMIT);

  // ...and the clamped value is what actually reaches the data layer.
  const seen: number[] = [];
  const deps = fakeDeps({
    listListings: async (userId, filters) => {
      seen.push(filters.limit as number);
      return selectListings(userId, filters);
    },
  });
  await runTool("list_listings", { limit: 10_000 }, "Bearer test-jwt", deps);
  assertEquals(seen, [LISTINGS_MAX_LIMIT]);
});

Deno.test("tools/call list_listings truncates oversized copy so the response stays bounded", async () => {
  const huge = "x".repeat(LISTING_COPY_MAX_CHARS * 3);
  const deps = fakeDeps({
    listListings: async () => [
      {
        propertyId: "prop-1",
        address: "1 Own St",
        status: "complete",
        createdAt: "2026-07-30T00:00:00Z",
        mls: huge,
        social: "short",
      },
    ],
  });
  const result = await runTool("list_listings", {}, "Bearer test-jwt", deps);
  const [listing] = (result as { listings: ListingSummary[] }).listings;
  assertEquals(listing.mls!.startsWith("x".repeat(LISTING_COPY_MAX_CHARS)), true);
  assertEquals(listing.mls!.includes("truncated"), true);
  assertEquals(listing.mls!.length < huge.length, true);
  // Copy already under the cap is passed through untouched.
  assertEquals(listing.social, "short");
});

Deno.test("tools/call list_listings without a Bearer token is rejected before any query runs", async () => {
  let queried = false;
  const deps = fakeDeps({
    verifyCaller: async () => null,
    listListings: async () => {
      queried = true;
      return [];
    },
  });
  const result = await runTool("list_listings", {}, null, deps);
  assertEquals((result as { error?: string }).error, "unauthorized");
  assertEquals(queried, false);
});

// --- get_property_research -------------------------------------------------------------

Deno.test("tools/call get_property_research returns the cached enrichment for an area", async () => {
  const result = await runTool(
    "get_property_research",
    { address: "8493 Harrison Road, Cleves, OH 45002" },
    "Bearer test-jwt",
    fakeDeps(),
  );
  const research = result as PropertyResearch;
  assertEquals(research.matched_key, "cleves, oh 45002");
  assertEquals(research.median_home_value, 234900);
  assertEquals(Array.isArray(research.schools), true);
  // Field names mirror enrichment_cache.enrichment_data's keys (identical to the `enrichments`
  // table's column names) so the tool output lines up with either source without translation.
  assertEquals(Object.keys(research).sort(), [
    "key_sources",
    "market_overview",
    "matched_key",
    "median_home_value",
    "nearby_amenities",
    "researched_at",
    "schools",
    "transit_options",
    "walkability_score",
  ]);
});

Deno.test("tools/call get_property_research accepts a city/state/zip lookup", async () => {
  const seen: Array<Record<string, string | undefined>> = [];
  const deps = fakeDeps({
    getPropertyResearch: async (query) => {
      seen.push(query);
      return RESEARCH;
    },
  });
  await runTool(
    "get_property_research",
    { city: "Cleves", state: "OH", zip: "45002" },
    "Bearer test-jwt",
    deps,
  );
  assertEquals(seen[0], { address: undefined, city: "Cleves", state: "OH", zip: "45002" });
});

Deno.test("tools/call get_property_research reports not_found for an un-researched area", async () => {
  const deps = fakeDeps({ getPropertyResearch: async () => null });
  const result = await runTool("get_property_research", { zip: "99999" }, "Bearer test-jwt", deps);
  assertEquals((result as { status?: string }).status, "not_found");
});

Deno.test("tools/call get_property_research rejects a lookup with nothing to look up by", async () => {
  const result = await runTool("get_property_research", {}, "Bearer test-jwt", fakeDeps());
  assertEquals((result as { error?: string }).error, "invalid_arguments");
});

// --- rate limiting ----------------------------------------------------------------------

Deno.test("the new read-only tools go through the same rate-limit gate as every other tool", async () => {
  for (const tool of ["list_listings", "get_property_research"]) {
    const seen: string[] = [];
    const deps = fakeDeps({
      checkRateLimit: async (_userId, _plan, calledFor) => {
        seen.push(calledFor);
        return { allowed: false, retryAfterSeconds: 3600 };
      },
    });
    const result = await runTool(tool, { zip: "45002" }, "Bearer test-jwt", deps);
    assertEquals(seen, [tool]);
    assertEquals((result as { error?: string }).error, "rate_limited");
  }
});

// deps.ts imports supabase-js from esm.sh — precisely what the handler.ts/deps.ts split exists
// to keep out of these tests (nothing here may depend on a remote module resolving at test
// time). So this asserts the coverage invariant by reading deps.ts as source rather than
// importing it. A tool missing from RATE_LIMITS is NOT a type error: checkRateLimit returns
// allowed early when RATE_LIMITS[tool] is undefined, so that tool silently gets unlimited
// calls. This is the check that catches a tool added to TOOLS without a matching limit.
Deno.test("every tool in TOOLS has a RATE_LIMITS entry in deps.ts (none unthrottled by omission)", async () => {
  const source = await Deno.readTextFile(new URL("./deps.ts", import.meta.url));
  const map = source.match(/const RATE_LIMITS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!map) throw new Error("could not locate the RATE_LIMITS map in deps.ts");
  const missing = TOOLS.map((t) => t.name).filter(
    (name) =>
      !new RegExp(`\\b${name}\\s*:\\s*\\{[^}]*\\bpro\\b[^}]*\\belite\\b[^}]*\\}`).test(map[1]),
  );
  assertEquals(missing, []);
});

// The tests above prove runTool hands the data layer the verified caller and never anything
// from args. They cannot prove the OTHER half: that the real deps.ts actually filters on it.
// deps.ts runs every query through the service-role client, which bypasses RLS completely, so
// `.eq("user_id", userId)` in listListings is the single line keeping one user out of another's
// listings — with no database policy behind it to catch its removal. Since deps.ts can't be
// imported here (esm.sh), assert on its source, the same way the RATE_LIMITS check does.
Deno.test("deps.ts listListings filters properties by the caller's user_id (no RLS behind it)", async () => {
  const source = await Deno.readTextFile(new URL("./deps.ts", import.meta.url));
  const body = source.match(/async listListings\(userId, filters\) \{([\s\S]*?)\n    \},/);
  if (!body) throw new Error("could not locate listListings in deps.ts");
  assertEquals(body[1].includes('.from("properties")'), true);
  assertEquals(body[1].includes('.eq("user_id", userId)'), true);
});

Deno.test("both new tools are declared with a JSON-Schema object inputSchema", async () => {
  for (const name of ["list_listings", "get_property_research"]) {
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) throw new Error(`${name} missing from TOOLS`);
    assertEquals(tool.inputSchema.type, "object");
    assertEquals(typeof tool.description, "string");
    // Both tools take only optional arguments — no `required` list.
    assertEquals("required" in tool.inputSchema, false);
  }
  const listListings = TOOLS.find((t) => t.name === "list_listings")!;
  assertEquals(Object.keys(listListings.inputSchema.properties), ["propertyId", "limit", "since"]);
  const research = TOOLS.find((t) => t.name === "get_property_research")!;
  assertEquals(Object.keys(research.inputSchema.properties), ["address", "city", "state", "zip"]);
});
