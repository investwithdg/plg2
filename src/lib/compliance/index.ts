// Compliance rulepack (cornered-data lock). ADDITIVE infra: not wired into the core
// generate flow yet -- call checkListing() wherever you want a gate (UI or the MCP tool).
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client"; // adjust if your client path differs

export const ViolationSchema = z.object({
  pattern: z.string(),
  severity: z.enum(["error", "warning"]),
  guidance: z.string().optional(),
});
export type Violation = z.infer<typeof ViolationSchema>;

// Baseline fair-housing prohibited phrases (a floor). Board-specific rules load from mls_rules.
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

export interface ComplianceResult {
  passed: boolean;
  violations: Violation[];
}

// Case-insensitive phrase scan; merges baseline + board rules from mls_rules.
export async function checkListing(
  text: string,
  opts?: { board?: string },
): Promise<ComplianceResult> {
  const board = opts?.board ?? "default";
  const hay = text.toLowerCase();
  const violations: Violation[] = [];

  for (const r of DEFAULT_PROHIBITED) {
    if (hay.includes(r.pattern))
      violations.push({ pattern: r.pattern, severity: "error", guidance: r.guidance });
  }

  try {
    // mls_rules isn't in the generated Supabase types until the migration is applied
    // and types are regenerated — same `as never`/`as any` escape hatch used elsewhere
    // in this codebase for tables ahead of the generated schema (see usePropertyPolling.ts).
    const { data } = await (supabase.from("mls_rules" as never) as any)
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
}
