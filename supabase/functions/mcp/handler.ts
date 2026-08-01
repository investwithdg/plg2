// Pure request-handling logic for the PLG MCP server — no Supabase/network imports,
// so this can be unit-tested without any external module resolution. Real
// implementations of McpDeps live in deps.ts.
import { getCorsHeaders, getPublicCorsHeaders } from "../_shared/cors.ts";

export const TOOLS = [
  {
    name: "generate_listing",
    description: "Generate a fair-housing-compliant real-estate listing from a property URL or details.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Zillow/Redfin/MLS URL" },
        details: { type: "string", description: "Freeform property details if no URL" },
        channel: { type: "string", enum: ["mls", "social", "print"] },
      },
    },
  },
  {
    name: "compliance_check",
    description: "Check listing text against fair-housing / MLS board rules; returns pass + violations.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" }, board: { type: "string" } },
      required: ["text"],
    },
  },
  {
    name: "rewrite_for_channel",
    description: "Rewrite an existing listing for a target channel (mls | social | print).",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" }, channel: { type: "string" } },
      required: ["text", "channel"],
    },
  },
];

export interface Violation {
  pattern: string;
  severity: "error" | "warning";
  guidance?: string;
}

export type PlanTier = "free" | "pro" | "elite";

export interface McpDeps {
  /** Returns the resolved plan alongside userId (not just a boolean) so callers — chiefly
   * checkRateLimit below — don't need a second round-trip to re-derive "what plan is this
   * user on" after verifyCaller already resolved it. */
  verifyCaller: (authHeader: string | null) => Promise<{ userId: string; plan: PlanTier } | null>;
  /** Runs generate_listing's downstream pipeline as the ALREADY-VERIFIED caller identified by
   * userId — not by forwarding the caller's original bearer token. receive-property can only
   * resolve identity from a real Supabase session JWT (supabase.auth.getClaims), but MCP
   * callers authenticate via API key or opaque OAuth token just as often, neither of which
   * receive-property can verify itself. Passing the pre-resolved userId (over a service-role
   * / shared-secret channel — see deps.ts) is what makes generate_listing actually work for
   * every MCP auth method, not just a copied browser session token. */
  invokeReceiveProperty: (
    args: Record<string, unknown>,
    userId: string,
  ) => Promise<{ propertyId?: string; success?: boolean; message?: string; error?: string }>;
  waitForCompletion: (propertyId: string) => Promise<Record<string, unknown> | null>;
  checkCompliance: (text: string, board?: string) => Promise<{ passed: boolean; violations: Violation[] }>;
  /** Pro/Elite users have no throttle at all downstream (receive-property's free-tier caps
   * are skipped entirely for paid plans), and an agent can call tools far faster/more
   * repetitively than a human clicking the website — this is the only throttle MCP traffic
   * gets. Called once per tools/call, right after verifyCaller succeeds. */
  checkRateLimit: (
    userId: string,
    plan: PlanTier,
    tool: string,
  ) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
  /** RFC 9728 OAuth 2.0 Protected Resource Metadata for this MCP server, served
   * at GET .well-known/oauth-protected-resource so MCP clients (claude.ai etc.)
   * can discover the `oauth` edge function as the authorization server. */
  getProtectedResourceMetadata: () => Record<string, unknown>;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  authHeader: string | null,
  deps: McpDeps,
) {
  const caller = await deps.verifyCaller(authHeader);
  if (!caller) {
    return { error: "unauthorized", message: "A valid PLG account Bearer token is required to call tools." };
  }

  const rateLimit = await deps.checkRateLimit(caller.userId, caller.plan, name);
  if (!rateLimit.allowed) {
    return {
      error: "rate_limited",
      message: `Too many ${name} calls — try again in ${rateLimit.retryAfterSeconds ?? 60}s.`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  switch (name) {
    case "generate_listing": {
      const url = typeof args.url === "string" ? args.url : undefined;
      const details = typeof args.details === "string" ? args.details : undefined;
      if (!url && !details) {
        return { error: "invalid_arguments", message: "Provide 'url' or 'details'." };
      }
      const dispatch = await deps.invokeReceiveProperty(
        { url, address: url ? undefined : details, source: "mcp" },
        caller.userId,
      );
      if (dispatch.error || !dispatch.propertyId) {
        return { error: dispatch.error ?? "dispatch_failed", message: dispatch.message };
      }
      const result = await deps.waitForCompletion(dispatch.propertyId);
      if (!result) {
        return {
          status: "processing",
          propertyId: dispatch.propertyId,
          message: "Still generating — check back, or view at /listing/" + dispatch.propertyId,
        };
      }
      return { propertyId: dispatch.propertyId, ...result };
    }
    case "compliance_check": {
      const text = typeof args.text === "string" ? args.text : "";
      const board = typeof args.board === "string" ? args.board : undefined;
      return await deps.checkCompliance(text, board);
    }
    case "rewrite_for_channel":
      return { status: "not_wired", note: "TODO: call the rewrite pipeline", args };
    default:
      return { error: "unknown tool: " + String(name) };
  }
}

// Every MCP connection starts with a client "initialize" request/response handshake before
// any other JSON-RPC method (tools/list, tools/call, ...) is valid — a client that doesn't
// get a proper initialize result treats the server as broken and disconnects before ever
// reaching tools/list, regardless of what auth/OAuth is configured. See the "initialize"
// branch below.
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "plg-mcp", version: "1.0.0" };

interface JsonRpcRequestBody {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
}

function jsonRpcResponse(
  body: { jsonrpc: "2.0"; id: unknown; result?: unknown; error?: { code: number; message: string } },
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export async function handleRequest(req: Request, deps: McpDeps): Promise<Response> {
  const url = new URL(req.url);
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // RFC 9728 Protected Resource Metadata — the entry point an MCP client uses
  // (per the WWW-Authenticate 401 response below, or a direct fetch) to
  // discover which authorization server issues tokens for this MCP server.
  if (req.method === "GET" && url.pathname.endsWith("/.well-known/oauth-protected-resource")) {
    return new Response(JSON.stringify(deps.getProtectedResourceMetadata()), {
      headers: { ...getPublicCorsHeaders(), "Content-Type": "application/json" },
    });
  }

  // Streamable HTTP transport: a GET on the base endpoint is only for an OPTIONAL
  // server-initiated SSE stream, which this server doesn't offer. Reject cleanly per spec
  // (405) instead of falling into the JSON-body parsing below — a GET has no body, so that
  // used to throw and surface as an opaque 500.
  if (req.method === "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: JsonRpcRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonRpcResponse(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      400,
      corsHeaders,
    );
  }

  const id = body?.id ?? null;
  const method = body?.method;

  // notifications/initialized: the client confirming the initialize handshake is complete.
  // Per JSON-RPC, notifications carry no "id" and get no response body — the Streamable HTTP
  // transport spec calls for a bare 202 Accepted here, never a JSON-RPC response.
  if (method === "notifications/initialized") {
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  if (method === "initialize") {
    return jsonRpcResponse(
      {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      },
      200,
      corsHeaders,
    );
  }

  if (method === "tools/list") {
    return jsonRpcResponse({ jsonrpc: "2.0", id, result: { tools: TOOLS } }, 200, corsHeaders);
  }

  if (method === "tools/call") {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    const result = await runTool(
      (body.params?.name as string) ?? "",
      (body.params?.arguments as Record<string, unknown>) ?? {},
      authHeader,
      deps,
    );
    const unauthorized =
      !!result && typeof result === "object" && (result as { error?: string }).error === "unauthorized";
    const rateLimited =
      !!result && typeof result === "object" && (result as { error?: string }).error === "rate_limited";

    if (rateLimited) {
      const retryAfterSeconds = (result as { retryAfterSeconds?: number }).retryAfterSeconds;
      const headers = {
        ...corsHeaders,
        ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
      };
      return jsonRpcResponse(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32002, message: (result as { message?: string }).message ?? "Rate limited" },
        },
        429,
        headers,
      );
    }

    if (unauthorized) {
      // MCP Authorization spec: a 401 MUST carry WWW-Authenticate pointing at
      // this server's protected-resource metadata so the client can discover
      // the authorization server and start the OAuth flow. We hand back the
      // fully-qualified URL of the endpoint above (derived from this same
      // request) rather than relying on any well-known path insertion
      // convention, which sidesteps that ambiguity for this hop — see the PR
      // description for the fuller discovery-path discussion.
      const basePath = url.pathname.replace(/\/$/, "");
      const resourceMetadataUrl = `${url.origin}${basePath}/.well-known/oauth-protected-resource`;
      const headers = {
        ...corsHeaders,
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
      };
      return jsonRpcResponse(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32001, message: (result as { message?: string }).message ?? "Unauthorized" },
        },
        401,
        headers,
      );
    }

    return jsonRpcResponse(
      { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } },
      200,
      corsHeaders,
    );
  }

  return jsonRpcResponse(
    { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${String(method)}` } },
    200,
    corsHeaders,
  );
}
