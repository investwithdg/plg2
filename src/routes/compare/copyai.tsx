import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/copyai")({
  head: () => ({
    meta: [
      { title: "PLG vs Copy.ai — Property Listing Generator Comparison" },
      {
        name: "description",
        content: "Copy.ai is a general copywriting AI for SaaS and e-commerce. PLG is purpose-built for FHA-compliant real estate listing copy with automated property research.",
      },
      { property: "og:title", content: "PLG vs Copy.ai — Property Listing Generator Comparison" },
      { property: "og:description", content: "Copy.ai writes marketing copy. PLG writes compliant listing copy. See why agents choose PLG." },
    ],
  }),
  component: VsCopyAI,
});

const FEATURES = [
  { feature: "Primary purpose", plg: "Real estate listing copy", rival: "General marketing & sales copy" },
  { feature: "FHA Fair Housing compliance", plg: "Built-in training & guardrails", rival: "None" },
  { feature: "Real property research", plg: "Yes (Deep research)", rival: "No" },
  { feature: "MLS-ready formatting", plg: "Yes — structure & character limits", rival: "No — generic paragraphs" },
  { feature: "Social media copy", plg: "Instagram & Facebook optimized", rival: "Generic social templates" },
  { feature: "Email marketing copy", plg: "Yes — buyer list blurbs", rival: "Generic email workflows" },
  { feature: "Input method", plg: "Paste an address or URL", rival: "Fill in form fields manually" },
  { feature: "Real estate expertise", plg: "Purpose-built for agents", rival: "None — SaaS/e-commerce focused" },
  { feature: "Free tier", plg: "10 free generations", rival: "Free plan with limits" },
  { feature: "Pro price", plg: "$49/mo ($39/mo annual)", rival: "$49/mo+" },
];

function VsCopyAI() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Copy.ai</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">PLG vs Copy.ai: Sales Copy Platform vs. Listing Copy Specialist</h1>
            <p className="text-win95-12">
              <strong>Copy.ai</strong> is a popular AI copywriting platform designed for sales teams, marketers, and e-commerce businesses. It generates product descriptions, cold emails, blog intros, and social posts.
            </p>
            <p className="text-win95-12">
              It has zero understanding of real estate listing conventions: no FHA compliance awareness, no property research capability, no MLS formatting, and no knowledge of what makes a listing description convert to showings.
            </p>
            <p className="text-win95-12">
              <strong>PLG</strong> was built from day one for a single audience — real estate agents — and a single job: turning an address into compliant, researched listing copy across three formats.
            </p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Why It Matters</span></div>
          <div className="p-4 space-y-3">
            <div className="win95-inset p-3 space-y-2">
              <p className="text-win95-12"><strong>Copy.ai doesn't know real estate.</strong> Its templates are optimized for SaaS product launches and e-commerce descriptions. A "property listing" from Copy.ai reads like a product page, not an MLS description.</p>
              <p className="text-win95-12"><strong>You still do all the research.</strong> Copy.ai needs you to provide every detail — beds, baths, features, neighborhood info, school names. PLG pulls this data automatically from the address.</p>
              <p className="text-win95-12"><strong>No compliance net.</strong> Copy.ai's AI has no training on Fair Housing Act language restrictions. For real estate, this isn't a nice-to-have — it's a legal requirement.</p>
            </div>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span></div>
          <div className="p-3">
            <div className="win95-inset overflow-x-auto">
              <table className="w-full text-win95-11 border-collapse">
                <thead><tr className="bg-[var(--win95-gray)]">
                  <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Feature</th>
                  <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">PLG</th>
                  <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Copy.ai</th>
                </tr></thead>
                <tbody>{FEATURES.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-[var(--win95-gray-light)]"}>
                    <td className="p-2 border-b border-[var(--win95-gray-light)] font-bold">{row.feature}</td>
                    <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.plg}</td>
                    <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.rival}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar"><span className="font-bold text-win95-12 truncate pl-1">Verdict</span></div>
          <div className="p-4 space-y-3">
            <p className="text-win95-12">Copy.ai is great for sales teams writing cold outreach. For <strong>real estate listing copy</strong> that's compliant, researched, and formatted for MLS — it's not even close. PLG is the specialist.</p>
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
