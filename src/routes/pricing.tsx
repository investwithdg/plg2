import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanTier } from "@/hooks/usePlanTier";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "PLG Pricing — Pro (7-Day Free Trial) & Elite Plans" },
      {
        name: "description",
        content:
          "PropertyListingGenerator.com pricing: Pro at $49/mo with a 7-day free trial (card required) for unlimited generations, or Elite at $99/mo with Vision+ photo analysis and custom brand voice.",
      },
      { property: "og:title", content: "PLG Pricing — Pro (7-Day Free Trial) & Elite Plans" },
      {
        property: "og:description",
        content:
          "Pro: 7-day free trial, then $49/mo unlimited. Elite: $99/mo with Vision+ photo analysis and brand voice.",
      },
      { property: "og:url", content: "https://propertylistinggenerator.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://propertylistinggenerator.com/pricing" }],
  }),
  component: Pricing,
});

function Pricing() {
  const { user } = useAuth();
  const { plan } = usePlanTier(user);
  const isEliteUser = plan === "elite";
  const [proLoading, setProLoading] = useState(false);
  const [eliteLoading, setEliteLoading] = useState(false);

  const handleProTrialCheckout = async () => {
    if (!user) {
      window.location.href = "/?upgrade=true";
      return;
    }
    setProLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { interval: "month", plan: "pro" },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Pro checkout error:", err);
      sonnerToast.error("Failed to start Pro trial checkout");
      setProLoading(false);
    }
  };

  const handleEliteCheckout = async () => {
    if (!user) {
      sonnerToast.error("Sign in before upgrading to Elite");
      return;
    }
    setEliteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { interval: "month", plan: "elite" },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Elite checkout error:", err);
      sonnerToast.error("Failed to start Elite checkout");
      setEliteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Page header */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG Pricing</span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                x
              </Link>
            </div>
          </div>
          <div className="p-4">
            <h1 className="text-win95-16 font-bold mb-2">Simple pricing. 7-day free trial.</h1>
            <p className="text-win95-12">
              Start Pro with a 7-day free trial (card required), or go straight to Elite for Vision+
              photo analysis and custom brand voice. Every plan includes unlimited generations
              across all 11 property types and FHA-compliant copy.
            </p>
          </div>
        </div>

        {/* Pricing cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pro plan */}
          <div className="win95-window flex flex-col h-full">
            <div
              className="win95-titlebar"
              style={{
                background: "linear-gradient(to right, #800000, #c04040)",
                color: "white",
              }}
            >
              <span className="font-bold text-win95-12 truncate pl-1">Pro Plan</span>
              <span className="text-win95-11 opacity-90">7-day free trial</span>
            </div>
            <div className="p-4 space-y-3 flex flex-col flex-1">
              <div className="text-center">
                <span className="text-win95-16 font-bold">$49</span>
                <span className="text-win95-11 text-muted-foreground"> / month</span>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  7-day free trial (card required) · or $39/mo billed annually
                </div>
              </div>
              <div className="win95-inset p-3 flex-grow">
                <ul className="space-y-1.5 text-win95-11">
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>
                      <strong>7-day free trial</strong> (card required, cancel anytime)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>Unlimited generation volume</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>All 11 property types (SFR, MF, STR, MTR, LTR, Commercial, etc.)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>MLS, Social, Email copy + FHA compliance certificates</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>
                      <strong>Research+</strong> — property &amp; neighborhood data
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>
                      <strong>Listing history</strong> — access past generations
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>
                      <strong>Connect PLG to Claude</strong> — generate listings from chat
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#800000]">+</span>
                    <span>
                      <strong>Priority support</strong>
                    </span>
                  </li>
                </ul>
              </div>
              <div className="text-center pt-1 mt-auto">
                {plan === "pro" ? (
                  <button
                    type="button"
                    disabled
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-default opacity-60"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProTrialCheckout}
                    disabled={proLoading}
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                    style={{ color: "#800000" }}
                  >
                    {proLoading ? "Loading..." : "Start 7-Day Free Trial"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Elite plan */}
          <div className="win95-window flex flex-col h-full">
            <div
              className="win95-titlebar"
              style={{
                background: "linear-gradient(to right, #404040, #808080)",
                color: "white",
              }}
            >
              <span className="font-bold text-win95-12 truncate pl-1">Elite Plan</span>
              <span className="text-win95-11 opacity-90">top tier</span>
            </div>
            <div className="p-4 space-y-3 flex flex-col flex-1">
              <div className="text-center">
                <span className="text-win95-16 font-bold">$99</span>
                <span className="text-win95-11 text-muted-foreground"> / month</span>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  or $79/mo billed annually
                </div>
              </div>
              <div className="win95-inset p-3 flex-grow">
                <ul className="space-y-1.5 text-win95-11">
                  <li className="flex gap-2">
                    <span className="font-bold text-[#404040]">+</span>
                    <span>Everything in Pro, plus:</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#404040]">+</span>
                    <span>
                      <strong>Vision+</strong> — photo analysis &amp; feature extraction
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#404040]">+</span>
                    <span>
                      <strong>Brand Voice</strong> — custom tone, banned words, signature
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#404040]">+</span>
                    <span>
                      <strong>Static API keys</strong> — script PLG from anywhere
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[#404040]">+</span>
                    <span>Elite desktop theme</span>
                  </li>
                </ul>
              </div>
              <div className="text-center pt-1 mt-auto">
                {isEliteUser ? (
                  <button
                    type="button"
                    disabled
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-default opacity-60"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEliteCheckout}
                    disabled={eliteLoading}
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                    style={{ color: "#404040" }}
                  >
                    {eliteLoading ? "Loading..." : "Go Elite"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ / details */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              Frequently Asked Questions
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-win95-12 font-bold">How does the 7-day free Pro trial work?</p>
              <p className="text-win95-11 text-muted-foreground">
                Create an account and enter a payment method to start a 7-day free trial of Pro. You
                get unlimited generations across all 11 property types, Research+ dossiers, and FHA
                compliance certificates. Cancel anytime before day 7 and you won&apos;t be charged.
              </p>
            </div>
            <div>
              <p className="text-win95-12 font-bold">
                What property types are included in Pro and Elite?
              </p>
              <p className="text-win95-11 text-muted-foreground">
                All 11 property types — SFR, FSBO, Rowhouse/Condo, Multi-Family, STR, MTR, LTR,
                Estate Sale, Luxury, Commercial, and Lease — are unlimited on both Pro (including
                during the 7-day trial) and Elite.
              </p>
            </div>
            <div>
              <p className="text-win95-12 font-bold">Can I cancel anytime?</p>
              <p className="text-win95-11 text-muted-foreground">
                Yes. Cancel anytime from the Stripe customer portal. Access continues through the
                end of your trial or current billing period, with no further charges.
              </p>
            </div>
            <div>
              <p className="text-win95-12 font-bold">What does FHA compliance mean?</p>
              <p className="text-win95-11 text-muted-foreground">
                Every listing generated by PLG is screened to avoid language that violates the Fair
                Housing Act — discriminatory terms, steering language, and restricted phrases are
                automatically filtered out.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
