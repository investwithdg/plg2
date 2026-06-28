import { useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyPolling } from "@/hooks/usePropertyPolling";
import type { CopyGeneration } from "@/hooks/usePropertyPolling";
import OutputTabsWindow, {
  type OutputTabKey,
} from "@/components/OutputTabsWindow";
import GenerationProgressModal from "@/components/GenerationProgressModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RetroAnimatedHeader } from "@/components/RetroAnimatedHeader";
import { RetroButton, RetroInput, RetroWindow } from "@/components/retro";
import {
  describeFunctionInvokeError,
  parsePropertyInput,
} from "@/lib/parsePropertyInput";

type PropertyType =
  | "sfr"
  | "mf"
  | "str"
  | "mtr"
  | "ltr"
  | "fsbo"
  | "estate"
  | "commercial"
  | "lease";

const MAX_GENERATIONS = 3;
const STORAGE_KEY = "plg_generations_used";

const FREE_PROPERTY_TYPES: PropertyType[] = ["sfr", "fsbo"];
const isPropertyTypeFree = (type: PropertyType) =>
  FREE_PROPERTY_TYPES.includes(type);

const isDevHost = () => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovableproject.com")
  );
};

export default function RetroGenerator() {
  const [query, setQuery] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("sfr");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  });
  const [outputs, setOutputs] = useState<Record<OutputTabKey, string> | null>(
    null,
  );

  const { status, enrichmentStep, copies, error, stopPolling } =
    usePropertyPolling(propertyId);

  const devBypassActive = isDevHost();
  const generationsLeft = Math.max(0, MAX_GENERATIONS - generationsUsed);
  const generationCountLabel = devBypassActive ? "dev" : generationsLeft;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(generationsUsed));
  }, [generationsUsed]);

  useEffect(() => {
    if (status === "complete" && copies.length > 0) {
      const outputMap: Record<OutputTabKey, string> = {
        mls: "",
        social: "",
        email: "",
      };
      copies.forEach((copy: CopyGeneration) => {
        const key = copy.copy_type as OutputTabKey;
        if (key in outputMap) outputMap[key] = copy.content;
      });
      setOutputs(outputMap);
      setShowProgress(false);
    }
  }, [status, copies]);

  const handleGenerate = async () => {
    if (!query.trim()) return;

    if (generationsUsed >= MAX_GENERATIONS) {
      setShowPaywall(true);
      return;
    }

    if (!isDevHost() && !isPropertyTypeFree(propertyType)) {
      setShowPaywall(true);
      return;
    }

    setOutputs(null);
    setPropertyId(null);
    setShowProgress(true);

    try {
      const parsed = parsePropertyInput(query);
      if (!parsed.url && !parsed.address) {
        throw new Error("Enter an address or paste a listing URL.");
      }

      const { data, error } = await supabase.functions.invoke(
        "receive-property",
        {
          body: {
            ...parsed,
            propertyType,
            source: "generator",
          },
        },
      );

      if (error) throw error;

      if (data?.error && !data?.propertyId) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : String(data.error),
        );
      }

      if (data?.propertyId) {
        setPropertyId(data.propertyId);
        setGenerationsUsed((prev) => prev + 1);
      } else {
        throw new Error("No property ID returned");
      }
    } catch (err) {
      console.error("Error starting generation:", err);
      setShowProgress(false);
      const description = await describeFunctionInvokeError(err);
      sonnerToast.error("Failed to start generation", {
        description,
      });
    }
  };

  const handleCancelProgress = () => {
    stopPolling();
    setShowProgress(false);
    setPropertyId(null);
  };

  const handleRetry = () => {
    setShowProgress(false);
    setPropertyId(null);
    handleGenerate();
  };

  const onCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copied!", { description: "Text copied to clipboard" });
  };

  const onCopyAll = () => {
    if (!outputs) return;
    const allText = `MLS Description:\n${outputs.mls}\n\nSocial Post:\n${outputs.social}\n\nEmail:\n${outputs.email}`;
    onCopy(allText);
  };

  return (
    <div className="min-h-screen font-system text-foreground">
      <RetroAnimatedHeader />

      <main className="flex flex-col items-center p-4 gap-4">
        <RetroWindow
          title="PropertyListingGenerator.com"
          className="w-full max-w-3xl"
          showControls={false}
        >
          <div className="space-y-4">
            <div className="text-win95-11 text-muted-foreground">
              listing descriptions for agents that value their time
            </div>
            <div className="text-win95-16 font-bold">
              generate a listing in seconds
            </div>
            <div className="text-win95-12 text-muted-foreground">
              enter an address or paste a zillow link. pick the property type.
              hit generate. we research the property, analyze the neighborhood,
              and write 3 FHA-compliant listings.
            </div>

            <div className="flex gap-2 flex-wrap">
              <RetroInput
                placeholder="123 main st, austin, tx — or paste zillow url"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="flex-1 min-w-[200px]"
              />
              <RetroButton
                variant="primary"
                onClick={handleGenerate}
                disabled={showProgress || !query.trim()}
              >
                {outputs ? `regenerate (${generationCountLabel})` : "generate"}
              </RetroButton>
            </div>

            <PropertyTypeToggle
              value={propertyType}
              onChange={setPropertyType}
            />

            <div className="flex gap-3 text-win95-11 justify-center text-muted-foreground flex-wrap">
              <span>fha trained</span>
              <span>real property research</span>
              <span>free for sfr &amp; fsbo</span>
            </div>
          </div>
        </RetroWindow>

        {outputs && (
          <div className="w-full max-w-3xl">
            <OutputTabsWindow
              outputs={outputs}
              headerRight={
                <button
                  className="win95-control-btn"
                  onClick={() => setOutputs(null)}
                >
                  x
                </button>
              }
              renderActions={(activeTab) => (
                <div className="flex flex-wrap gap-2 mt-3">
                  <RetroButton onClick={() => onCopy(outputs[activeTab])}>
                    copy {activeTab}
                  </RetroButton>
                  <RetroButton onClick={onCopyAll}>copy all</RetroButton>
                  <RetroButton
                    variant="primary"
                    onClick={handleGenerate}
                    disabled={
                      (!devBypassActive && generationsLeft <= 0) || showProgress
                    }
                  >
                    regenerate ({generationCountLabel})
                  </RetroButton>
                </div>
              )}
            />
          </div>
        )}

        <GenerationProgressModal
          isOpen={showProgress}
          status={status}
          enrichmentStep={enrichmentStep}
          error={error}
          onCancel={handleCancelProgress}
          onRetry={handleRetry}
          onView={() => setShowProgress(false)}
          hasOutputs={!!outputs}
        />

        {showPaywall && (
          <Win95PaywallModal
            isPremiumType={!isPropertyTypeFree(propertyType)}
            onClose={() => setShowPaywall(false)}
          />
        )}

        <HowItWorks />
      </main>
    </div>
  );
}

