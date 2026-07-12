// Listing outcome ledger (data-moat lock). Records what happens to a generated listing
// so PLG learns which copy converts. ADDITIVE infra; call recordOutcome() from UI/webhooks.
// Source of truth = Supabase; mirrors to PostHog (already a dependency) if present.
import { supabase } from "@/integrations/supabase/client"; // adjust if needed

export type OutcomeEvent = "view" | "lead" | "saved" | "published" | "closed";

export interface OutcomeInput {
  copyGenerationId: string;
  propertyId?: string;
  event: OutcomeEvent;
  daysOnMarket?: number;
  metadata?: Record<string, unknown>;
}

export async function recordOutcome(o: OutcomeInput): Promise<void> {
  await supabase.from("listing_outcomes").insert({
    copy_generation_id: o.copyGenerationId,
    property_id: o.propertyId ?? null,
    event_type: o.event,
    days_on_market: o.daysOnMarket ?? null,
    metadata: o.metadata ?? {},
  });

  try {
    const ph = (globalThis as { posthog?: { capture: (e: string, p?: unknown) => void } }).posthog;
    ph?.capture("listing_outcome", { event: o.event, copy_generation_id: o.copyGenerationId, ...(o.metadata ?? {}) });
  } catch {
    /* no-op */
  }
}
