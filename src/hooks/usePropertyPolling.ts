import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PropertyStatus = "pending" | "processing" | "complete" | "error";
export type EnrichmentStep =
  | "started"
  | "researching_property"
  | "researching_schools"
  | "analyzing_neighborhood"
  | "generating_copy"
  | "done"
  | null;

export interface PropertyWithCopies {
  id: string;
  address: string;
  property_type: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  price: number | null;
  status: PropertyStatus;
  enrichment_step: EnrichmentStep;
  created_at: string;
}

export interface CopyGeneration {
  id: string;
  copy_type: string;
  content: string;
  created_at: string;
}

interface UsePropertyPollingResult {
  status: PropertyStatus;
  enrichmentStep: EnrichmentStep;
  property: PropertyWithCopies | null;
  copies: CopyGeneration[];
  isPolling: boolean;
  error: string | null;
  stopPolling: () => void;
}

const FALLBACK_POLL_INTERVAL = 15000;
const MAX_FALLBACK_ATTEMPTS = 12;

export function usePropertyPolling(
  propertyId: string | null,
): UsePropertyPollingResult {
  const [status, setStatus] = useState<PropertyStatus>("pending");
  const [enrichmentStep, setEnrichmentStep] = useState<EnrichmentStep>(null);
  const [property, setProperty] = useState<PropertyWithCopies | null>(null);
  const [copies, setCopies] = useState<CopyGeneration[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);
  const attemptRef = useRef(0);

  const stopPolling = useCallback(() => {
    stoppedRef.current = true;
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current);
      fallbackRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchCopies = useCallback(
    async (propId: string) => {
      const { data, error: copiesError } = await (
        supabase.from("copy_generations" as never) as any
      )
        .select("id, copy_type, content, created_at")
        .eq("property_id", propId)
        .order("created_at", { ascending: false });
      if (copiesError) {
        console.error("Error fetching copies:", copiesError);
      } else {
        setCopies((data ?? []) as CopyGeneration[]);
      }
    },
    [],
  );

  const handlePropertyUpdate = useCallback(
    (row: Record<string, unknown>) => {
      if (stoppedRef.current) return;
      const propStatus = (row.status || "pending") as PropertyStatus;
      const propStep = row.enrichment_step as EnrichmentStep;
      setProperty({ ...row, status: propStatus, enrichment_step: propStep } as PropertyWithCopies);
      setStatus(propStatus);
      setEnrichmentStep(propStep);

      if (propStatus === "complete") {
        fetchCopies(row.id as string);
        stopPolling();
      } else if (propStatus === "error") {
        setError(propStep || "Generation failed");
        stopPolling();
      }
    },
    [fetchCopies, stopPolling],
  );

  const fetchOnce = useCallback(
    async (propId: string) => {
      if (stoppedRef.current) return;
      try {
        const { data, error: fetchErr } = await (
          supabase.from("properties" as never) as any
        )
          .select("*")
          .eq("id", propId)
          .maybeSingle();
        if (fetchErr || !data) {
          if (!data) setError("Property not found");
          return;
        }
        handlePropertyUpdate(data as Record<string, unknown>);
      } catch (err) {
        console.error("Fallback poll error:", err);
      }
      attemptRef.current += 1;
      if (attemptRef.current >= MAX_FALLBACK_ATTEMPTS) {
        setError("Generation timed out. Please try again.");
        stopPolling();
      }
    },
    [handlePropertyUpdate, stopPolling],
  );

  useEffect(() => {
    if (!propertyId) {
      setStatus("pending");
      setEnrichmentStep(null);
      setProperty(null);
      setCopies([]);
      setError(null);
      setIsPolling(false);
      return;
    }

    stoppedRef.current = false;
    attemptRef.current = 0;
    setStatus("processing");
    setEnrichmentStep("started");
    setError(null);
    setCopies([]);
    setIsPolling(true);

    // Primary: Supabase Realtime subscription (push-based, no DB polling)
    const channel = supabase
      .channel(`property-${propertyId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "properties",
          filter: `id=eq.${propertyId}`,
        },
        (payload: any) => {
          if (payload.new) {
            handlePropertyUpdate(payload.new as Record<string, unknown>);
          }
        },
      )
      .subscribe();

    // Fallback: slow poll in case Realtime is unavailable or delayed
    fetchOnce(propertyId);
    fallbackRef.current = setInterval(
      () => fetchOnce(propertyId),
      FALLBACK_POLL_INTERVAL,
    );

    return () => {
      supabase.removeChannel(channel);
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
      }
    };
  }, [propertyId, handlePropertyUpdate, fetchOnce]);

  return {
    status,
    enrichmentStep,
    property,
    copies,
    isPolling,
    error,
    stopPolling,
  };
}
