import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyPolling } from "@/hooks/usePropertyPolling";
import { useAuth } from "@/hooks/useAuth";
import type { CopyGeneration } from "@/hooks/usePropertyPolling";
import OutputTabsWindow, {
  type OutputTabKey,
} from "@/components/OutputTabsWindow";
import GenerationProgressModal from "@/components/GenerationProgressModal";
import AuthModal from "@/components/AuthModal";
import ListingHistory from "@/components/ListingHistory";
import TurnstileWidget from "@/components/TurnstileWidget";
import { RetroButton, RetroInput, RetroWindow } from "@/components/retro";
import {
  describeFunctionInvokeError,
  parsePropertyInput,
} from "@/lib/parsePropertyInput";
import { track } from "@/lib/posthog";

type PropertyType =
  | "sfr"
  | "mf"
  | "str"
  | "mtr"
  | "ltr"
  | "fsbo"
  | "estate"
  | "lux"
  | "commercial"
  | "lease";

type PaywallReason = "free_limit" | "pro_tier_limit";

const MAX_GENERATIONS = 10;
const FREE_PRO_TIER_LIMIT = 1;
const STORAGE_KEY = "plg_generations_used";
const PRO_TIER_STORAGE_KEY = "plg_pro_tier_generations_used";
const ANON_ID_COOKIE = "plg_anon_id";
const FREE_PROPERTY_TYPES: PropertyType[] = ["sfr", "fsbo"];
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;

const isProTierPropertyType = (type: PropertyType) =>
  !FREE_PROPERTY_TYPES.includes(type);

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

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || null
  );
}

function setCookieValue(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}

function createAnonymousId(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  const existing = getCookieValue(ANON_ID_COOKIE);
  if (existing) return existing;

  const next = createAnonymousId();
  setCookieValue(ANON_ID_COOKIE, next);
  return next;
}

