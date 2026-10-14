/**
 * PlanThemeProvider.tsx
 *
 * Applies a `data-plan` attribute to <body> based on the current user's
 * subscription tier. CSS theme variants in styles.css key off this attribute
 * to transform the entire UI palette.
 *
 * Mount this once inside RootComponent (after auth is available).
 */
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanTier } from "@/hooks/usePlanTier";
import type { PlanTier } from "@/hooks/usePlanTier";

export default function PlanThemeProvider() {
  const { user } = useAuth();
  const { plan } = usePlanTier(user);

  useEffect(() => {
    applyPlanTheme(plan);
  }, [plan]);

  return null;
}

/**
 * Applies or removes the data-plan attribute on <body>.
 * "free" removes the attribute so the default :root theme applies.
 */
function applyPlanTheme(plan: PlanTier) {
  if (typeof document === "undefined") return;

  if (plan === "free") {
    document.body.removeAttribute("data-plan");
  } else {
    document.body.setAttribute("data-plan", plan);
  }
}
