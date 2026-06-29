import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/")({
  head: () => ({
    meta: [
      {
        title:
          "PLG vs Competitors — Property Listing Generator Comparisons",
      },
      {
        name: "description",
        content:
          "See how PropertyListingGenerator.com stacks up against DealMachine, Listing AI, and other real estate tools. Purpose-built, FHA-compliant listing copy in 15 seconds.",
      },
      {
        property: "og:title",
        content: "PLG vs Competitors — Property Listing Generator Comparisons",
      },
      {
        property: "og:description",
        content:
          "See how PropertyListingGenerator.com stacks up against DealMachine, Listing AI, and other real estate tools.",
      },
    ],
  }),
  component: CompareIndex,
});

const COMPARISONS = [
  {
    slug: "/compare/dealmachine",
    rival: "DealMachine",
    tagline: "Lead gen tool vs. purpose-built listing copy generator",
    verdict:
      "DealMachine helps you find deals. PLG writes the listing copy once you have one.",
  },
  {
    slug: "/compare/listingai",
    rival: "Listing AI / Generic AI Tools",
    tagline: "Generic AI output vs. FHA-compliant, research-backed copy",
    verdict:
      "Generic AI tools lack FHA compliance training and real property research. PLG is purpose-built.",
  },
];

function CompareIndex() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        {/* Main window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              PLG vs Competitors
            </span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                x
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-win95-12">
              PropertyListingGenerator.com is the only tool purpose-built for
              real estate listing copy. See how it compares to alternatives
              agents sometimes consider.
            </p>

            {/* Comparison cards */}
            {COMPARISONS.map((c) => (
              <Link
                key={c.slug}
                to={c.slug}
                className="block no-underline text-black"
              >
                <div className="win95-raised p-3 cursor-pointer hover:brightness-105">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-win95-13">
                      PLG vs {c.rival}
                    </span>
                  </div>
                  <p className="text-win95-11 text-muted-foreground mb-1">
                    {c.tagline}
                  </p>
                  <p className="text-win95-11 font-bold">{c.verdict}</p>
                </div>
              </Link>
            ))}

            {/* CTA */}
            <div className="text-center pt-2">
              <Link to="/">
                <button
                  type="button"
                  className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
                >
                  Try PLG Free
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
