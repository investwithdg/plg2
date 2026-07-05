import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ARTICLES } from "./_articles";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const article = ARTICLES.find((a) => a.slug === params.slug);
    if (!article) throw notFound();
    return article;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Article"} — PLG Blog` },
      {
        name: "description",
        content: loaderData?.description ?? "",
      },
      { property: "og:title", content: loaderData?.title ?? "PLG Blog" },
      { property: "og:description", content: loaderData?.description ?? "" },
      { property: "og:type", content: "article" },
    ],
  }),
  component: BlogPost,
  notFoundComponent: () => (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 pl-1">Article Not Found</span>
          </div>
          <div className="p-4 text-center space-y-3">
            <p className="text-win95-12">This article doesn't exist.</p>
            <Link to="/blog">
              <button className="win95-raised px-4 py-1 text-win95-12 cursor-pointer active:win95-pressed">
                ← Back to Blog
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  ),
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function BlogPost() {
  const article = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-3">
        {/* Article header window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              {article.title}
            </span>
            <div className="flex gap-[2px]">
              <Link to="/blog" className="win95-control-btn no-underline" aria-label="Close">
                ×
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <h1 className="text-win95-16 font-bold mb-2">{article.title}</h1>
              <div className="flex gap-3 text-win95-11 text-muted-foreground">
                <span>{formatDate(article.date)}</span>
                <span>·</span>
                <span>{article.readTime}</span>
              </div>
            </div>
            <div className="border-t-2 border-[var(--win95-gray-dark)]" />
            <article>
              <article.intro />
            </article>
          </div>
        </div>

        {/* Each section as its own window panel */}
        {article.sections.map((section: typeof article.sections[number]) => (
          <div key={section.title} className="win95-window">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-12 truncate pl-1">
                {section.title}
              </span>
            </div>
            <div className="p-4">
              <section.Body />
            </div>
          </div>
        ))}

        {/* Footer nav */}
        <div className="win95-window">
          <div className="p-3 flex items-center justify-between flex-wrap gap-2">
            <Link to="/blog">
              <button className="win95-raised px-3 py-1 text-win95-11 cursor-pointer active:win95-pressed">
                ← All Articles
              </button>
            </Link>
            <Link to="/">
              <button className="win95-raised px-3 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed">
                Try PLG Free →
              </button>
            </Link>
          </div>
        </div>

        {/* Related articles */}
        {ARTICLES.filter((a) => a.slug !== article.slug).length > 0 && (
          <div className="win95-window">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-12 truncate pl-1">
                More Articles
              </span>
            </div>
            <div className="p-2">
              {ARTICLES.filter((a) => a.slug !== article.slug).map((a) => (
                <Link
                  key={a.slug}
                  to="/blog/$slug"
                  params={{ slug: a.slug }}
                  className="block no-underline"
                >
                  <div className="flex gap-3 px-2 py-2 hover:bg-[color:var(--win95-blue)] hover:text-white group cursor-pointer">
                    <div className="win95-raised w-7 h-7 shrink-0 flex items-center justify-center text-[13px]">
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-win95-12 font-bold truncate group-hover:text-white">
                        {a.title}
                      </p>
                      <p className="text-win95-11 text-muted-foreground group-hover:text-white/80">
                        {a.readTime} · {formatDate(a.date)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
