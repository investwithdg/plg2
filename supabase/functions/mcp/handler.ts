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

export interface McpDeps {
  verifyCaller: (authHeader: string | null) => Promise<{ userId: string } | null>;
  invokeReceiveProperty: (
    args: Record<string, unknown>,
    authHeader: string,
  ) => Promise<{ propertyId?: string; success?: boolean; message?: string; error?: string }>;
  waitForCompletion: (propertyId: string) => Promise<Record<string, unknown> | null>;
  checkCompliance: (text: string, board?: string) => Promise<{ passed: boolean; violations: Violation[] }>;
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

  switch (name) {
    case "generate_listing": {
      const url = typeof args.url === "string" ? args.url : undefined;
      const details = typeof args.details === "string" ? args.details : undefined;
      if (!url && !details) {
        return { error: "invalid_arguments", message: "Provide 'url' or 'details'." };
      }
      const dispatch = await deps.invokeReceiveProperty(
        { url, address: url ? undefined : details, source: "mcp" },
        authHeader as string,
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

  try {
    const body = await req.json();
    if (body?.method === "tools/list") {
      return new Response(JSON.stringify({ tools: TOOLS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body?.method === "tools/call") {
      const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
      const result = await runTool(body?.params?.name, body?.params?.arguments ?? {}, authHeader, deps);
      const unauthorized = !!result && typeof result === "object" && (result as { error?: string }).error === "unauthorized";
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
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
        headers["WWW-Authenticate"] = `Bearer resource_metadata="${resourceMetadataUrl}"`;
      }
      return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }] }), {
        status: unauthorized ? 401 : 200,
        headers,
      });
    }
    return new Response(JSON.stringify({ error: "unknown method" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
