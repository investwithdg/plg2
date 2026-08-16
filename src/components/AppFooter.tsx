import { Link } from "@tanstack/react-router";

const compareLinks = [
  { to: "/compare/chatgpt", label: "ChatGPT" },
  { to: "/compare/jasper", label: "Jasper" },
  { to: "/compare/copyai", label: "Copy.ai" },
  { to: "/compare/writesonic", label: "Writesonic" },
  { to: "/compare/grammarly", label: "Grammarly" },
  { to: "/compare/canva", label: "Canva" },
  { to: "/compare/listingai", label: "ListingAI" },
  { to: "/compare/listingrobot", label: "Listing Robot" },
  { to: "/compare/epique", label: "Epique" },
  { to: "/compare/realtor", label: "Realtor.com" },
  { to: "/compare/zillow", label: "Zillow" },
  { to: "/compare/kvcore", label: "kvCORE" },
  { to: "/compare/followupboss", label: "Follow Up Boss" },
  { to: "/compare/curaytor", label: "Curaytor" },
  { to: "/compare/homebot", label: "Homebot" },
  { to: "/compare/dealmachine", label: "DealMachine" },
  { to: "/compare/reimaginehome", label: "REimagineHome" },
  { to: "/compare/virtualstagingai", label: "Virtual Staging AI" },
] as const;

const productLinks = [
  { to: "/", label: "Generator" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/explore", label: "Explore Listings" },
  { to: "/docs/claude", label: "Claude / MCP Docs" },
] as const;

const resourceLinks = [
  { to: "/blog", label: "Blog" },
  { to: "/compare", label: "All Comparisons" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
] as const;

function FooterColumn({
  title,
  links,
  columns = 1,
}: {
  title: string;
  links: readonly { to: string; label: string }[];
  columns?: number;
}) {
  return (
    <nav aria-label={title} className="min-w-0">
      <h2 className="text-win95-11 font-bold uppercase tracking-wide mb-2">{title}</h2>
      <ul
        className={`list-none p-0 m-0 space-y-1 ${columns > 1 ? "sm:columns-2 sm:space-y-0" : ""}`}
      >
        {links.map((link) => (
          <li key={link.to} className={columns > 1 ? "sm:mb-1" : ""}>
            <Link
              to={link.to}
              className="text-win95-11 no-underline hover:underline text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppFooter() {
  return (
    <footer className="w-full border-t-2 border-black bg-[var(--win95-gray)] text-foreground mt-8">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 win95-raised flex items-center justify-center text-[10px] font-bold">
                P
              </span>
              <span className="text-win95-12 font-bold">PLG</span>
            </div>
            <p className="text-win95-11 max-w-[28ch]">
              FHA-compliant MLS, social, and email listing copy from any address in 15 seconds.
            </p>
          </div>
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
          <FooterColumn title="Compare" links={compareLinks} columns={2} />
        </div>
        <div className="mt-6 pt-3 border-t border-black/30 flex flex-wrap gap-2 justify-between text-win95-11">
          <span>© {new Date().getFullYear()} PropertyListingGenerator.com</span>
          <span>Built for agents who value their time.</span>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
