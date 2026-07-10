import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/epique")({
  head: () => ({
    meta: [
      { title: "PLG vs Epique AI — Property Listing Generator Comparison" },
      {
        name: "description",
        content:
          "Epique AI is a broad real estate AI suite. PLG is deeply specialized in FHA-compliant, research-backed listing copy generation.",
      },
      { property: "og:title", content: "PLG vs Epique AI — Property Listing Generator Comparison" },
      {
        property: "og:description",
        content: "Broad AI suite vs. listing copy specialist. See the full comparison.",
      },
    ],
  }),
  component: VsEpique,
});

const FEATURES = [
  {
    feature: "Primary purpose",
    plg: "Listing copy generation",
    rival: "Broad real estate AI tools",
  },
  {
    feature: "FHA Fair Housing compliance",
    plg: "Strictly enforced via AI guardrails",
    rival: "Varies by tool",
  },
  { feature: "Real property research", plg: "Yes (Perplexity AI)", rival: "Basic or none" },
  {
    feature: "Output formats",
    plg: "MLS, Social, Email simultaneously",
    rival: "Requires separate tool uses",
  },
  {
    feature: "Brokerage affiliation",
    plg: "Independent tool for any agent",
    rival: "Tied to Epique Realty ecosystem",
  },
  {
    feature: "Focus",
    plg: "Deep listing copy specialization",
    rival: "Broad tools (bio writers, legal, etc.)",
  },
];

function VsEpique() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Epique AI</span>
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
              PLG vs Epique AI: Specialist vs. Generalist Suite
            </h1>
            <p className="text-win95-12">
              <strong>Epique AI</strong> offers a wide variety of AI tools for real estate agents,
              including bio writers, legal document summaries, and listing descriptions. It's a
              broad suite of tools that attempts to do a little bit of everything.
            </p>
            <p className="text-win95-12">
              <strong>PLG</strong> focuses exclusively on one problem and solves it deeply:
              generating the best, most compliant, and well-researched listing copy possible across
              MLS, social, and email formats.
            </p>
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
                      Epique AI
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
              If you want a Swiss Army knife of AI tools and are part of the Epique ecosystem, their
              suite is useful. If you want the absolute best tool for writing{" "}
              <strong>listing copy</strong> that is FHA-compliant, researched, and formatted
              perfectly, PLG is the superior choice.
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
