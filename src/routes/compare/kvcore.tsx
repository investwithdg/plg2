import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/kvcore")({
  head: () => ({
    meta: [
      { title: "PLG vs kvCORE — Property Listing Generator Comparison" },
      {
        name: "description",
        content:
          "kvCORE is a powerful CRM with basic AI add-ons. PLG is a dedicated, FHA-compliant listing copy generator.",
      },
      { property: "og:title", content: "PLG vs kvCORE — Property Listing Generator Comparison" },
      {
        property: "og:description",
        content: "CRM vs. Listing Copy Engine. See why agents use PLG alongside their CRM.",
      },
    ],
  }),
  component: VsKvCore,
});

const FEATURES = [
  {
    feature: "Primary purpose",
    plg: "Listing copy generation",
    rival: "Real Estate CRM & Lead Gen",
  },
  {
    feature: "FHA Fair Housing compliance",
    plg: "Strict AI guardrails",
    rival: "Basic or manual review needed",
  },
  { feature: "Real property research", plg: "Yes (Perplexity AI)", rival: "No" },
  { feature: "Listing generation focus", plg: "Core feature", rival: "Minor add-on feature" },
  {
    feature: "Copy formats",
    plg: "MLS, Social, Email simultaneously",
    rival: "Basic text generation",
  },
];

function VsKvCore() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs kvCORE</span>
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
            <h1 className="text-win95-16 font-bold">PLG vs kvCORE: The CRM and the Copywriter</h1>
            <p className="text-win95-12">
              <strong>kvCORE</strong> is a massive, powerful CRM and lead generation platform used
              by brokerages. While it has added some basic AI text generation features, writing
              listing copy is a tiny footnote in its massive feature set.
            </p>
            <p className="text-win95-12">
              <strong>PLG</strong> is a dedicated listing copy engine. It does one thing, but it
              does it better than any CRM's built-in tool, featuring FHA compliance checks and
              real-time property research.
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
                      kvCORE
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
              You don't choose between kvCORE and PLG. You use kvCORE to manage your leads and your
              business, and you use <strong>PLG</strong> to write the perfect listing copy when you
              win the listing.
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
