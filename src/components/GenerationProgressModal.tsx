import { RetroButton, RetroWindow, RetroProgress } from "@/components/retro";
import type { EnrichmentStep, PropertyStatus } from "@/hooks/usePropertyPolling";

interface GenerationProgressModalProps {
  isOpen: boolean;
  status: PropertyStatus;
  enrichmentStep: EnrichmentStep;
  error: string | null;
  onCancel: () => void;
  onRetry?: () => void;
  onView?: () => void;
  hasOutputs?: boolean;
}

const STEP_LABELS: Record<string, { label: string; progress: number }> = {
  started: { label: "Starting research...", progress: 10 },
  researching_property: { label: "Verifying property details...", progress: 25 },
  researching_schools: { label: "Finding nearby schools...", progress: 45 },
  analyzing_neighborhood: { label: "Analyzing neighborhood...", progress: 65 },
  generating_copy: { label: "Writing your listing...", progress: 85 },
  done: { label: "Complete!", progress: 100 },
};

function getCompletedSteps(currentStep: EnrichmentStep): string[] {
  const stepOrder = [
    "started",
    "researching_property",
    "researching_schools",
    "analyzing_neighborhood",
    "generating_copy",
    "done",
  ];
  if (!currentStep) return [];
  const currentIndex = stepOrder.indexOf(currentStep);
  if (currentIndex <= 0) return [];
  return stepOrder.slice(0, currentIndex);
}

export default function GenerationProgressModal({
  isOpen,
  status,
  enrichmentStep,
  error,
  onCancel,
  onRetry,
  onView,
  hasOutputs,
}: GenerationProgressModalProps) {
  if (!isOpen) return null;

  const isError = status === "error" || !!error;
  const isComplete = status === "complete" || enrichmentStep === "done";

  const currentStepInfo = enrichmentStep
    ? STEP_LABELS[enrichmentStep] || { label: enrichmentStep, progress: 50 }
    : { label: "Starting...", progress: 5 };

  const completedSteps = getCompletedSteps(enrichmentStep);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <RetroWindow title="Generating Listing" className="w-full max-w-md" onClose={onCancel}>
        <div className="space-y-4">
          {isError ? (
            <>
              <div className="win95-inset bg-input p-3">
                <div className="text-[color:var(--destructive)] font-bold text-win95-12 mb-1">
                  X Error
                </div>
                <p className="text-win95-11 text-muted-foreground">
                  {error || "An error occurred during generation."}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                {onRetry && (
                  <RetroButton variant="primary" onClick={onRetry}>
                    Try Again
                  </RetroButton>
                )}
                <RetroButton onClick={onCancel}>Close</RetroButton>
              </div>
            </>
          ) : isComplete ? (
            <>
              <div className="win95-inset bg-input p-3">
                <div className="text-win95-13 font-bold text-center">
                  Listing Generated Successfully!
                </div>
              </div>
              <div className="flex justify-center">
                <RetroButton variant="primary" onClick={onView ?? onCancel} disabled={!hasOutputs}>
                  {hasOutputs ? "View Listing" : "Finalizing..."}
                </RetroButton>
              </div>
            </>
          ) : (
            <>
              <div className="win95-inset bg-input p-3 space-y-2">
                {completedSteps.map((step) => (
                  <div
                    key={step}
                    className="text-win95-11 text-muted-foreground flex items-center gap-2"
                  >
                    <span style={{ color: "#008000" }}>OK</span>
                    <span>{STEP_LABELS[step]?.label}</span>
                  </div>
                ))}
                <div className="text-win95-12 font-bold flex items-center gap-2">
                  <span className="animate-pulse">...</span>
                  <span>{currentStepInfo.label}</span>
                </div>
              </div>

              <RetroProgress value={currentStepInfo.progress} showLabel />
              <p className="text-win95-11 text-muted-foreground text-center">
                This usually takes 10-15 seconds...
              </p>

              <div className="flex justify-center">
                <RetroButton onClick={onCancel}>Cancel</RetroButton>
              </div>
            </>
          )}
        </div>
      </RetroWindow>
    </div>
  );
}
