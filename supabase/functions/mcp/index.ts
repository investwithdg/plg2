// PLG MCP server (action-layer lock): exposes PLG as callable tools so agents /
// ChatGPT apps invoke it directly. Supabase Edge Function (Deno). ADDITIVE.
// Deploy: `supabase functions deploy mcp`. Wire runTool() into the existing
// generation pipeline where marked TODO. The tool name+description is the "meta
// description" an agent reads to decide to call PLG -- keep it sharp.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TOOLS = [
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
    inputSchema: { type: "object", properties: { text: { type: "string" }, board: { type: "string" } }, required: ["text"] },
  },
  {
    name: "rewrite_for_channel",
    description: "Rewrite an existing listing for a target channel (mls | social | print).",
    inputSchema: { type: "object", properties: { text: { type: "string" }, channel: { type: "string" } }, required: ["text", "channel"] },
  },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();
    if (body?.method === "tools/list") {
      return new Response(JSON.stringify({ tools: TOOLS }), { headers: CORS });
    }
    if (body?.method === "tools/call") {
      const result = await runTool(body?.params?.name, body?.params?.arguments ?? {});
      return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }] }), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: "unknown method" }), { status: 400, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});

async function runTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "generate_listing":
      return { status: "not_wired", note: "TODO: call the existing PLG generate pipeline", args };
    case "compliance_check":
      return { status: "not_wired", note: "TODO: call src/lib/compliance checkListing()", args };
    case "rewrite_for_channel":
      return { status: "not_wired", note: "TODO: call the rewrite pipeline", args };
    default:
      return { error: "unknown tool: " + String(name) };
  }
}