async function readFunctionInvokeErrorBody(
  error: unknown,
): Promise<Record<string, unknown> | null> {
  if (!error || typeof error !== "object") return null;
  const err = error as { context?: { json?: () => Promise<unknown> } };
  if (!err.context?.json) return null;

  try {
    const body = await err.context.json();
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export default function RetroGenerator() {
  const { user, signIn, signUp, loading: authLoading } = useAuth();

  const [query, setQuery] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("sfr");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>("free_limit");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [anonymousId] = useState(() => getOrCreateAnonymousId());
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0);
  const [generationsUsed, setGenerationsUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  });
  const [proTierGenerationsUsed, setProTierGenerationsUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(PRO_TIER_STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  });
  const [outputs, setOutputs] = useState<Partial<Record<OutputTabKey, string>> | null>(
    null,
  );
  const [historyKey, setHistoryKey] = useState(0);
  const [isProUser, setIsProUser] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [totalGenerations, setTotalGenerations] = useState<number | null>(null);

  const { status, enrichmentStep, copies, enrichmentData, error, stopPolling } =
    usePropertyPolling(propertyId);

  const devBypassActive = isDevHost();
  const generationsLeft = Math.max(0, MAX_GENERATIONS - generationsUsed);
  const proTierGenerationsLeft = Math.max(
    0,
    FREE_PRO_TIER_LIMIT - proTierGenerationsUsed,
  );
  const selectedProTier = isProTierPropertyType(propertyType);
  const anonymousTurnstileRequired =
    !devBypassActive && !user && !!TURNSTILE_SITE_KEY;
  const generateDisabled =
    showProgress ||
    !query.trim() ||
    (anonymousTurnstileRequired && !turnstileToken);
  const generationCountLabel = devBypassActive
    ? "dev"
    : isProUser
      ? "pro"
      : user
        ? "10/mo"
        : generationsLeft;

  const resetAnonymousTurnstile = useCallback(() => {
    if (!anonymousTurnstileRequired) return;
    setTurnstileToken(null);
    setTurnstileWidgetKey((key) => key + 1);
  }, [anonymousTurnstileRequired]);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  // --- Checkout success/cancel toast handling ---
  const checkoutToastShown = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || checkoutToastShown.current) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    if (checkoutStatus === "success") {
      checkoutToastShown.current = true;
      sonnerToast.success("Welcome to PLG Pro! Your subscription is active.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (checkoutStatus === "cancel") {
      checkoutToastShown.current = true;
      sonnerToast("Checkout cancelled. You can upgrade anytime.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("upgrade") === "true") {
      setPaywallReason("free_limit");
      setShowPaywall(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // --- Check if user has an active Pro subscription ---
  useEffect(() => {
    if (!user) {
      setIsProUser(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from("subscriptions" as never) as any)
        .select("plan, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);
      const active = !!data?.some(
        (row: { plan?: string; status?: string }) =>
          row.plan === "pro" && row.status === "active",
      );
      if (!cancelled) setIsProUser(active);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // --- Social proof: total generation count ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count, error: countError } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true });
      if (!cancelled && !countError && count !== null) {
        setTotalGenerations(count);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(generationsUsed));
  }, [generationsUsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PRO_TIER_STORAGE_KEY, String(proTierGenerationsUsed));
  }, [proTierGenerationsUsed]);

  useEffect(() => {
    if (status === "complete" && copies.length > 0) {
      const outputMap: Partial<Record<OutputTabKey, string>> = {
        mls: "",
        social: "",
        email: "",
      };
      copies.forEach((copy: CopyGeneration) => {
        const key = copy.copy_type as OutputTabKey;
        if (key in outputMap) outputMap[key] = copy.content;
      });
      
      if (isProUser && enrichmentData && enrichmentData.perplexity_raw_response) {
        outputMap.research = typeof enrichmentData.perplexity_raw_response === "string" 
          ? enrichmentData.perplexity_raw_response 
          : JSON.stringify(enrichmentData.perplexity_raw_response, null, 2);
      }

      setOutputs(outputMap);
      setShowProgress(false);
      setHistoryKey((k) => k + 1);
      track("generation_completed", { property_type: propertyType, property_id: propertyId });
      fireLoopsEvent("generation_created", { property_type: propertyType });
    }
  }, [status, copies, propertyType, propertyId]);

  const handleGenerate = async () => {
    if (!query.trim()) return;

    if (anonymousTurnstileRequired && !turnstileToken) {
      sonnerToast.error("Complete the security check to generate.");
      return;
    }

    if (!devBypassActive && generationsUsed >= MAX_GENERATIONS && !user) {
      setPaywallReason("free_limit");
      setShowPaywall(true);
      track("paywall_shown", { reason: "free_limit_exceeded_local", property_type: propertyType });
      return;
    }

    if (
      !devBypassActive &&
      !user &&
      selectedProTier &&
      proTierGenerationsUsed >= FREE_PRO_TIER_LIMIT
    ) {
      setPaywallReason("pro_tier_limit");
      setShowPaywall(true);
      track("paywall_shown", { reason: "pro_tier_limit_local", property_type: propertyType });
      return;
    }

    setOutputs(null);
    setPropertyId(null);
    setShowProgress(true);

    track("generation_started", { property_type: propertyType, is_authenticated: !!user });

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
            ...(!user
              ? {
                  anonymousId,
                  turnstileToken,
                }
              : {}),
          },
        },
      );

      if (error) throw error;

      if (data?.error && !data?.propertyId) {
        if (
          data.error === "pro_required" ||
          data.error === "free_limit_exceeded"
        ) {
          setShowProgress(false);
          if (!user) resetAnonymousTurnstile();
          setPaywallReason(
            data.error === "pro_required" ? "pro_tier_limit" : "free_limit",
          );
          setShowPaywall(true);
          track("paywall_shown", { reason: data.error, property_type: propertyType });
          fireLoopsEvent("limit_reached", { reason: data.error, property_type: propertyType });
          return;
        }
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : String(data.error),
        );
      }

      if (data?.propertyId) {
        setPropertyId(data.propertyId);
        if (!user) {
          setGenerationsUsed((prev) => prev + 1);
          if (selectedProTier) setProTierGenerationsUsed((prev) => prev + 1);
          resetAnonymousTurnstile();
        }
      } else {
        throw new Error("No property ID returned");
      }
    } catch (err) {
      console.error("Error starting generation:", err);
      setShowProgress(false);
      if (!user) resetAnonymousTurnstile();
      const errorBody = await readFunctionInvokeErrorBody(err);
      const errorCode =
        typeof errorBody?.error === "string" ? errorBody.error : null;

      if (errorCode === "pro_required" || errorCode === "free_limit_exceeded") {
        setPaywallReason(
          errorCode === "pro_required" ? "pro_tier_limit" : "free_limit",
        );
        setShowPaywall(true);
        track("paywall_shown", { reason: errorCode, property_type: propertyType });
        return;
      }

      const description =
        typeof errorBody?.message === "string" && errorBody.message
          ? errorBody.message
          : typeof errorBody?.error === "string" && errorBody.error
            ? errorBody.error
            : await describeFunctionInvokeError(err);
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

  const onCopy = (text: string, tabKey?: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copied!", { description: "Text copied to clipboard" });
    track("copy_clicked", { tab: tabKey ?? "unknown", property_id: propertyId });
  };

  const onCopyAll = () => {
    if (!outputs) return;
    const allText = `MLS Description:\n${outputs.mls}\n\nSocial Post:\n${outputs.social}\n\nEmail:\n${outputs.email}`;
    onCopy(allText, "all");
  };

  const fireLoopsEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (!user?.email) return;
    supabase.functions
      .invoke("send-loops-event", { body: { email: user.email, eventName, properties } })
      .catch(console.error);
  };

  const handleAuth = async (
    email: string,
    password: string,
    mode: "signin" | "signup",
  ) => {
    if (mode === "signin") return signIn(email, password);
    const { error, isNewUser } = await signUp(email, password);
    if (isNewUser) {
      track("signup_completed", { method: "email" });
      // fire-and-forget: add to Loops welcome sequence
      supabase.functions.invoke("send-welcome-email", { body: { email } }).catch(console.error);
    }
    return error;
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-portal-session",
        { body: {} },
      );
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Portal error:", err);
      sonnerToast.error("Failed to open subscription management");
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-system text-foreground">
      <main className="flex flex-col items-center p-4 gap-4">
        <RetroWindow
          title="PLG — Property Listing Generator"
          className="w-full max-w-3xl"
          showControls={false}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-win95-11 text-muted-foreground">
                propertylistinggenerator.com
              </div>
              {totalGenerations !== null && (
                <div className="win95-raised px-2 py-0.5 text-win95-11 font-bold text-center">
                  {totalGenerations.toLocaleString()} listings generated
                </div>
              )}
            </div>
            <div className="text-win95-16 font-bold">
              listing copy in 15 seconds
            </div>
            <div className="text-win95-12 text-muted-foreground">
              paste an address or zillow link. pick the property type.
              hit generate. we research the property, analyze the neighborhood,
              and write 3 FHA-compliant listings — MLS, social, and email.
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
                disabled={generateDisabled}
              >
                {outputs ? `regenerate (${generationCountLabel})` : "generate"}
              </RetroButton>
            </div>

            <PropertyTypeToggle
              value={propertyType}
              onChange={setPropertyType}
              proTierUsed={proTierGenerationsUsed >= FREE_PRO_TIER_LIMIT}
              isProUser={isProUser}
            />

            {anonymousTurnstileRequired && (
              <div className="flex justify-center">
                <TurnstileWidget
                  key={turnstileWidgetKey}
                  siteKey={TURNSTILE_SITE_KEY!}
                  onVerify={handleTurnstileVerify}
                  onExpire={handleTurnstileExpire}
                />
              </div>
            )}

            <div className="flex gap-3 text-win95-11 justify-center text-muted-foreground flex-wrap items-center">
              <span>fha trained</span>
              <span>real property research</span>
              <span>
                {isProUser
                  ? "unlimited generations"
                  : "10 free generations, 1 Pro-tier included"}
              </span>
              {!user && !isProUser && selectedProTier && (
                <span>{proTierGenerationsLeft} Pro-tier left</span>
              )}
              {isProUser && (
                <RetroButton
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="text-win95-11 px-2 py-0.5"
                >
                  {portalLoading ? "Loading..." : "Manage Subscription"}
                </RetroButton>
              )}
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
                  <RetroButton onClick={() => onCopy(outputs[activeTab], activeTab)}>
                    copy {activeTab}
                  </RetroButton>
                  <RetroButton onClick={onCopyAll}>copy all</RetroButton>
                  {propertyId && (
                    <RetroButton onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/listing/${propertyId}`);
                      sonnerToast.success("Link copied!", { description: "Share this listing with anyone" });
                    }}>
                      share link
                    </RetroButton>
                  )}
                  <RetroButton
                    variant="primary"
                    onClick={handleGenerate}
                    disabled={
                      generateDisabled ||
                      (!devBypassActive && !user && generationsLeft <= 0)
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
            reason={paywallReason}
            isSignedIn={!!user}
            onClose={() => setShowPaywall(false)}
            onSignIn={() => {
              setShowPaywall(false);
              setShowAuthModal(true);
            }}
          />
        )}

        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onAuth={handleAuth}
          />
        )}

        {/* Authenticated users see their listing history; anonymous see landing content */}
        {user && !authLoading ? (
          <ListingHistory key={historyKey} userId={user.id} isProUser={isProUser} />
        ) : (
          <>
            <HowItWorks />
            <SampleOutput />
          </>
        )}
      </main>

      <footer className="w-full border-t-2 border-black bg-card px-4 py-3 mt-4">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-2 text-win95-11 text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
            <span>
              <strong className="text-foreground">PLG</strong> — PropertyListingGenerator.com
            </span>
            <span>
              FHA-compliant listing copy for real estate agents
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/explore" className="underline hover:text-foreground">
              explore
            </Link>
            <span>|</span>
            <Link to="/blog" className="underline hover:text-foreground">
              blog
            </Link>
            <span>|</span>
            <Link to="/terms" className="underline hover:text-foreground">
              terms
            </Link>
            <span>|</span>
            <Link to="/privacy" className="underline hover:text-foreground">
              privacy
            </Link>
            <span>|</span>
            <a
              href="/sitemap.xml"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              sitemap
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PropertyTypeToggle({
  value,
  onChange,
  proTierUsed,
  isProUser,
}: {
  value: PropertyType;
  onChange: (v: PropertyType) => void;
  proTierUsed: boolean;
  isProUser: boolean;
}) {
  const options: { key: PropertyType; label: string }[] = [
    { key: "sfr", label: "SFR" },
    { key: "fsbo", label: "FSBO" },
    { key: "mf", label: "MF" },
    { key: "str", label: "STR" },
    { key: "mtr", label: "MTR" },
    { key: "ltr", label: "LTR" },
    { key: "estate", label: "ESTATE SALE" },
    { key: "lux", label: "LUX" },
    { key: "commercial", label: "COMM" },
    { key: "lease", label: "LEASE" },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const isActive = value === opt.key;
        const isProTier = isProTierPropertyType(opt.key);
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            title={isProTier ? (isProUser ? "Pro tier (included)" : proTierUsed ? "Pro tier — upgrade to unlock" : "Pro tier: 1 included free, then Pro") : "Free tier"}
            className={`px-2 py-1 text-win95-11 font-bold cursor-pointer relative ${
              isActive ? "win95-pressed bg-input" : "win95-raised bg-card"
            }`}
          >
            {opt.label}
            {isProTier && !isProUser && (
              <span
                className={`absolute -top-2.5 -right-1 text-[10px] font-bold leading-none ${
                  proTierUsed
                    ? "text-muted-foreground"
                    : "text-[#FFD700] [text-shadow:1px_1px_0_rgba(0,0,0,0.8)]"
                }`}
              >
                {proTierUsed ? "🔒" : "★"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Win95PaywallModal({
  reason,
  onClose,
  onSignIn,
  isSignedIn,
}: {
  reason: PaywallReason;
  onClose: () => void;
  onSignIn: () => void;
  isSignedIn: boolean;
}) {
  const [loading, setLoading] = useState<"month" | "year" | null>(null);

  const handleCheckout = async (interval: "month" | "year") => {
    if (!isSignedIn) {
      onSignIn();
      return;
    }
    track("checkout_started", { interval });
    setLoading(interval);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        { body: { interval } },
      );
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      sonnerToast.error("Failed to start checkout");
      setLoading(null);
    }
  };

  const proTierLimit = reason === "pro_tier_limit";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="win95-window w-full max-w-md">
        <div className="win95-titlebar">
          <span className="font-bold text-win95-12">
            {proTierLimit ? "Pro-Tier Limit Used" : "Free Generations Used"}
          </span>
          <button className="win95-control-btn" onClick={onClose}>
            x
          </button>
        </div>
        <div className="p-4 bg-card">
          {proTierLimit ? (
            <>
              <p className="text-win95-12 mb-2">
                You&apos;ve used your included Pro-tier property generation.
              </p>
              <p className="text-win95-11 text-muted-foreground mb-3">
                Free users can use 1 of their 10 generations on MF, STR, MTR,
                LTR, Estate Sale, Luxury, Commercial, or Lease. Pro makes
                those unlimited.
              </p>
            </>
          ) : isSignedIn ? (
            <>
              <p className="text-win95-12 mb-2">
                You&apos;ve used your 10 free monthly generations.
              </p>
              <p className="text-win95-11 text-muted-foreground mb-3">
                Pro removes the cap and keeps generation unlimited.
              </p>
            </>
          ) : (
            <>
              <p className="text-win95-12 mb-2">
                You&apos;ve used your 10 free anonymous generations.
              </p>
              <p className="text-win95-11 text-muted-foreground mb-3">
                Create an account for 10 free generations each month, or upgrade
                to Pro for unlimited volume.
              </p>
            </>
          )}

          <div className="win95-inset bg-input p-2 mb-4">
            <p className="text-win95-12 font-bold mb-2">Pro includes:</p>
            <ul className="text-win95-11 space-y-1">
              <li>* Unlimited generations</li>
              <li>* Unlimited Pro-tier property types</li>
              <li>* Listing history &amp; portfolio</li>
              <li>* Real property research</li>
              <li>* FHA compliance checks</li>
            </ul>
          </div>

          {!isSignedIn && (
            <p className="text-win95-11 text-muted-foreground text-center mb-3">
              Sign in or create an account before checkout.
            </p>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex gap-2 justify-center">
              <RetroButton
                variant="primary"
                onClick={() => handleCheckout("month")}
                disabled={loading !== null}
              >
                {loading === "month" ? "Loading..." : "Pro $49/mo"}
              </RetroButton>
            </div>
            <div className="flex gap-2 justify-center">
              <RetroButton
                onClick={() => handleCheckout("year")}
                disabled={loading !== null}
              >
                {loading === "year" ? "Loading..." : "Pro $39/mo — billed annually"}
              </RetroButton>
            </div>
          </div>

          <div className="border-t border-[var(--win95-gray-dark)] pt-3 flex justify-between items-center">
            {!isSignedIn ? (
              <button
                className="text-win95-11 underline cursor-pointer bg-transparent border-none text-muted-foreground"
                onClick={onSignIn}
              >
                Sign in / create account
              </button>
            ) : (
              <span className="text-win95-11 text-muted-foreground">
                Cancel anytime
              </span>
            )}
            <RetroButton onClick={onClose}>Cancel</RetroButton>
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
      title: "Paste address or listing URL",
      body: "Works with Zillow, Redfin, Realtor.com, MLS links — or just type any address.",
    },
    {
      n: "2.",
      title: "Pick property type",
      body: "SFR and FSBO are free-tier. One Pro-tier property generation is included; Pro unlocks unlimited MF, STR, MTR, LTR, Estate Sale, Luxury, Commercial, and Lease.",
    },
    {
      n: "3.",
      title: "Generate in ~15 seconds",
      body: "PLG researches the property, pulls neighborhood data, and writes FHA-compliant copy — automatically.",
    },
    {
      n: "4.",
      title: "Use 10 free, then go Pro",
      body: "Anonymous users get 10 generations total. Signed-in free accounts get 10 per month. Each free allowance includes 1 Pro-tier generation.",
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

function SampleOutput() {
  return (
    <div className="w-full max-w-3xl">
      <RetroWindow title="sample output — 742 Evergreen Terrace, Springfield" showControls={false}>
        <div className="space-y-3">
          <div className="win95-inset bg-input p-3">
            <p className="text-win95-11 font-bold mb-1 text-[var(--win95-blue)]">
              MLS Description
            </p>
            <p className="text-win95-11">
              Meticulously maintained 3BR/2BA craftsman on a quiet tree-lined
              street. Open-concept kitchen with granite countertops, stainless
              appliances, and breakfast bar. Primary suite features walk-in
              closet and ensuite with double vanity. Original hardwood floors
              throughout. Spacious backyard with covered patio — ideal for
              entertaining. New roof (2022), updated HVAC, 2-car garage. Walk to
              top-rated Elmwood Elementary. Minutes to downtown. Equal housing
              opportunity.
            </p>
          </div>
          <div className="win95-inset bg-input p-3">
            <p className="text-win95-11 font-bold mb-1 text-[var(--win95-blue)]">
              Social Post (Instagram / Facebook)
            </p>
            <p className="text-win95-11">
              Just listed — 742 Evergreen Terrace. A beautifully maintained
              craftsman with 3 beds, 2 baths, and a kitchen that'll make you
              want to cook. Hardwood floors, covered patio, and a backyard built
              for summer. New roof + updated HVAC. Priced to move in a
              neighborhood people are moving into. DM for a private showing.
            </p>
          </div>
          <div className="win95-inset bg-input p-3">
            <p className="text-win95-11 font-bold mb-1 text-[var(--win95-blue)]">
              Email Subject + Opener
            </p>
            <p className="text-win95-11 whitespace-pre-line">{`Subject: Just Listed — 742 Evergreen Terrace (3/2, move-in ready)

Hi [Name],

A new listing just came to market that I think is worth a look. 742 Evergreen Terrace is a 3BR/2BA craftsman in one of Springfield's most sought-after pockets...`}</p>
          </div>
          <p className="text-win95-10 text-muted-foreground text-center italic">
            Generated in 14 seconds from a street address. FHA-compliant. No editing required.
          </p>
        </div>
      </RetroWindow>
    </div>
  );
}

function WhyPLG() {
  const reasons = [
    {
      title: "Real research, not hallucination",
      body: "PLG uses Perplexity AI to pull actual property data and neighborhood context before writing. ChatGPT invents details. PLG verifies them.",
    },
    {
      title: "FHA Fair Housing — built in",
      body: "Every output is screened for discriminatory language and restricted terms. Use it confidently without a compliance review.",
    },
    {
      title: "Three formats, one generation",
      body: "MLS description, Instagram/Facebook post, and buyer email — all in one click. No copy-pasting between tools.",
    },
    {
      title: "15 seconds vs. 45 minutes",
      body: "Agents average 45 minutes writing listing copy from scratch. PLG cuts that to under 15 seconds. Across 50 listings, that's 37 hours back.",
    },
  ];
  return (
    <div className="w-full max-w-3xl">
      <RetroWindow title="why PLG vs. writing it yourself" showControls={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reasons.map((r) => (
            <div key={r.title} className="win95-inset bg-input p-3">
              <p className="text-win95-12 font-bold mb-1">{r.title}</p>
              <p className="text-win95-11 text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </RetroWindow>
    </div>
  );
}
