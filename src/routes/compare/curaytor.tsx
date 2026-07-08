import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/curaytor")({
  head: () => ({
    meta: [
      { title: "PLG vs CuraytoR / Ylopo — Property Listing Generator Comparison" },
      { name: "description", content: "CuraytoR and Ylopo are full-service marketing and ad platforms. PLG is a lightweight, instant listing copy generator." },
      { property: "og:title", content: "PLG vs CuraytoR / Ylopo — Property Listing Generator Comparison" },
      { property: "og:description", content: "Full-service marketing platforms vs. a lightning-fast listing copy generator." },
    ],
  }),
  component: VsCuraytor,
});

const FEATURES = [
  { feature: "Primary purpose", plg: "Listing copy generation", rival: "Full-service marketing & ads" },
  { feature: "Setup time", plg: "Instant", rival: "Weeks of onboarding" },
  { feature: "Cost", plg: "$49/month", rival: "$1,000+/month" },
  { feature: "FHA compliance", plg: "Strict AI guardrails", rival: "Varies by team" },
  { feature: "Focus", plg: "The words that sell the home", rival: "The ads that push the words" },
];

function VsCuraytor() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs CuraytoR & Ylopo</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">PLG vs Marketing Platforms</h1>
            <p className="text-win95-12"><strong>CuraytoR</strong> and <strong>Ylopo</strong> are massive, full-service marketing platforms. They build websites, run Facebook ads, and handle lead generation. They cost thousands of dollars a month and require significant onboarding.</p>
            <p className="text-win95-12"><strong>PLG</strong> is a specialized tool that costs $49 a month. You use it the moment you get a listing to instantly generate FHA-compliant, Perplexity-researched copy for the MLS, social media, and your email list.</p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span></div>
          <div className="p-3"><div className="win95-inset overflow-x-auto">
            <table className="w-full text-win95-11 border-collapse">
              <thead><tr className="bg-[var(--win95-gray)]">
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Feature</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">PLG</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">CuraytoR / Ylopo</th>
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
            <p className="text-win95-12">If you want an agency to run your ads, hire CuraytoR. If you want a tool that instantly writes your listing descriptions so you can get them on the market today, use <strong>PLG</strong>.</p>
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
