/**
 * usePlanTier.ts
 *
 * Single source of truth for the authenticated user's subscription plan.
 * Returns "free" | "pro" | "elite" and exposes it app-wide.
 *
 * The subscription check runs once on mount and re-runs when the user changes.
 * This replaces the scattered `isProUser` checks in RetroGenerator and pricing.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PlanTier = "free" | "pro" | "elite";

export function usePlanTier(user: User | null): {
  plan: PlanTier;
  loading: boolean;
} {
  const [plan, setPlan] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan("free");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Immediate metadata check (e.g. manual admin override or cached claim)
      const userMeta = user.user_metadata || {};
      const appMeta = user.app_metadata || {};
      const metaPlan = (appMeta.plan || userMeta.plan) as string | undefined;

      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      const activeRow = data?.[0];
      const resolvedPlan = activeRow?.plan || metaPlan;

      if (resolvedPlan === "elite") {
        setPlan("elite");
      } else if (resolvedPlan === "pro") {
        setPlan("pro");
      } else {
        setPlan("free");
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { plan, loading };
}
