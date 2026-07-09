import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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

const ACCENT_COLORS = [
  "var(--win95-blue)",
  "#800000",
  "#008080",
  "#808000",
  "#800080",
  "#008000",
];

function deriveCategory(slug: string): string {
  if (slug.includes("mls") || slug.includes("listing-description"))
    return "MLS Copy";
  if (slug.includes("fha") || slug.includes("fair-housing"))
    return "FHA Compliance";
  if (slug.includes("social") || slug.includes("instagram"))
    return "Social Media";
  if (slug.includes("email")) return "Email Marketing";
  if (slug.includes("commercial")) return "Commercial";
  return "Listing Tips";
}

function BlogIndex() {
  const [featured, ...allRest] = ARTICLES;
  const [visibleCount, setVisibleCount] = useState(6);
  
  const rest = allRest.slice(0, visibleCount);
  const hasMore = visibleCount < allRest.length;

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

        {/* Featured article — hero card */}
        {featured && (
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
            className="block no-underline"
          >
            <div className="win95-window group cursor-pointer">
              <div
                className="win95-titlebar"
                style={{
                  background: "linear-gradient(to right, #800000, #c04040)",
                }}
              >
                <span className="font-bold text-win95-12 truncate pl-1">
                  ★ Featured Article
                </span>
                <span className="text-win95-11 opacity-90">
                  {featured.readTime}
                </span>
              </div>
              <div className="p-4 group-hover:bg-[color:var(--win95-blue)] group-hover:text-white transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="win95-raised px-1.5 py-0.5 text-[10px] font-bold text-black group-hover:text-black">
                    {deriveCategory(featured.slug)}
                  </span>
                  <span className="text-win95-11 text-muted-foreground group-hover:text-white/80">
                    {formatDate(featured.date)}
                  </span>
                </div>
                <h2 className="text-win95-14 font-bold mb-2">
                  {featured.title}
                </h2>
                <p className="text-win95-12 text-muted-foreground group-hover:text-white/90">
                  {featured.description}
                </p>
                <div className="mt-3 text-win95-11 font-bold text-[var(--win95-blue)] group-hover:text-white">
                  Read article →
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Article grid */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rest.map((article, i) => (
              <Link
                key={article.slug}
                to="/blog/$slug"
                params={{ slug: article.slug }}
                className="block no-underline"
              >
                <div className="win95-window h-full group cursor-pointer">
                  <div
                    className="h-1.5"
                    style={{
                      background:
                        ACCENT_COLORS[i % ACCENT_COLORS.length],
                    }}
                  />
                  <div className="p-3 group-hover:bg-[color:var(--win95-blue)] group-hover:text-white transition-colors h-full">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="win95-raised px-1.5 py-0 text-[10px] font-bold text-black group-hover:text-black">
                        {deriveCategory(article.slug)}
                      </span>
                    </div>
                    <h3 className="text-win95-12 font-bold mb-1 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-win95-11 text-muted-foreground group-hover:text-white/80 line-clamp-2 mb-2">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between text-win95-11 text-muted-foreground group-hover:text-white/70 mt-auto">
                      <span>{formatDate(article.date)}</span>
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination / Load More */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="win95-raised px-4 py-1.5 text-win95-12 font-bold cursor-pointer active:win95-pressed"
            >
              Load more articles...
            </button>
          </div>
        )}

        {hasMore && (
          <div className="text-center pt-2 pb-4">
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed"
            >
              Load More Articles
            </button>
          </div>
        )}

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
