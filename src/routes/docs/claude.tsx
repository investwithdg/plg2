import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/claude")({
  head: () => ({
    meta: [
      {
        title: "Connect PLG to Claude — Property Listing Generator",
      },
      {
        name: "description",
        content:
          "Connect Property Listing Generator to Claude over MCP and generate FHA-compliant listing copy straight from chat. Setup steps and example prompts.",
      },
      {
        property: "og:title",
        content: "Connect PLG to Claude — Property Listing Generator",
      },
      {
        property: "og:description",
        content:
          "Connect Property Listing Generator to Claude over MCP and generate FHA-compliant listing copy straight from chat.",
      },
    ],
  }),
  component: ClaudeDocsPage,
});

const MCP_SERVER_URL = "https://propertylistinggenerator.com/mcp";

const TOOLS = [
  {
    name: "generate_listing",
    description:
      "Generate MLS, social, and email copy for a property from a Zillow/Redfin/MLS URL or freeform details.",
  },
  {
    name: "compliance_check",
    description:
      "Scan listing text against fair-housing and MLS board rules; returns pass/fail plus the specific violations and how to fix them.",
  },
  {
    name: "list_listings",
    description:
      "Fetch your own previously generated listings — including one that was still generating when generate_listing's response timed out.",
  },
  {
    name: "get_property_research",
    description:
      "Pull the neighborhood research PLG already gathered for an area — schools, transit, amenities, walkability, and market overview.",
  },
];

const EXAMPLES = [
  {
    title: "Compliance-check a draft before publishing",
    prompt:
      "Here's my listing draft: [paste your text]. Run it through PLG's compliance_check, then rewrite any flagged phrases and re-check until it passes.",
  },
  {
    title: "Generate listings for a whole portfolio",
    prompt:
      "Generate PLG listings for these Zillow URLs: [list of links]. Give me a table of the MLS copy for each, then the social versions as a checklist I can paste into my scheduler.",
  },
  {
    title: "Fast draft from an address, no URL needed",
    prompt:
      "Generate a PLG listing for 412 Oak St, Portland OR — 3bd/2ba, 1,840 sqft, $625k, renovated kitchen. Then shorten the social version to under 180 characters for Instagram.",
  },
];

function ClaudeDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Connect PLG to Claude</span>
            <div className="flex gap-[2px]">
              <Link to="/hub" className="win95-control-btn no-underline" aria-label="Close">
                ×
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="win95-inset bg-[var(--win95-gray)] text-black p-4 space-y-3">
              <h1 className="text-xl font-bold">Connect PLG to Claude</h1>
              <p className="text-win95-12">
                Pro and Elite plans can add PLG as a connector on claude.ai, so an agent can
                generate and compliance-check listings without ever opening the PLG website.
              </p>

              <h2 className="text-win95-12 font-bold pt-2">Setup</h2>
              <ol className="text-win95-12 list-decimal list-inside space-y-1">
                <li>On claude.ai: Settings → Connectors → Add custom connector.</li>
                <li>
                  Paste this URL:{" "}
                  <code className="bg-white win95-inset px-1 break-all">{MCP_SERVER_URL}</code>
                </li>
                <li>Log in to your PLG account and approve — no API key needed.</li>
              </ol>
              <p className="text-win95-11 text-slate-600">
                Using Claude Desktop, Cursor, or another MCP client that only supports a static
                config file instead? Generate an API key from the "Advanced" section on your{" "}
                <Link to="/hub" className="underline">
                  hub page
                </Link>{" "}
                and use the same URL with a bearer token.
              </p>

              <h2 className="text-win95-12 font-bold pt-2">Available tools</h2>
              <div className="space-y-2">
                {TOOLS.map((tool) => (
                  <div key={tool.name} className="win95-raised bg-card p-2">
                    <code className="text-win95-11 font-bold">{tool.name}</code>
                    <p className="text-win95-11 text-slate-700">{tool.description}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-win95-12 font-bold pt-2">Example prompts</h2>
              <div className="space-y-2">
                {EXAMPLES.map((example) => (
                  <div key={example.title} className="win95-raised bg-card p-2 space-y-1">
                    <p className="text-win95-11 font-bold">{example.title}</p>
                    <p className="text-win95-11 text-slate-700 italic">"{example.prompt}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
