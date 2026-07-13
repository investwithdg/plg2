// Pure request-handling logic for the PLG MCP server — no Supabase/network imports,
// so this can be unit-tested without any external module resolution. Real
// implementations of McpDeps live in deps.ts.
import { getCorsHeaders } from "../_shared/cors.ts";

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
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
      return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
