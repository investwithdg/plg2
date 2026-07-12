// Real (Supabase-backed) implementation of McpDeps. Kept separate from handler.ts
// so the request-handling logic can be unit-tested without resolving supabase-js.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { McpDeps, Violation } from "./handler.ts";

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

export function defaultDeps(): McpDeps {
  return {
    async verifyCaller(authHeader) {
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await serviceClient().auth.getClaims(token);
      if (error || !data?.claims) return null;
      return { userId: data.claims.sub as string };
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