function PropertyTypeToggle({
  value,
  onChange,
}: {
  value: PropertyType;
  onChange: (v: PropertyType) => void;
}) {
  const options: { key: PropertyType; label: string }[] = [
    { key: "sfr", label: "SFR" },
    { key: "fsbo", label: "FSBO" },
    { key: "mf", label: "MF" },
    { key: "str", label: "STR" },
    { key: "mtr", label: "MTR" },
    { key: "ltr", label: "LTR" },
    { key: "estate", label: "ESTATE" },
    { key: "commercial", label: "COMM" },
    { key: "lease", label: "LEASE" },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const isPremium = !isPropertyTypeFree(opt.key);
          const isActive = value === opt.key;
          return (
            <Tooltip key={opt.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(opt.key)}
                  className={`px-2 py-1 text-win95-11 font-bold cursor-pointer relative ${
                    isActive ? "win95-pressed bg-input" : "win95-raised bg-card"
                  }`}
                >
                  {opt.label}
                  {isPremium && (
                    <span className="absolute -top-1 -right-1 text-[color:var(--destructive)] text-xs">
                      *
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              {isPremium && (
                <TooltipContent className="bg-card win95-raised text-foreground">
                  <p className="text-win95-11">
                    Premium property type. Upgrade to Pro.
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function Win95PaywallModal({
  isPremiumType,
  onClose,
}: {
  isPremiumType: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="win95-window w-full max-w-md">
        <div className="win95-titlebar">
          <span className="font-bold text-win95-12">
            {isPremiumType ? "Premium Property Type" : "Free Generations Used"}
          </span>
          <button className="win95-control-btn" onClick={onClose}>
            x
          </button>
        </div>
        <div className="p-4 bg-card">
          {isPremiumType ? (
            <>
              <p className="text-win95-12 mb-2">
                This property type requires a Pro account or one-time purchase.
              </p>
              <p className="text-win95-11 text-muted-foreground mb-3">
                SFR and FSBO listings are always free.
              </p>
            </>
          ) : (
            <p className="text-win95-12 mb-3">
              You&apos;ve used your 3 free generations.
            </p>
          )}

          <div className="win95-inset bg-input p-2 mb-4">
            <ul className="text-win95-11 space-y-1">
              <li>* Unlimited generations</li>
              <li>* All 9 property types</li>
              <li>* Real property research</li>
              <li>* FHA compliance checks</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-center">
            <RetroButton variant="primary">Pro $49/mo</RetroButton>
            <RetroButton>One Listing $5</RetroButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1.",
      title: "Paste address or URL",
      body: "Zillow, Redfin, Realtor.com — or just type an address.",
    },
    {
      n: "2.",
      title: "Pick property type",
      body: "SFR & FSBO are free. Other types unlock with Pro.",
    },
    {
      n: "3.",
      title: "Hit generate",
      body: "Research, analyze, and write 3 FHA-compliant listings in ~15s.",
    },
    {
      n: "4.",
      title: "Copy & ship",
      body: "One-click copy for MLS, Social, and Email — ready to paste.",
    },
  ];
  return (
    <div className="w-full max-w-3xl">
      <RetroWindow title="how it works" showControls={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {steps.map((s) => (
            <div key={s.n} className="win95-inset bg-input p-3">
              <div className="text-win95-14 font-bold mb-1">
                {s.n} {s.title}
              </div>
              <p className="text-win95-12 text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </RetroWindow>
    </div>
  );
}