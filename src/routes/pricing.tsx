import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "PLG Pricing — Free & Pro Plans" },
      {
        name: "description",
        content:
          "PropertyListingGenerator.com pricing: 10 free generations with 1 Pro-tier property sample, or Pro at $49/mo for unlimited generations and all Pro-tier property types.",
      },
      { property: "og:title", content: "PLG Pricing — Free & Pro Plans" },
      {
        property: "og:description",
        content:
          "Free: 10 generations with 1 Pro-tier sample. Pro: $49/mo for unlimited listing copy generation.",
      },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const { user } = useAuth();
  const [isProUser, setIsProUser] = useState(false);

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
        (row: { plan?: string; status?: string }) => row.plan === "pro" && row.status === "active",
      );
      if (!cancelled) setIsProUser(active);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
            <h1 className="text-win95-16 font-bold mb-2">Simple pricing. No surprises.</h1>
            <p className="text-win95-12">
              Start free. Upgrade when you need unlimited volume and unlimited Pro-tier property
              types. Every plan includes FHA-compliant copy and real property research.
            </p>
          </div>
        </div>

        {/* Pricing cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free plan */}
          <div className="win95-window flex flex-col h-full">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-12 truncate pl-1">Free Plan</span>
            </div>
            <div className="p-4 space-y-3 flex flex-col flex-1">
              <div className="text-center">
                <span className="text-win95-16 font-bold">$0</span>
                <span className="text-win95-11 text-muted-foreground"> / month</span>
                <div className="text-[10px] text-transparent mt-0.5 pointer-events-none">
                  spacer
                </div>
              </div>
              <div className="win95-inset p-3 flex-grow">
                <ul className="space-y-1.5 text-win95-11">
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>10 free generations</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>Signed-in accounts reset monthly</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>SFR + FSBO included</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>1 Pro-tier property generation included</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>MLS, Social, Email copy</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>FHA Fair Housing compliant</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>Automated property research</span>
                  </li>
                  <li className="flex gap-2 text-muted-foreground">
                    <span className="font-bold">-</span>
                    <span>Unlimited generation volume</span>
                  </li>
                  <li className="flex gap-2 text-muted-foreground">
                    <span className="font-bold">-</span>
                    <span>Unlimited Pro-tier property types</span>
                  </li>
                  <li className="flex gap-2 text-muted-foreground">
                    <span className="font-bold">-</span>
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              <div className="text-center pt-1 mt-auto">
                {user && !isProUser ? (
                  <button
                    type="button"
                    disabled
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-default opacity-60"
                  >
                    Current Plan
                  </button>
                ) : (
                  <Link to="/">
                    <button
                      type="button"
                      className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                    >
                      Start Free
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Pro plan */}
          <div className="win95-window flex flex-col h-full">
            <div
              className="win95-titlebar"
              style={{
                background: "linear-gradient(to right, #800000, #c04040)",
              }}
            >
              <span className="font-bold text-win95-12 truncate pl-1">Pro Plan</span>
              <span className="text-win95-11 opacity-90">unlimited</span>
            </div>
            <div className="p-4 space-y-3 flex flex-col flex-1">
              <div className="text-center">
                <span className="text-win95-16 font-bold">$49</span>
                <span className="text-win95-11 text-muted-foreground"> / month</span>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  or $39/mo billed annually
                </div>
              </div>
              <div className="win95-inset p-3 flex-grow">
                <ul className="space-y-1.5 text-win95-11">
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>Everything in Free, plus:</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>Unlimited generation volume</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>Unlimited Pro-tier property types</span>
                  </li>

                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>
                      <strong>Research+</strong> — property & neighborhood data
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>
                      <strong>Listing history</strong> — access past generations
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>
                      <strong>Priority support</strong>
                    </span>
                  </li>
                </ul>
              </div>
              <div className="text-center pt-1 mt-auto">
                {isProUser ? (
                  <button
                    type="button"
                    disabled
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-default opacity-60"
                  >
                    Current Plan
                  </button>
                ) : (
                  <a href="/?upgrade=true">
                    <button
                      type="button"
                      className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                      style={{ color: "var(--win95-blue)" }}
                    >
                      Go Pro
                    </button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Elite plan */}
          <div className="win95-window flex flex-col h-full">
            <div
              className="win95-titlebar"
              style={{
                background: "linear-gradient(to right, #808080, #a9a9a9)",
                color: "white",
              }}
            >
              <span className="font-bold text-win95-12 truncate pl-1">Elite Plan</span>
              <span className="text-win95-11 opacity-90">coming soon</span>
            </div>
            <div className="p-4 space-y-3 flex flex-col flex-1">
              <div className="text-center">
                <span className="text-win95-16 font-bold text-muted-foreground">—</span>
                <div className="text-[10px] text-muted-foreground mt-0.5">in development</div>
              </div>
              <div className="win95-inset p-3 flex-grow">
                <ul className="space-y-1.5 text-win95-11 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold">+</span>
                    <span>Everything in Pro, plus:</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">+</span>
                    <span>
                      <strong>Vision+</strong> Photo analysis & feature extraction
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">+</span>
                    <span>Custom brand voice training</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">+</span>
                    <span>Team collaboration</span>
                  </li>
                </ul>
              </div>
              <div className="text-center pt-1 mt-auto">
                <button
                  type="button"
                  disabled
                  className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-not-allowed opacity-50"
                >
                  Coming Soon
                </button>
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
              <p className="text-win95-12 font-bold">
                What property types are included in each plan?
              </p>
              <p className="text-win95-11 text-muted-foreground">
                Free includes SFR and FSBO, plus 1 Pro-tier property generation from MF, STR, MTR,
                LTR, Estate Sale, Luxury, Commercial, or Lease. Pro removes both the generation cap
                and the Pro-tier cap.
              </p>
            </div>
            <div>
              <p className="text-win95-12 font-bold">Can I cancel Pro?</p>
              <p className="text-win95-11 text-muted-foreground">
                Yes. Cancel anytime from the Stripe customer portal. Your account returns to the
                Free plan after the paid period ends.
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
            <div>
              <p className="text-win95-12 font-bold">Do I need to sign up to use the free tier?</p>
              <p className="text-win95-11 text-muted-foreground">
                No. You can generate 10 listings without an account, including 1 Pro-tier property
                type. Sign up to get 10 free generations per month with 1 monthly Pro-tier sample
                and keep your listing history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
