import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/dealmachine")({
  head: () => ({
    meta: [
      {
        title: "PLG vs DealMachine — Property Listing Generator Comparison",
      },
      {
        name: "description",
        content:
          "DealMachine is a lead-gen and driving-for-dollars tool. PLG is purpose-built for FHA-compliant listing copy. Different tools for different jobs — but PLG dominates the listing copy niche.",
      },
      {
        property: "og:title",
        content: "PLG vs DealMachine — Property Listing Generator Comparison",
      },
      {
        property: "og:description",
        content:
          "DealMachine finds deals. PLG writes the listing copy. See the full feature comparison.",
      },
    ],
  }),
  component: VsDealMachine,
});

const FEATURES = [
  {
    feature: "Primary purpose",
    plg: "Listing copy generation",
    rival: "Lead gen / driving for dollars",
  },
  {
    feature: "FHA Fair Housing compliance",
    plg: "Built-in",
    rival: "N/A",
  },
  {
    feature: "Generation speed",
    plg: "~15 seconds",
    rival: "N/A (no copy generation)",
  },
  {
    feature: "Property types supported",
    plg: "SFR/FSBO free; Pro-tier sample included",
    rival: "Residential focus (lead gen only)",
  },
  {
    feature: "Real property research",
    plg: "Yes (via Deep research)",
    rival: "Property data for leads",
  },
  {
    feature: "MLS-ready copy",
    plg: "Yes",
    rival: "No",
  },
  {
    feature: "Social media copy",
    plg: "Yes (Instagram, Facebook)",
    rival: "No",
  },
  {
    feature: "Email marketing copy",
    plg: "Yes",
    rival: "No",
  },
  {
    feature: "Free tier",
    plg: "10 free generations + 1 Pro-tier sample",
    rival: "No free tier",
  },
  {
    feature: "Pro price",
    plg: "$49/mo ($39/mo annual)",
    rival: "$99/mo+",
  },
];

function VsDealMachine() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs DealMachine</span>
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
              PLG vs DealMachine: Different Tools for Different Jobs
            </h1>
            <p className="text-win95-12">
              <strong>DealMachine</strong> is a popular driving-for-dollars and lead generation
              platform. It helps investors and agents find off-market deals by identifying
              distressed properties and contacting owners.
            </p>
            <p className="text-win95-12">
              <strong>PropertyListingGenerator.com (PLG)</strong> is purpose-built for the next
              step: once you have a property, PLG generates polished, FHA-compliant listing copy for
              MLS, social media, and email in about 15 seconds.
            </p>
            <p className="text-win95-12 font-bold">
              They solve different problems. But when it comes to listing copy, PLG dominates the
              niche.
            </p>
          </div>
        </div>

        {/* Feature comparison table */}
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
                      DealMachine
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

        {/* Verdict + CTA */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Verdict</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-win95-12">
              If you need to <strong>find</strong> deals, DealMachine is a solid choice. If you need
              to <strong>market</strong> a property with professional, compliant listing copy, PLG
              is the tool built specifically for that job.
            </p>
            <p className="text-win95-12">
              Many agents use both: DealMachine to source leads, PLG to write the listing once the
              deal closes.
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
