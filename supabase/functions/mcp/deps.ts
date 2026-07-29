// Real (Supabase-backed) implementation of McpDeps. Kept separate from handler.ts
// so the request-handling logic can be unit-tested without resolving supabase-js.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { McpDeps, Violation } from "./handler.ts";
import { isProOrElite, sha256Hex, type PlanTier } from "../_shared/oauthCrypto.ts";

// Baseline fair-housing prohibited phrases (mirrors src/lib/compliance/index.ts —
// duplicated rather than imported since Deno edge functions and the Vite/React
// frontend are separate runtimes with no shared module path in this repo).
const DEFAULT_PROHIBITED: { pattern: string; guidance: string }[] = [
  { pattern: "no children", guidance: "Familial status: describe the home, not who may live there." },
  { pattern: "perfect for families", guidance: "Familial status: focus on features (e.g. 'large fenced yard')." },
  { pattern: "safe neighborhood", guidance: "Steering risk: avoid claims about who lives nearby." },
  { pattern: "walking distance to church", guidance: "Religion steering: state distance/amenities neutrally." },
  { pattern: "exclusive", guidance: "Can imply exclusion; prefer concrete features." },
  { pattern: "master bedroom", guidance: "Many boards prefer 'primary bedroom'." },
];

const GENERATE_POLL_INTERVAL_MS = 2000;
const GENERATE_POLL_TIMEOUT_MS = 25_000;

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// oauth_access_tokens isn't in the generated Database types (same reason as
// mls_rules below — no shared type-gen path between migrations and this
// runtime), so we cast through `as never`/`as any` at the query boundary.
async function verifyOAuthToken(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ userId: string } | null> {
  const tokenHash = await sha256Hex(token);
  const { data } = await (supabase.from("oauth_access_tokens" as never) as any)
    .select("user_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) return null;

  const userId = data.user_id as string;

  // Plans can change after a token was issued (e.g. a Pro user downgrades to
  // free) — always re-check the CURRENT plan rather than trusting that the
  // token was valid for a paid plan at issuance time.
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  const activeRow = (subRows ?? []).find((row: { plan?: string; status?: string }) => row.status === "active");
  const plan: PlanTier = activeRow?.plan === "elite" ? "elite" : activeRow?.plan === "pro" ? "pro" : "free";
  if (!isProOrElite(plan)) return null;

  return { userId };
}

export function defaultDeps(): McpDeps {
  return {
    async verifyCaller(authHeader) {
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.replace("Bearer ", "");
      const supabase = serviceClient();

      // OAuth access token issued via the /oauth connector flow (claude.ai's
      // "Add custom connector" and other spec-compliant MCP clients).
      const oauthCaller = await verifyOAuthToken(supabase, token);
      if (oauthCaller) return oauthCaller;

      // Fallback: full Supabase user session JWT (the browser's existing login).
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims) return null;
      return { userId: data.claims.sub as string };
    },

    getProtectedResourceMetadata() {
      const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
      return {
        resource: `${supabaseUrl}/functions/v1/mcp`,
        authorization_servers: [`${supabaseUrl}/functions/v1/oauth`],
        bearer_methods_supported: ["header"],
        scopes_supported: ["mcp"],
      };
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
        if (hay.includes(r.pattern)) violations.push({ pattern: r.pattern, severity: "error", guidance: r.guidance });
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
