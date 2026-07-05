import { createFileRoute, Link } from "@tanstack/react-router";
import { ARTICLES } from "./_articles";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — PLG Property Listing Generator" },
      {
        name: "description",
        content:
          "Tips, guides, and resources for real estate agents — listing copy, Fair Housing compliance, and how to write MLS descriptions that convert.",
      },
      { property: "og:title", content: "PLG Blog — Real Estate Listing Tips" },
    ],
  }),
  component: BlogIndex,
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function BlogIndex() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG Blog</span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                ×
              </Link>
            </div>
          </div>
          <div className="p-4">
            <h1 className="text-win95-16 font-bold mb-1">
              Listing copy tips for real estate agents
            </h1>
            <p className="text-win95-11 text-muted-foreground">
              Guides on writing MLS descriptions, Fair Housing compliance, and
              getting more showings from your listings.
            </p>
          </div>
        </div>

        {/* Article list */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              Articles ({ARTICLES.length})
            </span>
          </div>
          <div className="p-2">
            <div className="space-y-1">
              {ARTICLES.map((article) => (
                <Link
                  key={article.slug}
                  to="/blog/$slug"
                  params={{ slug: article.slug }}
                  className="block no-underline"
                >
                  <div className="flex gap-3 px-2 py-2 hover:bg-[color:var(--win95-blue)] hover:text-white group cursor-pointer">
                    {/* Icon */}
                    <div className="win95-raised w-8 h-8 shrink-0 flex items-center justify-center text-[16px]">
                      📄
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-win95-12 font-bold truncate group-hover:text-white">
                        {article.title}
                      </p>
                      <p className="text-win95-11 text-muted-foreground group-hover:text-white/80 line-clamp-2 mt-0.5">
                        {article.description}
                      </p>
                    </div>
                    {/* Meta */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-win95-11 text-muted-foreground group-hover:text-white/80">
                        {formatDate(article.date)}
                      </p>
                      <p className="text-win95-11 text-muted-foreground group-hover:text-white/80">
                        {article.readTime}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              Generate listing copy in 15 seconds
            </span>
          </div>
          <div className="p-4 flex items-center justify-between gap-4">
            <p className="text-win95-11 text-muted-foreground">
              Stop writing from scratch. PLG researches the property and generates
              FHA-compliant MLS, social, and email copy for you.
            </p>
            <Link to="/">
              <button className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed shrink-0">
                Try Free →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
