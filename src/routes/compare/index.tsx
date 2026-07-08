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
  { slug: "/compare/dealmachine", rival: "DealMachine", tagline: "Lead gen tool vs. purpose-built listing copy generator", verdict: "DealMachine helps you find deals. PLG writes the listing copy once you have one." },
  { slug: "/compare/listingai", rival: "Listing AI / Generic AI Tools", tagline: "Generic AI output vs. FHA-compliant, research-backed copy", verdict: "Generic AI tools lack FHA compliance training and real property research. PLG is purpose-built." },
  { slug: "/compare/chatgpt", rival: "ChatGPT / OpenAI", tagline: "General AI vs Listing Copy Engine", verdict: "ChatGPT can write text, but it has no FHA training, no property research, and no MLS formatting. You'll spend more time editing than you save." },
  { slug: "/compare/jasper", rival: "Jasper AI", tagline: "Marketing AI vs Real Estate AI", verdict: "Jasper is built for marketers, not real estate agents. No FHA guardrails, no property lookups, no MLS-specific output." },
  { slug: "/compare/copyai", rival: "Copy.ai", tagline: "General Copywriting vs Listing Copy", verdict: "Copy.ai writes marketing copy for SaaS and e-commerce. It doesn't know what Fair Housing compliance is." },
  { slug: "/compare/writesonic", rival: "Writesonic", tagline: "General AI Writer vs Specialist", verdict: "Another general-purpose AI writer. No real estate domain expertise, no compliance checks, no property research." },
  { slug: "/compare/canva", rival: "Canva Magic Write", tagline: "Design + AI vs Listing Copy Engine", verdict: "Great for graphics. The AI copy feature is generic and has zero real estate training." },
  { slug: "/compare/homebot", rival: "Homebot", tagline: "Homeowner Engagement vs Listing Copy", verdict: "Homebot engages existing homeowners with equity updates. It doesn't generate listing copy at all." },
  { slug: "/compare/listingrobot", rival: "Listing Robot", tagline: "MLS Description Tool vs AI Engine", verdict: "Template-based MLS descriptions without AI research. No social or email copy, no FHA screening." },
  { slug: "/compare/epique", rival: "Epique AI", tagline: "Real Estate AI Suite vs Listing Copy Specialist", verdict: "Epique offers broad AI tools for agents but isn't purpose-built for listing copy. PLG's FHA compliance and property research are deeper." },
  { slug: "/compare/kvcore", rival: "kvCORE", tagline: "Real Estate CRM vs Listing Copy Engine", verdict: "kvCORE is a CRM with basic AI features. Its copy tools are add-ons, not its core product." },
  { slug: "/compare/followupboss", rival: "Follow Up Boss", tagline: "Real Estate CRM vs Listing Generator", verdict: "A lead management CRM. No listing copy generation whatsoever." },
  { slug: "/compare/curaytor", rival: "CuraytoR / Ylopo", tagline: "Marketing Platform vs Copy Engine", verdict: "Full-service real estate marketing platforms focused on ads and lead gen. Not built for listing copy." },
  { slug: "/compare/reimaginehome", rival: "REimagineHome", tagline: "Virtual Staging vs Listing Copy", verdict: "AI-powered virtual staging and renovation visualization. Doesn't write a single word of copy." },
  { slug: "/compare/virtualstagingai", rival: "Virtual Staging AI", tagline: "Virtual Staging vs Text Generation", verdict: "Stages photos with AI. Different tool entirely — PLG writes the words that sell the property." },
  { slug: "/compare/zillow", rival: "Zillow AI Description", tagline: "Portal Feature vs Independent Tool", verdict: "Locked inside Zillow's ecosystem. Generic, no FHA training, no social or email output. You can't use it on other platforms." },
  { slug: "/compare/realtor", rival: "Realtor.com AI", tagline: "Portal Feature vs Independent Tool", verdict: "Embedded in Realtor.com only. Not a standalone tool you can use across MLS, social, and email." },
  { slug: "/compare/grammarly", rival: "Grammarly", tagline: "Writing Assistant vs Writing Engine", verdict: "Catches typos. Doesn't write listing copy, research properties, or check FHA compliance." },
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
  const [featured, ...rest] = DEEP_DIVE_COMPARISONS;

  const ACCENT_COLORS = [
    "var(--win95-blue)",
    "#800000",
    "#008080",
    "#808000",
    "#800080",
    "#008000",
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Main window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              PLG vs Competitors
            </span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                ×
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

        {/* Featured comparison */}
        {featured && (
          <Link
            to={featured.slug}
            className="block no-underline"
          >
            <div className="win95-window group cursor-pointer">
              <div
                className="win95-titlebar"
                style={{
                  background: "linear-gradient(to right, #800000, #c04040)",
                }}
              >
                <span className="font-bold text-win95-12 truncate pl-1">
                  ★ Featured Comparison
                </span>
              </div>
              <div className="p-4 group-hover:bg-[color:var(--win95-blue)] group-hover:text-white transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="win95-raised px-1.5 py-0.5 text-[10px] font-bold text-black group-hover:text-black">
                    PLG vs {featured.rival}
                  </span>
                </div>
                <h2 className="text-win95-14 font-bold mb-2">
                  {featured.tagline}
                </h2>
                <p className="text-win95-12 text-muted-foreground group-hover:text-white/90">
                  {featured.verdict}
                </p>
                <div className="mt-3 text-win95-11 font-bold text-[var(--win95-blue)] group-hover:text-white">
                  Read comparison →
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Comparison grid */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rest.map((c, i) => (
              <Link
                key={c.slug}
                to={c.slug}
                className="block no-underline"
              >
                <div className="win95-window h-full group cursor-pointer">
                  <div
                    className="h-1.5"
                    style={{
                      background: ACCENT_COLORS[i % ACCENT_COLORS.length],
                    }}
                  />
                  <div className="p-3 group-hover:bg-[color:var(--win95-blue)] group-hover:text-white transition-colors h-full">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="win95-raised px-1.5 py-0 text-[10px] font-bold text-black group-hover:text-black">
                        PLG vs {c.rival}
                      </span>
                    </div>
                    <h3 className="text-win95-12 font-bold mb-1 line-clamp-2">
                      {c.tagline}
                    </h3>
                    <p className="text-win95-11 text-muted-foreground group-hover:text-white/80 line-clamp-3 mb-2">
                      {c.verdict}
                    </p>
                    <div className="flex items-center justify-between text-win95-11 font-bold text-[var(--win95-blue)] group-hover:text-white/90 mt-auto">
                      <span>Read →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

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
