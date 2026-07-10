import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/chatgpt")({
  head: () => ({
    meta: [
      { title: "PLG vs ChatGPT — Property Listing Generator Comparison" },
      {
        name: "description",
        content:
          "ChatGPT can write generic text, but it has no FHA compliance training, no real property research, and no MLS formatting. See why PLG is the better choice for real estate listing copy.",
      },
      { property: "og:title", content: "PLG vs ChatGPT — Property Listing Generator Comparison" },
      {
        property: "og:description",
        content: "ChatGPT writes generic text. PLG writes FHA-compliant, research-backed listing copy in 15 seconds.",
      },
    ],
  }),
  component: VsChatGPT,
});

const FEATURES = [
  { feature: "Primary purpose", plg: "Real estate listing copy", rival: "General-purpose AI chatbot" },
  { feature: "FHA Fair Housing compliance", plg: "Built-in training & guardrails", rival: "None — doesn't know FHA rules" },
  { feature: "Real property research", plg: "Yes (Deep property research)", rival: "No — uses only what you type" },
  { feature: "Property data accuracy", plg: "Verified from public sources", rival: "Frequently hallucinated" },
  { feature: "MLS-ready formatting", plg: "Yes — proper structure & length", rival: "No — generic paragraphs" },
  { feature: "Social media copy", plg: "Instagram & Facebook optimized", rival: "Generic, needs manual editing" },
  { feature: "Email marketing copy", plg: "Yes — subject lines & blurbs", rival: "Generic, needs manual editing" },
  { feature: "Generation speed", plg: "~15 seconds (automated)", rival: "Varies — requires prompt engineering" },
  { feature: "Property types supported", plg: "10 types (SFR to Commercial)", rival: "No property type awareness" },
  { feature: "Neighborhood context", plg: "Auto-researched schools, transit, amenities", rival: "Only if you provide it manually" },
  { feature: "Free tier", plg: "10 free generations + 1 Pro-tier", rival: "Free with limits / $20/mo for GPT-4" },
  { feature: "Time to usable copy", plg: "15 seconds, ready to publish", rival: "5-15 min of prompting & editing" },
];

function VsChatGPT() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs ChatGPT</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">PLG vs ChatGPT: Why Generic AI Falls Short for Listing Copy</h1>
            <p className="text-win95-12">
              <strong>ChatGPT</strong> is the world's most popular AI chatbot. It can write essays, code, poems — and yes, it can attempt to write a property description if you prompt it carefully enough.
            </p>
            <p className="text-win95-12">
              But "can write something" and "writes compliant, researched, publish-ready listing copy" are very different things. ChatGPT doesn't know which words violate the Fair Housing Act. It doesn't look up actual property data. It doesn't format for MLS character limits. And it certainly doesn't generate social and email copy in the same pass.
            </p>
            <p className="text-win95-12">
              <strong>PropertyListingGenerator.com (PLG)</strong> does all of that — automatically, in about 15 seconds. No prompt engineering required.
            </p>
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Why It Matters</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="win95-inset p-3 space-y-2">
              <p className="text-win95-12">
                <strong>ChatGPT hallucinations are a liability.</strong> It will confidently state that a property has 4 bedrooms when it has 3, or invent nearby schools that don't exist. In real estate, inaccurate listing copy can lead to legal issues and lost credibility.
              </p>
              <p className="text-win95-12">
                <strong>FHA violations aren't optional.</strong> ChatGPT has no awareness of Fair Housing Act guidelines. It will freely use phrases like "master bedroom," "family-friendly neighborhood," or "walking distance to churches" — all potentially problematic. PLG screens every output.
              </p>
              <p className="text-win95-12">
                <strong>Prompt fatigue is real.</strong> To get decent output from ChatGPT, you need to write a detailed prompt every single time — specifying format, tone, length, compliance rules, and property details. PLG automates the entire workflow with a single address.
              </p>
            </div>
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
                    <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">Feature</th>
                    <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">PLG</th>
                    <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">ChatGPT</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-[var(--win95-gray-light)]"}>
                      <td className="p-2 border-b border-[var(--win95-gray-light)] font-bold">{row.feature}</td>
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
              ChatGPT is a brilliant general-purpose tool. But for the specific job of writing real estate listing copy that's <strong>compliant</strong>, <strong>researched</strong>, and <strong>formatted for MLS, social, and email</strong> — it's the wrong tool. You'll spend more time prompting, editing, and fact-checking than you would writing from scratch.
            </p>
            <p className="text-win95-12">
              PLG does one thing and does it better than any general-purpose AI: it turns an address into publish-ready listing copy in 15 seconds.
            </p>
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
