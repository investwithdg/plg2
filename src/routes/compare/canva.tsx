import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/canva")({
  head: () => ({
    meta: [
      { title: "PLG vs Canva Magic Write — Property Listing Generator Comparison" },
      {
        name: "description",
        content:
          "Canva Magic Write is a design tool with basic copy generation features. PLG is purpose-built for FHA-compliant real estate listing copy.",
      },
      { property: "og:title", content: "PLG vs Canva Magic Write — Listing Generator Comparison" },
      {
        property: "og:description",
        content: "Canva designs graphics. PLG writes compliant listing copy.",
      },
    ],
  }),
  component: VsCanva,
});

const FEATURES = [
  {
    feature: "Primary purpose",
    plg: "Real estate listing copy",
    rival: "Graphic design with AI copy add-on",
  },
  { feature: "FHA compliance", plg: "Built-in training & guardrails", rival: "None" },
  { feature: "Real property research", plg: "Yes (Deep research)", rival: "No" },
  { feature: "MLS-ready formatting", plg: "Yes", rival: "No — designed for social graphics" },
  {
    feature: "Social media copy",
    plg: "Instagram & Facebook optimized",
    rival: "Basic captions for designs",
  },
  { feature: "Email copy", plg: "Yes — buyer list blurbs", rival: "No" },
  { feature: "Input method", plg: "Paste an address or URL", rival: "Type a prompt in the editor" },
  { feature: "Real estate expertise", plg: "Purpose-built", rival: "None" },
  { feature: "Free tier", plg: "10 free generations", rival: "Limited Magic Write uses" },
  { feature: "Pro price", plg: "$49/mo ($39/mo annual)", rival: "$13/mo (Canva Pro)" },
];

function VsCanva() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Canva Magic Write</span>
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
              PLG vs Canva Magic Write: Design Tool vs. Listing Copy Engine
            </h1>
            <p className="text-win95-12">
              <strong>Canva</strong> is a phenomenal graphic design platform. Its Magic Write
              feature adds basic AI text generation inside the design editor — useful for generating
              captions, headlines, and short blurbs for social media graphics.
            </p>
            <p className="text-win95-12">
              But Magic Write is a design add-on, not a listing copy tool. It has no FHA training,
              no property research, no MLS awareness, and generates only short snippets — not the
              structured, multi-format output real estate agents need.
            </p>
            <p className="text-win95-12">
              <strong>PLG</strong> generates complete MLS descriptions, social posts, and email
              blurbs from a single address — researched, compliant, and ready to publish.
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
                      Canva Magic Write
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
              Use Canva for your listing flyers and social graphics — it's excellent at that. Use{" "}
              <strong>PLG</strong> for the listing copy that goes inside those designs. They
              complement each other; they don't compete.
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
