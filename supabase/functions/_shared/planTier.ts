// Pure plan-tier resolution logic, shared by every edge function that needs to know whether
// a user is paying. No Supabase/network imports, so this is unit-testable in isolation and
// mirrors src/hooks/usePlanTier.ts (the frontend's single source of truth) rather than
// re-deriving the "what counts as an active Pro/Elite subscription" rule in multiple places.

export type PlanTier = "free" | "pro" | "elite";

export interface SubscriptionRow {
  plan?: string | null;
  status?: string | null;
}

/**
 * Given the caller's `subscriptions` rows (any shape returned by
 * `.select("plan, status").eq("user_id", id)`), resolves their effective plan tier.
 * Mirrors usePlanTier.ts: only rows with status "active" count. A user should only ever
 * have one active row (see the `subscriptions_user_active_idx` partial unique index), but
 * if more than one is ever active, elite wins over pro rather than depending on row order.
 */
export function resolvePlanTier(rows: SubscriptionRow[] | null | undefined): PlanTier {
  const activeRows = rows?.filter((row) => row.status === "active") ?? [];
  if (activeRows.some((row) => row.plan === "elite")) return "elite";
  if (activeRows.some((row) => row.plan === "pro")) return "pro";
  return "free";
}

/** MCP/agent access (and API key creation) is a Pro+Elite paid-tier gate — free tier is excluded. */
export function isMcpEligiblePlan(plan: PlanTier | string | null | undefined): boolean {
  return plan === "pro" || plan === "elite";
}
