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

const POLL_INTERVAL = 5000;
const MAX_ATTEMPTS = 30;

export function usePropertyPolling(
  propertyId: string | null,
): UsePropertyPollingResult {
  const [status, setStatus] = useState<PropertyStatus>("pending");
  const [enrichmentStep, setEnrichmentStep] = useState<EnrichmentStep>(null);
  const [property, setProperty] = useState<PropertyWithCopies | null>(null);
  const [copies, setCopies] = useState<CopyGeneration[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attemptRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stopPolling = useCallback(() => {
    stoppedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchPropertyStatus = useCallback(async () => {
    if (!propertyId || stoppedRef.current) return;

    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .maybeSingle();

      if (propertyError) {
        console.error("Error fetching property:", propertyError);
        setError("Failed to fetch property status");
        return;
      }

      if (!propertyData) {
        setError("Property not found");
        stopPolling();
        return;
      }

      const propertyStatus = (propertyData.status || "pending") as PropertyStatus;
      const propertyEnrichmentStep = propertyData.enrichment_step as EnrichmentStep;

      setProperty({
        ...propertyData,
        status: propertyStatus,
        enrichment_step: propertyEnrichmentStep,
      } as PropertyWithCopies);
      setStatus(propertyStatus);
      setEnrichmentStep(propertyEnrichmentStep);

      if (propertyStatus === "complete") {
        const { data: copiesData, error: copiesError } = await supabase
          .from("copy_generations")
          .select("id, copy_type, content, created_at")
          .eq("property_id", propertyId)
          .order("created_at", { ascending: false });

        if (copiesError) {
          console.error("Error fetching copies:", copiesError);
        } else {
          setCopies((copiesData ?? []) as CopyGeneration[]);
        }

        stopPolling();
        return;
      }

      if (propertyStatus === "error") {
        setError(propertyEnrichmentStep || "Generation failed");
        stopPolling();
        return;
      }

      attemptRef.current += 1;
      if (attemptRef.current >= MAX_ATTEMPTS) {
        setError("Generation timed out. Please try again.");
        stopPolling();
      }
    } catch (err) {
      console.error("Polling error:", err);
      setError("An unexpected error occurred");
    }
  }, [propertyId, stopPolling]);

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

    fetchPropertyStatus();

    intervalRef.current = setInterval(fetchPropertyStatus, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [propertyId, fetchPropertyStatus]);

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