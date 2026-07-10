import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/listingai")({
  head: () => ({
    meta: [
      {
        title: "PLG vs Listing AI — Property Listing Generator Comparison",
      },
      {
        name: "description",
        content:
          "Generic AI listing tools lack FHA compliance, real property research, and produce cookie-cutter copy. PLG is purpose-built for real estate agents who need compliant, polished listings fast.",
      },
      {
        property: "og:title",
        content: "PLG vs Listing AI — Property Listing Generator Comparison",
      },
      {
        property: "og:description",
        content:
          "Generic AI copy vs. FHA-compliant, research-backed listing copy. See why PLG wins for real estate agents.",
      },
    ],
  }),
  component: VsListingAI,
});

const FEATURES = [
  {
    feature: "FHA Fair Housing compliance",
    plg: "Built-in training & guardrails",
    rival: "No — requires manual review",
  },
  {
    feature: "Real property research",
    plg: "Yes (Perplexity AI lookups)",
    rival: "No — uses only your input",
  },
  {
    feature: "Generation speed",
    plg: "~15 seconds",
    rival: "Varies (30s–2min typical)",
  },
  {
    feature: "Property types",
    plg: "SFR/FSBO free; Pro-tier sample included",
    rival: "Generic residential only",
  },
  {
    feature: "MLS-ready formatting",
    plg: "Yes — character limits, structure",
    rival: "Generic paragraphs",
  },
  {
    feature: "Social media copy",
    plg: "Instagram & Facebook optimized",
    rival: "Generic or none",
  },
  {
    feature: "Email marketing copy",
    plg: "Yes — buyer list blurbs",
    rival: "Generic or none",
  },
  {
    feature: "Input flexibility",
    plg: "Zillow URL, address, or MLS #",
    rival: "Manual form entry",
  },
  {
    feature: "Real estate domain expertise",
    plg: "Purpose-built for agents",
    rival: "General-purpose AI wrapper",
  },
  {
    feature: "Free tier",
    plg: "10 free generations + 1 Pro-tier sample",
    rival: "Varies (often limited)",
  },
  {
    feature: "Pro price",
    plg: "$49/mo ($39/mo annual)",
    rival: "$29–$99/mo typical",
  },
];

function VsListingAI() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Listing AI</span>
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
            <h1 className="text-win95-16 font-bold">PLG vs Generic AI Listing Tools</h1>
            <p className="text-win95-12">
              Tools like <strong>Listing AI</strong> and other generic AI writing assistants can
              produce property descriptions, but they are general-purpose wrappers around large
              language models. They lack the specialized training and safeguards that real estate
              professionals need.
            </p>
            <p className="text-win95-12">
              <strong>PropertyListingGenerator.com (PLG)</strong> is different. It was built from
              the ground up for real estate agents: FHA-compliant by default, powered by real
              property research via Perplexity, and optimized for MLS, social, and email formats.
            </p>
          </div>
        </div>

        {/* Why it matters window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Why It Matters</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="win95-inset p-3 space-y-2">
              <p className="text-win95-12">
                <strong>FHA compliance is not optional.</strong> Fair Housing Act violations can
                result in lawsuits and fines. Generic AI tools don't know which words and phrases to
                avoid. PLG does.
              </p>
              <p className="text-win95-12">
                <strong>Research matters.</strong> Generic tools only know what you tell them. PLG
                uses Perplexity to research the actual property — neighborhood details, school
                districts, nearby amenities — producing copy that sounds like you spent an hour
                writing it.
              </p>
              <p className="text-win95-12">
                <strong>Format matters.</strong> MLS has character limits and structure
                requirements. Instagram wants hashtags and hooks. Email needs subject lines and
                concise blurbs. PLG handles all three formats natively.
              </p>
            </div>
          </div>
        </div>

        {/* Feature comparison table */}
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
                      Generic AI Tools
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

        {/* Verdict + CTA */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Verdict</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-win95-12">
              Generic AI tools can write <em>something</em>. PLG writes the right thing — compliant,
              researched, formatted, and ready to publish. For real estate agents who value their
              time and reputation, there is no substitute for a purpose-built tool.
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
