import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/listingrobot")({
  head: () => ({
    meta: [
      { title: "PLG vs Listing Robot — Property Listing Generator Comparison" },
      { name: "description", content: "Listing Robot provides template-based MLS descriptions. PLG is an AI copy generator with Perplexity research, FHA compliance, and three format outputs." },
      { property: "og:title", content: "PLG vs Listing Robot — Property Listing Generator Comparison" },
      { property: "og:description", content: "Template descriptions vs. researched AI copy. See why PLG is the better choice for agents." },
    ],
  }),
  component: VsListingRobot,
});

const FEATURES = [
  { feature: "Generation method", plg: "AI with Perplexity research", rival: "Mad-libs style templates" },
  { feature: "FHA Fair Housing compliance", plg: "Built-in AI guardrails", rival: "Limited or manual" },
  { feature: "Real property research", plg: "Yes", rival: "No — uses only your input" },
  { feature: "MLS-ready formatting", plg: "Yes", rival: "Yes" },
  { feature: "Social media copy", plg: "Yes", rival: "No" },
  { feature: "Email marketing copy", plg: "Yes", rival: "No" },
  { feature: "Output originality", plg: "Unique every time", rival: "Repetitive template structures" },
];

function VsListingRobot() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Listing Robot</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">PLG vs Listing Robot: Templates vs. Intelligence</h1>
            <p className="text-win95-12"><strong>Listing Robot</strong> helps agents create MLS descriptions by plugging features into pre-written templates. It's a step up from starting with a blank page, but the results often sound formulaic and require you to manually gather and input every detail.</p>
            <p className="text-win95-12"><strong>PLG</strong> is a modern AI listing generator. Instead of just filling in blanks, it uses Perplexity AI to research the property, neighborhood, and schools, and then writes unique, FHA-compliant copy for MLS, social media, and email simultaneously.</p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span></div>
          <div className="p-3"><div className="win95-inset overflow-x-auto">
            <table className="w-full text-win95-11 border-collapse">
              <thead><tr className="bg-[var(--win95-gray)]">
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Feature</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">PLG</th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Listing Robot</th>
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
            <p className="text-win95-12">Listing Robot is an older approach to solving the blank-page problem. <strong>PLG</strong> leverages modern AI to not only write better, more original copy, but to actively research the property for you and format the output for multiple channels.</p>
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
