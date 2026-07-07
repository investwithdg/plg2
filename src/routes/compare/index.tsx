import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/")({
  head: () => ({
    meta: [
      {
        title:
          "PLG vs Competitors — Property Listing Generator Comparisons",
      },
      {
        name: "description",
        content:
          "See how PropertyListingGenerator.com stacks up against ChatGPT, Jasper, DealMachine, Listing AI, Copy.ai, and 15+ other real estate tools. Purpose-built, FHA-compliant listing copy in 15 seconds.",
      },
      {
        property: "og:title",
        content: "PLG vs Competitors — Property Listing Generator Comparisons",
      },
      {
        property: "og:description",
        content:
          "See how PropertyListingGenerator.com stacks up against every alternative. Purpose-built, FHA-compliant listing copy in 15 seconds.",
      },
    ],
  }),
  component: CompareIndex,
});

const DEEP_DIVE_COMPARISONS = [
  {
    slug: "/compare/dealmachine",
    rival: "DealMachine",
    tagline: "Lead gen tool vs. purpose-built listing copy generator",
    verdict:
      "DealMachine helps you find deals. PLG writes the listing copy once you have one.",
  },
  {
    slug: "/compare/listingai",
    rival: "Listing AI / Generic AI Tools",
    tagline: "Generic AI output vs. FHA-compliant, research-backed copy",
    verdict:
      "Generic AI tools lack FHA compliance training and real property research. PLG is purpose-built.",
  },
];

const MORE_COMPARISONS = [
  {
    rival: "ChatGPT / OpenAI",
    category: "General AI",
    verdict:
      "ChatGPT can write text, but it has no FHA training, no property research, and no MLS formatting. You'll spend more time editing than you save.",
  },
  {
    rival: "Jasper AI",
    category: "Marketing AI",
    verdict:
      "Jasper is built for marketers, not real estate agents. No FHA guardrails, no property lookups, no MLS-specific output.",
  },
  {
    rival: "Copy.ai",
    category: "General Copywriting",
    verdict:
      "Copy.ai writes marketing copy for SaaS and e-commerce. It doesn't know what Fair Housing compliance is.",
  },
  {
    rival: "Writesonic",
    category: "General AI Writer",
    verdict:
      "Another general-purpose AI writer. No real estate domain expertise, no compliance checks, no property research.",
  },
  {
    rival: "Canva Magic Write",
    category: "Design + AI",
    verdict:
      "Great for graphics. The AI copy feature is generic and has zero real estate training.",
  },
  {
    rival: "Homebot",
    category: "Homeowner Engagement",
    verdict:
      "Homebot engages existing homeowners with equity updates. It doesn't generate listing copy at all.",
  },
  {
    rival: "Listing Robot",
    category: "MLS Description Tool",
    verdict:
      "Template-based MLS descriptions without AI research. No social or email copy, no FHA screening.",
  },
  {
    rival: "Epique AI",
    category: "Real Estate AI Suite",
    verdict:
      "Epique offers broad AI tools for agents but isn't purpose-built for listing copy. PLG's FHA compliance and property research are deeper.",
  },
  {
    rival: "kvCORE",
    category: "Real Estate CRM",
    verdict:
      "kvCORE is a CRM with basic AI features. Its copy tools are add-ons, not its core product.",
  },
  {
    rival: "Follow Up Boss",
    category: "Real Estate CRM",
    verdict:
      "A lead management CRM. No listing copy generation whatsoever.",
  },
  {
    rival: "CuraytoR / Ylopo",
    category: "Marketing Platform",
    verdict:
      "Full-service real estate marketing platforms focused on ads and lead gen. Not built for listing copy.",
  },
  {
    rival: "REimagineHome",
    category: "Virtual Staging",
    verdict:
      "AI-powered virtual staging and renovation visualization. Doesn't write a single word of copy.",
  },
  {
    rival: "Virtual Staging AI",
    category: "Virtual Staging",
    verdict:
      "Stages photos with AI. Different tool entirely — PLG writes the words that sell the property.",
  },
  {
    rival: "Zillow AI Description",
    category: "Portal Feature",
    verdict:
      "Locked inside Zillow's ecosystem. Generic, no FHA training, no social or email output. You can't use it on other platforms.",
  },
  {
    rival: "Realtor.com AI",
    category: "Portal Feature",
    verdict:
      "Embedded in Realtor.com only. Not a standalone tool you can use across MLS, social, and email.",
  },
  {
    rival: "Grammarly",
    category: "Writing Assistant",
    verdict:
      "Catches typos. Doesn't write listing copy, research properties, or check FHA compliance.",
  },
];

const WHY_PLG_REASONS = [
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

function CompareIndex() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-4">
        {/* Main window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              PLG vs Competitors
            </span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                x
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-win95-12">
              PropertyListingGenerator.com is the only tool purpose-built for
              real estate listing copy. See how it compares to every alternative
              agents consider.
            </p>

            {/* Why PLG section */}
            <div className="win95-inset p-3">
              <p className="text-win95-12 font-bold mb-2">
                Why PLG vs. writing it yourself
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WHY_PLG_REASONS.map((r) => (
                  <div key={r.title} className="win95-raised p-2">
                    <p className="text-win95-11 font-bold mb-0.5">{r.title}</p>
                    <p className="text-win95-11 text-muted-foreground">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Deep-dive comparison cards */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              In-Depth Comparisons
            </span>
          </div>
          <div className="p-3 space-y-2">
            {DEEP_DIVE_COMPARISONS.map((c) => (
              <Link
                key={c.slug}
                to={c.slug}
                className="block no-underline text-black"
              >
                <div className="win95-raised p-3 cursor-pointer hover:brightness-105">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-win95-13">
                      PLG vs {c.rival}
                    </span>
                    <span className="text-win95-11 text-[var(--win95-blue)]">→</span>
                  </div>
                  <p className="text-win95-11 text-muted-foreground mb-1">
                    {c.tagline}
                  </p>
                  <p className="text-win95-11 font-bold">{c.verdict}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Expanded competitor grid */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              PLG vs {MORE_COMPARISONS.length} Other Tools
            </span>
          </div>
          <div className="p-3">
            <div className="space-y-1">
              {MORE_COMPARISONS.map((c) => (
                <div
                  key={c.rival}
                  className="win95-inset p-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-win95-12 font-bold">
                          PLG vs {c.rival}
                        </span>
                        <span className="win95-raised px-1.5 py-0 text-[10px] text-muted-foreground">
                          {c.category}
                        </span>
                      </div>
                      <p className="text-win95-11 text-muted-foreground mt-0.5">
                        {c.verdict}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-2">
          <Link to="/">
            <button
              type="button"
              className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
            >
              Try PLG Free
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
