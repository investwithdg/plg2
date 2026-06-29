import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "PLG Pricing — Free & Pro Plans" },
      {
        name: "description",
        content:
          "PropertyListingGenerator.com pricing: Free tier with 10 generations/month, or Pro at $49/mo for unlimited generations, all 9 property types, listing history, and priority support. 7-day free trial.",
      },
      { property: "og:title", content: "PLG Pricing — Free & Pro Plans" },
      {
        property: "og:description",
        content:
          "Free: 10 generations/month. Pro: $49/mo for unlimited. 7-day free trial included.",
      },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Page header */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              PLG Pricing
            </span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                x
              </Link>
            </div>
          </div>
          <div className="p-4">
            <h1 className="text-win95-16 font-bold mb-2">
              Simple pricing. No surprises.
            </h1>
            <p className="text-win95-12">
              Start free. Upgrade when you need more. Every plan includes
              FHA-compliant copy and real property research.
            </p>
          </div>
        </div>

        {/* Pricing cards side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free plan */}
          <div className="win95-window">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-12 truncate pl-1">
                Free Plan
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <span className="text-win95-16 font-bold">$0</span>
                <span className="text-win95-11 text-muted-foreground">
                  {" "}
                  / month
                </span>
              </div>
              <div className="win95-inset p-3">
                <ul className="space-y-1.5 text-win95-11">
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>10 generations per month</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>SFR + FSBO property types</span>
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
                    <span>Perplexity property research</span>
                  </li>
                  <li className="flex gap-2 text-muted-foreground">
                    <span className="font-bold">-</span>
                    <span>7 pro property types locked</span>
                  </li>
                  <li className="flex gap-2 text-muted-foreground">
                    <span className="font-bold">-</span>
                    <span>No listing history</span>
                  </li>
                  <li className="flex gap-2 text-muted-foreground">
                    <span className="font-bold">-</span>
                    <span>Standard support</span>
                  </li>
                </ul>
              </div>
              <div className="text-center pt-1">
                <Link to="/">
                  <button
                    type="button"
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                  >
                    Start Free
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Pro plan */}
          <div className="win95-window">
            <div
              className="win95-titlebar"
              style={{
                background: "linear-gradient(to right, #800000, #c04040)",
              }}
            >
              <span className="font-bold text-win95-12 truncate pl-1">
                Pro Plan
              </span>
              <span className="text-win95-11 opacity-90">7-day free trial</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <span className="text-win95-16 font-bold">$49</span>
                <span className="text-win95-11 text-muted-foreground">
                  {" "}
                  / month
                </span>
              </div>
              <div className="text-center">
                <span className="win95-raised px-2 py-0.5 text-win95-11 inline-block">
                  or $39/mo billed annually ($468/yr)
                </span>
              </div>
              <div className="win95-inset p-3">
                <ul className="space-y-1.5 text-win95-11">
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>
                      <strong>Unlimited</strong> generations
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>
                      All <strong>9 property types</strong>
                    </span>
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
                    <span>Perplexity property research</span>
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
                  <li className="flex gap-2">
                    <span className="font-bold text-[var(--win95-blue)]">+</span>
                    <span>
                      <strong>7-day free trial</strong> — cancel anytime
                    </span>
                  </li>
                </ul>
              </div>
              <div className="text-center pt-1">
                <a href="/?upgrade=true">
                  <button
                    type="button"
                    className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                    style={{ color: "var(--win95-blue)" }}
                  >
                    Go Pro — 7 Days Free
                  </button>
                </a>
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
                Free: Single Family Residential (SFR) and For Sale By Owner
                (FSBO). Pro: adds Multi-Family, Short Term Rental, Mid Term
                Rental, Long Term Rental, Estate/Luxury, Commercial, and Lease.
              </p>
            </div>
            <div>
              <p className="text-win95-12 font-bold">
                Can I cancel the Pro trial?
              </p>
              <p className="text-win95-11 text-muted-foreground">
                Yes. Cancel anytime during the 7-day trial and you will not be
                charged. Your account reverts to the Free plan.
              </p>
            </div>
            <div>
              <p className="text-win95-12 font-bold">
                What does FHA compliance mean?
              </p>
              <p className="text-win95-11 text-muted-foreground">
                Every listing generated by PLG is screened to avoid language
                that violates the Fair Housing Act — discriminatory terms,
                steering language, and restricted phrases are automatically
                filtered out.
              </p>
            </div>
            <div>
              <p className="text-win95-12 font-bold">
                Do I need to sign up to use the free tier?
              </p>
              <p className="text-win95-11 text-muted-foreground">
                You can try PLG without an account. Sign up to track your
                generation count and unlock listing history with Pro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
