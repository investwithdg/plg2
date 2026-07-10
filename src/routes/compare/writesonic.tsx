import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/writesonic")({
  head: () => ({
    meta: [
      { title: "PLG vs Writesonic — Property Listing Generator Comparison" },
      {
        name: "description",
        content:
          "Writesonic is a general AI writer for blogs and ads. PLG is purpose-built for FHA-compliant real estate listing copy with automated property research.",
      },
      {
        property: "og:title",
        content: "PLG vs Writesonic — Property Listing Generator Comparison",
      },
      {
        property: "og:description",
        content: "Writesonic writes blog posts. PLG writes compliant listing copy in 15 seconds.",
      },
    ],
  }),
  component: VsWritesonic,
});

const FEATURES = [
  {
    feature: "Primary purpose",
    plg: "Real estate listing copy",
    rival: "Blog posts, ads, and general content",
  },
  { feature: "FHA compliance", plg: "Built-in training & guardrails", rival: "None" },
  { feature: "Real property research", plg: "Yes (Deep research)", rival: "No" },
  { feature: "MLS-ready formatting", plg: "Yes", rival: "No — generic article format" },
  {
    feature: "Social media copy",
    plg: "Instagram & Facebook optimized",
    rival: "Generic social templates",
  },
  { feature: "Email copy", plg: "Yes — buyer list blurbs", rival: "Generic email templates" },
  { feature: "Input method", plg: "Paste an address or URL", rival: "Manual form fields" },
  { feature: "Real estate expertise", plg: "Purpose-built", rival: "None — SEO/content focused" },
  { feature: "Free tier", plg: "10 free generations", rival: "Limited free plan" },
  { feature: "Pro price", plg: "$49/mo ($39/mo annual)", rival: "$19-$99/mo" },
];

function VsWritesonic() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Writesonic</span>
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
              PLG vs Writesonic: Content Platform vs. Listing Copy Engine
            </h1>
            <p className="text-win95-12">
              <strong>Writesonic</strong> is an AI content platform focused on SEO blog posts,
              Google Ads, landing pages, and product descriptions. It's popular with content
              marketers and small business owners who need volume content.
            </p>
            <p className="text-win95-12">
              It has no real estate training, no FHA compliance awareness, no property research
              capability, and no understanding of MLS formatting requirements. You'd need to provide
              every detail manually and still review for compliance.
            </p>
            <p className="text-win95-12">
              <strong>PLG</strong> automates the entire listing copy workflow: paste an address, get
              three compliant, researched outputs in 15 seconds.
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
                      Writesonic
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
              Writesonic is a solid content marketing tool. For{" "}
              <strong>real estate listing copy</strong> — compliant, researched, formatted for MLS,
              social, and email — PLG is the purpose-built solution that saves agents hours every
              week.
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
