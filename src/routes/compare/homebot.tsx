import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/homebot")({
  head: () => ({
    meta: [
      { title: "PLG vs Homebot — Property Listing Generator Comparison" },
      { name: "description", content: "Homebot is a homeowner engagement platform. PLG is a listing copy generator. Completely different tools for completely different jobs." },
      { property: "og:title", content: "PLG vs Homebot — Property Listing Generator Comparison" },
      { property: "og:description", content: "Homebot engages homeowners. PLG writes listing copy. See why they're not competitors." },
    ],
  }),
  component: VsHomebot,
});

const FEATURES = [
  { feature: "Primary purpose", plg: "Listing copy generation", rival: "Homeowner equity reports & engagement" },
  { feature: "Target user", plg: "Listing agents", rival: "Lenders & agents retaining past clients" },
  { feature: "FHA compliance", plg: "Built-in", rival: "N/A (doesn't generate listing copy)" },
  { feature: "Listing copy generation", plg: "Yes — MLS, social, email", rival: "No" },
  { feature: "Property research", plg: "Yes (Deep research)", rival: "Home value estimates only" },
  { feature: "Output", plg: "3 copy formats per address", rival: "Monthly homeowner digest emails" },
  { feature: "Use case timing", plg: "When you list a property", rival: "Ongoing client nurturing" },
  { feature: "Free tier", plg: "10 free generations", rival: "No free tier" },
  { feature: "Pro price", plg: "$49/mo ($39/mo annual)", rival: "$50-$300/mo based on contacts" },
];

function VsHomebot() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Homebot</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">PLG vs Homebot: Listing Copy vs. Client Engagement</h1>
            <p className="text-win95-12"><strong>Homebot</strong> is a homeowner engagement platform used primarily by loan officers and agents to stay connected with past clients. It sends automated monthly reports showing home equity, refinance opportunities, and local market data.</p>
            <p className="text-win95-12">Homebot does not generate listing copy. It doesn't write MLS descriptions, social media posts, or marketing emails for listings. It's a client retention tool, not a listing tool.</p>
            <p className="text-win95-12"><strong>PLG</strong> is what you use when you have a listing and need compliant, researched copy fast. Homebot is what you use to stay top-of-mind with past clients. Different stages, different tools.</p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span></div>
          <div className="p-3"><div className="win95-inset overflow-x-auto">
            <table className="w-full text-win95-11 border-collapse">
              <thead><tr className="bg-[var(--win95-gray)]">
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Feature</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">PLG</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Homebot</th>
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
            <p className="text-win95-12">Homebot and PLG serve completely different parts of the real estate workflow. <strong>Homebot nurtures past clients. PLG writes listing copy.</strong> Many agents use both — Homebot for retention, PLG when it's time to list.</p>
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
