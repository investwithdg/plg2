import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/realtor")({
  head: () => ({
    meta: [
      { title: "PLG vs Realtor.com AI — Property Listing Generator Comparison" },
      { name: "description", content: "Realtor.com's AI tool is embedded in their portal. PLG generates copy for the MLS, social media, and email simultaneously." },
      { property: "og:title", content: "PLG vs Realtor.com AI — Property Listing Generator Comparison" },
      { property: "og:description", content: "Platform-locked vs. Portable copy. See the comparison." },
    ],
  }),
  component: VsRealtor,
});

const FEATURES = [
  { feature: "Primary purpose", plg: "Independent listing copy generator", rival: "Realtor.com listing enhancer" },
  { feature: "Platform lock-in", plg: "None — use the copy anywhere", rival: "Locked to Realtor.com ecosystem" },
  { feature: "MLS formatting", plg: "Yes — character limits respected", rival: "No" },
  { feature: "Social media copy", plg: "Yes", rival: "No" },
  { feature: "Email copy", plg: "Yes", rival: "No" },
];

function VsRealtor() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Realtor.com AI</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">PLG vs Realtor.com: Independent Tool vs. Portal Feature</h1>
            <p className="text-win95-12">Like Zillow, <strong>Realtor.com</strong> has integrated some AI generation tools into its professional dashboard. However, this tool is designed to enhance listings within their specific ecosystem.</p>
            <p className="text-win95-12"><strong>PLG</strong> is your independent copywriter. It researches the property and formats the text so you can use it in your local MLS, your Instagram feed, and your marketing emails.</p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span></div>
          <div className="p-3"><div className="win95-inset overflow-x-auto">
            <table className="w-full text-win95-11 border-collapse">
              <thead><tr className="bg-[var(--win95-gray)]">
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Feature</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">PLG</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Realtor.com AI</th>
              </tr></thead>
              <tbody>{FEATURES.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-[var(--win95-gray-light)]"}>
                  <td className="p-2 border-b border-[var(--win95-gray-light)] font-bold">{row.feature}</td>
                  <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.plg}</td>
                  <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.rival}</td>
                </tr>
              ))}</tbody>
            </table>
          </div></div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Verdict</span></div>
          <div className="p-4 space-y-3">
            <p className="text-win95-12">If you want to control your marketing and use your copy everywhere, you need an independent tool like <strong>PLG</strong>.</p>
            <div className="flex gap-2 pt-1">
              <Link to="/"><button type="button" className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed">Try PLG Free</button></Link>
              <Link to="/compare"><button type="button" className="win95-raised px-3 py-1 text-win95-12 cursor-pointer active:win95-pressed">More Comparisons</button></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
