import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/jasper")({
  head: () => ({
    meta: [
      { title: "PLG vs Jasper AI — Property Listing Generator Comparison" },
      {
        name: "description",
        content:
          "Jasper AI is a marketing copywriting platform built for SaaS and e-commerce. PLG is purpose-built for FHA-compliant real estate listing copy with real property research.",
      },
      { property: "og:title", content: "PLG vs Jasper AI — Property Listing Generator Comparison" },
      {
        property: "og:description",
        content: "Jasper writes marketing copy. PLG writes listing copy. See the full comparison.",
      },
    ],
  }),
  component: VsJasper,
});

const FEATURES = [
  {
    feature: "Primary purpose",
    plg: "Real estate listing copy",
    rival: "General marketing copywriting",
  },
  {
    feature: "FHA Fair Housing compliance",
    plg: "Built-in training & guardrails",
    rival: "None — no real estate training",
  },
  {
    feature: "Real property research",
    plg: "Yes (Deep property research)",
    rival: "No — uses only templates & input",
  },
  {
    feature: "MLS-ready formatting",
    plg: "Yes — proper structure & length",
    rival: "No — generic marketing format",
  },
  {
    feature: "Social media copy",
    plg: "Instagram & Facebook optimized",
    rival: "Yes — generic social templates",
  },
  {
    feature: "Email marketing copy",
    plg: "Yes — buyer list blurbs",
    rival: "Yes — generic email templates",
  },
  { feature: "Property type specialization", plg: "10 types (SFR to Commercial)", rival: "None" },
  { feature: "Input", plg: "Paste an address or URL", rival: "Fill out template fields manually" },
  {
    feature: "Real estate domain expertise",
    plg: "Purpose-built for agents",
    rival: "Broad marketing focus",
  },
  {
    feature: "Free tier",
    plg: "10 free generations + 1 Pro-tier",
    rival: "7-day trial, then $49/mo+",
  },
  { feature: "Pro price", plg: "$49/mo ($39/mo annual)", rival: "$49-$125/mo" },
];

function VsJasper() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Jasper AI</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">
                &lt;
              </Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                x
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">
              PLG vs Jasper AI: Marketing Platform vs. Listing Copy Specialist
            </h1>
            <p className="text-win95-12">
              <strong>Jasper AI</strong> is a well-known marketing AI platform used by content
              teams, SaaS companies, and e-commerce brands. It offers templates for blog posts, ad
              copy, product descriptions, and social media content.
            </p>
            <p className="text-win95-12">
              What Jasper doesn't offer: FHA Fair Housing compliance, real property research, MLS
              formatting, or any awareness that real estate listing copy has unique legal
              requirements.
            </p>
            <p className="text-win95-12">
              <strong>PLG</strong> is built exclusively for real estate agents. It researches the
              actual property, formats for MLS, social, and email, and ensures every word passes FHA
              compliance checks — all in 15 seconds from a single address.
            </p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Why It Matters</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="win95-inset p-3 space-y-2">
              <p className="text-win95-12">
                <strong>Jasper's templates are generic.</strong> Their "real estate listing"
                template asks you to fill in every detail manually — beds, baths, features,
                neighborhood info. PLG looks all of that up automatically.
              </p>
              <p className="text-win95-12">
                <strong>No FHA awareness.</strong> Jasper's AI has no concept of Fair Housing Act
                restrictions. It will happily generate phrases that could get you fined. PLG's
                guardrails are non-negotiable.
              </p>
              <p className="text-win95-12">
                <strong>You're paying for features you don't use.</strong> Jasper includes blog
                writing, ad copy, and brand voice tools. If all you need is listing copy, you're
                paying for a Swiss Army knife when you need a scalpel.
              </p>
            </div>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span>
          </div>
          <div className="p-3">
            <div className="win95-inset overflow-x-auto">
              <table className="w-full text-win95-11 border-collapse">
                <thead>
                  <tr className="bg-[var(--win95-gray)]">
                    <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">
                      Feature
                    </th>
                    <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">
                      PLG
                    </th>
                    <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">
                      Jasper AI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-white" : "bg-[var(--win95-gray-light)]"}
                    >
                      <td className="p-2 border-b border-[var(--win95-gray-light)] font-bold">
                        {row.feature}
                      </td>
                      <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.plg}</td>
                      <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.rival}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Verdict</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-win95-12">
              Jasper is a strong marketing platform — for marketers. If you're a real estate agent
              who needs <strong>compliant, researched, format-specific listing copy</strong>, Jasper
              is like hiring a general contractor to hang a picture frame. PLG is the picture
              hanger.
            </p>
            <div className="flex gap-2 pt-1">
              <Link to="/">
                <button
                  type="button"
                  className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                >
                  Try PLG Free
                </button>
              </Link>
              <Link to="/compare">
                <button
                  type="button"
                  className="win95-raised px-3 py-1 text-win95-12 cursor-pointer active:win95-pressed"
                >
                  More Comparisons
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
