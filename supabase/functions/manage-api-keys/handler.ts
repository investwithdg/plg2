// Pure request-handling logic for manage-api-keys — no Supabase/network imports, so this is
// unit-testable without resolving supabase-js. Real implementations of ManageApiKeysDeps live
// in deps.ts. Mirrors the split used by supabase/functions/mcp/handler.ts.
//
// This function is for the logged-in dashboard user managing their OWN API keys (auth is a
// normal Supabase session JWT) — it is not the MCP tool-call surface itself (that's mcp/).
//
// Body shape: { "action": "create" | "list" | "revoke", ...actionArgs }
//   create: { name?: string }              -> { id, name, keyPrefix, key, createdAt }  (key: plaintext, shown once)
//   list:   {}                              -> { keys: ApiKeySummary[] }                (never key_hash/plaintext)
//   revoke: { id: string }                  -> { ok: true }
import { getCorsHeaders } from "../_shared/cors.ts";

export interface ApiKeySummary {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreateApiKeyResult {
  id: string;
  name: string | null;
  keyPrefix: string;
  key: string; // plaintext — the ONLY time it is ever returned
  createdAt: string;
}

export type VerifyCallerResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_token" | "invalid_token" };

export type PlanTier = "free" | "pro" | "elite";

export interface ManageApiKeysDeps {
  verifyCaller: (authHeader: string | null) => Promise<VerifyCallerResult>;
  getUserPlan: (userId: string) => Promise<PlanTier>;
  createApiKey: (userId: string, name: string | undefined) => Promise<CreateApiKeyResult>;
  listApiKeys: (userId: string) => Promise<ApiKeySummary[]>;
  revokeApiKey: (userId: string, keyId: string) => Promise<{ ok: boolean; error?: string }>;
}

function json(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Dispatches one action for an already-authenticated caller. Exported for direct unit testing. */
export async function dispatch(
  action: string,
  args: Record<string, unknown>,
  userId: string,
  deps: ManageApiKeysDeps,
): Promise<{ status: number; body: Record<string, unknown> }> {
  switch (action) {
    case "create": {
      // Elite-only gate. MCP/agent access itself is a Pro+Elite feature, but Pro reaches it
      // through the OAuth "Add custom connector" flow (no key needed). Long-lived static keys —
      // for Claude Desktop, Cursor, and other config-file MCP clients — are an Elite add-on.
      // Reject up front with a clear message rather than silently minting a key.
      const plan = await deps.getUserPlan(userId);
      if (plan !== "elite") {
        return {
          status: 403,
          body: {
            error: "forbidden_plan",
            message: "API key generation requires an Elite plan.",
          },
        };
      }
      const rawName = args.name;
      const name =
        typeof rawName === "string" && rawName.trim().length > 0
          ? rawName.trim().slice(0, 200)
          : undefined;
      const created = await deps.createApiKey(userId, name);
      return { status: 200, body: { ...created } };
    }
    case "list": {
      const keys = await deps.listApiKeys(userId);
      return { status: 200, body: { keys } };
    }
    case "revoke": {
      const id = typeof args.id === "string" ? args.id : undefined;
      if (!id)
        return { status: 400, body: { error: "invalid_arguments", message: "Provide 'id'." } };
      const result = await deps.revokeApiKey(userId, id);
      if (!result.ok) {
        return {
          status: 404,
          body: { error: result.error ?? "not_found", message: "Key not found." },
        };
      }
      return { status: 200, body: { ok: true } };
    }
    default:
      return { status: 400, body: { error: "unknown action: " + String(action) } };
  }
}

export async function handleRequest(req: Request, deps: ManageApiKeysDeps): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    const caller = await deps.verifyCaller(authHeader);
    if (!caller.ok) {
      const message = caller.reason === "no_token" ? "Authentication required" : "Invalid session";
      return json({ error: "unauthorized", message }, 401, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const { status, body: resBody } = await dispatch(action, body ?? {}, caller.userId, deps);
    return json(resBody, status, corsHeaders);
  } catch (e) {
    return json({ error: String(e) }, 500, corsHeaders);
  }
}
