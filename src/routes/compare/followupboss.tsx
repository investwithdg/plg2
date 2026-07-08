import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/followupboss")({
  head: () => ({
    meta: [
      { title: "PLG vs Follow Up Boss — Property Listing Generator Comparison" },
      { name: "description", content: "Follow Up Boss is a lead management CRM. PLG is a listing copy generator. They don't compete; they complement each other." },
      { property: "og:title", content: "PLG vs Follow Up Boss — Property Listing Generator Comparison" },
      { property: "og:description", content: "Lead management vs. Listing Copy generation." },
    ],
  }),
  component: VsFollowUpBoss,
});

const FEATURES = [
  { feature: "Primary purpose", plg: "Listing copy generation", rival: "Lead management (CRM)" },
  { feature: "FHA compliance", plg: "Built-in", rival: "N/A" },
  { feature: "Listing Generation", plg: "Yes — MLS, Social, Email", rival: "No" },
  { feature: "Target User", plg: "Listing agents", rival: "Teams & lead-focused agents" },
];

function VsFollowUpBoss() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Follow Up Boss</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">PLG vs Follow Up Boss: Partners in Crime</h1>
            <p className="text-win95-12"><strong>Follow Up Boss (FUB)</strong> is widely considered the best real estate CRM for managing leads and teams. But it is purely a CRM—it does not write listing copy.</p>
            <p className="text-win95-12"><strong>PLG</strong> generates the listing copy that actually attracts those leads. Once PLG helps you market the listing via the MLS, social media, and email, FUB is where you manage the buyers who respond.</p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span></div>
          <div className="p-3"><div className="win95-inset overflow-x-auto">
            <table className="w-full text-win95-11 border-collapse">
              <thead><tr className="bg-[var(--win95-gray)]">
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Feature</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">PLG</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Follow Up Boss</th>
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
            <p className="text-win95-12">Use <strong>Follow Up Boss</strong> to work your leads. Use <strong>PLG</strong> to generate the listing copy that gets those leads to call you in the first place.</p>
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
