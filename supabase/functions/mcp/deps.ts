// Real (Supabase-backed) implementation of McpDeps. Kept separate from handler.ts
// so the request-handling logic can be unit-tested without resolving supabase-js.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { McpDeps, Violation } from "./handler.ts";
import { hashApiKey, isApiKey } from "../_shared/apiKeys.ts";
import { isMcpEligiblePlan, resolvePlanTier } from "../_shared/planTier.ts";

// Baseline fair-housing prohibited phrases (mirrors src/lib/compliance/index.ts —
// duplicated rather than imported since Deno edge functions and the Vite/React
// frontend are separate runtimes with no shared module path in this repo).
const DEFAULT_PROHIBITED: { pattern: string; guidance: string }[] = [
  {
    pattern: "no children",
    guidance: "Familial status: describe the home, not who may live there.",
  },
  {
    pattern: "perfect for families",
    guidance: "Familial status: focus on features (e.g. 'large fenced yard').",
  },
  { pattern: "safe neighborhood", guidance: "Steering risk: avoid claims about who lives nearby." },
  {
    pattern: "walking distance to church",
    guidance: "Religion steering: state distance/amenities neutrally.",
  },
  { pattern: "exclusive", guidance: "Can imply exclusion; prefer concrete features." },
  { pattern: "master bedroom", guidance: "Many boards prefer 'primary bedroom'." },
];

const GENERATE_POLL_INTERVAL_MS = 2000;
const GENERATE_POLL_TIMEOUT_MS = 25_000;

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// api_keys isn't in the generated Database types yet — same escape hatch as mls_rules below.
function apiKeysTable(supabase: ReturnType<typeof createClient>) {
  return supabase.from("api_keys" as never) as any;
}

// MCP/agent access is a paid-tier gate, not just an auth mechanism: free-tier users must not
// be able to successfully call tools even with a technically-valid token/session. Shared by
// both the API-key and JWT branches of verifyCaller below.
async function getPlanForUser(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  return resolvePlanTier(data);
}

export function defaultDeps(): McpDeps {
  return {
    async verifyCaller(authHeader) {
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.replace("Bearer ", "");
      const supabase = serviceClient();

      // Long-lived dashboard-issued API key (`plg_live_...`) — for static MCP client configs
      // (Claude Desktop, `claude mcp add --header`, Cursor, etc.) that can't do an interactive
      // login flow. See manage-api-keys/ for issuance and supabase/migrations/*_add_api_keys.sql.
      if (isApiKey(token)) {
        const keyHash = await hashApiKey(token);
        const { data: keyRow } = await apiKeysTable(supabase)
          .select("id, user_id, revoked_at")
          .eq("key_hash", keyHash)
          .is("revoked_at", null)
          .maybeSingle();
        if (!keyRow) return null;

        // Fire-and-forget usage tracking — never let this block or fail verification.
        apiKeysTable(supabase)
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", keyRow.id)
          .then(
            () => {},
            () => {},
          );

        const plan = await getPlanForUser(supabase, keyRow.user_id as string);
        if (!isMcpEligiblePlan(plan)) return null; // free tier: API key exists but MCP stays locked
        return { userId: keyRow.user_id as string };
      }

      // Full Supabase user session JWT (browser-style auth). No known caller currently uses
      // this path from the website itself (generate_listing forwards into receive-property,
      // which does its own free-tier caps/Pro gating independently) — it exists so an MCP
      // client can also authenticate with a copied browser session token. Gated the same way
      // as the API-key path for consistency: without this, a free-tier user could trivially
      // bypass the paid-tier gate by using their own login JWT instead of an API key, since a
      // JWT is at least as easy for a signed-in user to obtain as generating an API key would
      // be (and API key creation is itself plan-gated). See PR description for more detail.
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims) return null;
      const userId = data.claims.sub as string;
      const plan = await getPlanForUser(supabase, userId);
      if (!isMcpEligiblePlan(plan)) return null;
      return { userId };
    },

    async invokeReceiveProperty(args, authHeader) {
      const { data, error } = await serviceClient().functions.invoke("receive-property", {
        headers: { Authorization: authHeader },
        body: args,
      });
      if (error) return { error: error.message };
      return data;
    },

    async waitForCompletion(propertyId) {
      const supabase = serviceClient();
      const deadline = Date.now() + GENERATE_POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const { data: property } = await supabase
          .from("properties")
          .select("status")
          .eq("id", propertyId)
          .maybeSingle();
        if (property?.status === "complete") {
          const { data: copies } = await supabase
            .from("copy_generations")
            .select("copy_type, content")
            .eq("property_id", propertyId);
          const result: Record<string, unknown> = { status: "complete" };
          for (const c of copies ?? []) result[c.copy_type as string] = c.content;
          return result;
        }
        if (property?.status === "error") return { status: "error" };
        await new Promise((r) => setTimeout(r, GENERATE_POLL_INTERVAL_MS));
      }
      return null;
    },

    async checkCompliance(text, board = "default") {
      const hay = text.toLowerCase();
      const violations: Violation[] = [];

      for (const r of DEFAULT_PROHIBITED) {
        if (hay.includes(r.pattern))
          violations.push({ pattern: r.pattern, severity: "error", guidance: r.guidance });
      }

      try {
        // mls_rules isn't in the generated types (frontend or edge); same as
        // src/lib/compliance/index.ts, this degrades to baseline-only if the
        // migration isn't applied yet.
        const { data } = await (serviceClient().from("mls_rules" as never) as any)
          .select("pattern, severity, guidance")
          .eq("active", true)
          .in("board", [board, "default"]);
        for (const rule of data ?? []) {
          if (hay.includes(String(rule.pattern).toLowerCase())) {
            violations.push({
              pattern: String(rule.pattern),
              severity: rule.severity === "warning" ? "warning" : "error",
              guidance: rule.guidance ?? undefined,
            });
          }
        }
      } catch {
        // mls_rules not migrated yet / offline -> baseline only.
      }

      return { passed: violations.filter((v) => v.severity === "error").length === 0, violations };
    },
  };
}
