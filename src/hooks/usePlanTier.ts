/**
 * usePlanTier.ts
 *
 * Single source of truth for the authenticated user's subscription plan.
 * Returns { plan, isProUser, isEliteUser, loading, isLoading }.
 *
 * Hardened with:
 * 1. Case-insensitive normalization & prefix matching ("pro", "pro_monthly", "pro_annual", "elite", "elite_monthly").
 * 2. Active billing period evaluation: supports status active/trialing OR canceled with current_period_end > now().
 * 3. Graceful error handling: try/catch, error logging, metadata fallback, preserving valid state on transient failures.
 * 4. Full interface contract compatibility: exposes isProUser, isEliteUser, loading, and isLoading.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PlanTier = "free" | "pro" | "elite";

export interface UsePlanTierResult {
  plan: PlanTier;
  loading: boolean;
  isLoading: boolean;
  isProUser: boolean;
  isEliteUser: boolean;
}

export interface SubscriptionRow {
  plan?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
}

/**
 * Normalizes any plan string variant to "free" | "pro" | "elite".
 * Handles case insensitivity, whitespace trimming, and common prefix variants.
 */
export function normalizePlanTier(rawPlan: unknown): PlanTier {
  if (typeof rawPlan !== "string") return "free";
  const cleaned = rawPlan.trim().toLowerCase();
  if (cleaned.startsWith("elite")) {
    return "elite";
  }
  if (cleaned.startsWith("pro")) {
    return "pro";
  }
  return "free";
}

/**
 * Determines whether a subscription row represents an active entitlement.
 * Active if:
 * 1. Status is "active" or "trialing"
 * 2. OR status is canceled/canceled-at-period-end but current_period_end is unexpired in the future.
 */
export function isSubscriptionActive(
  row: SubscriptionRow | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!row) return false;
  const status = row.status?.trim().toLowerCase();
  if (status === "active" || status === "trialing") {
    return true;
  }
  if (row.current_period_end) {
    const periodEndMs = new Date(row.current_period_end).getTime();
    if (!isNaN(periodEndMs) && periodEndMs > nowMs) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves effective plan from subscription rows and metadata fallback.
 * Elite takes precedence over Pro if multiple active rows exist.
 */
export function resolveEffectivePlan(
  rows: SubscriptionRow[] | null | undefined,
  metaPlan?: string | null,
  nowMs: number = Date.now(),
): PlanTier {
  if (rows && rows.length > 0) {
    const activeRows = rows.filter((row) => isSubscriptionActive(row, nowMs));
    if (activeRows.some((r) => normalizePlanTier(r.plan) === "elite")) {
      return "elite";
    }
    if (activeRows.some((r) => normalizePlanTier(r.plan) === "pro")) {
      return "pro";
    }
  }

  if (metaPlan) {
    const normalizedMeta = normalizePlanTier(metaPlan);
    if (normalizedMeta !== "free") {
      return normalizedMeta;
    }
  }

  return "free";
}

export function usePlanTier(user: User | null): UsePlanTierResult {
  const [plan, setPlan] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlan("free");
      setLoading(false);
      currentUserIdRef.current = null;
      return;
    }

    let cancelled = false;
    currentUserIdRef.current = user.id;
    setLoading(true);

    (async () => {
      // Immediate metadata check (e.g. manual admin override or cached claim)
      const userMeta = user.user_metadata || {};
      const appMeta = user.app_metadata || {};
      const metaPlan = (appMeta.plan || userMeta.plan) as string | undefined;

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("plan, status, current_period_end, cancel_at_period_end, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (cancelled) return;

        if (error) {
          console.error("Failed to query subscriptions for plan tier:", error);
          // If query failed but metadata indicates Pro/Elite, use metadata
          const fallback = resolveEffectivePlan(null, metaPlan);
          if (fallback !== "free") {
            setPlan(fallback);
          }
          // Do not clobber already resolved active state if user has not changed
          setLoading(false);
          return;
        }

        const effectivePlan = resolveEffectivePlan(data as SubscriptionRow[], metaPlan);
        if (!cancelled) {
          setPlan(effectivePlan);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Unexpected error in usePlanTier:", err);
        const fallback = resolveEffectivePlan(null, metaPlan);
        if (fallback !== "free") {
          setPlan(fallback);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isProUser = plan === "pro" || plan === "elite";
  const isEliteUser = plan === "elite";

  return {
    plan,
    loading,
    isLoading: loading,
    isProUser,
    isEliteUser,
  };
}
