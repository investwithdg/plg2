import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { ARTICLES } from "./blog/_articles";

const BASE_URL = "https://propertylistinggenerator.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const COMPARE_SLUGS = [
  "canva",
  "chatgpt",
  "copyai",
  "curaytor",
  "dealmachine",
  "epique",
  "followupboss",
  "grammarly",
  "homebot",
  "jasper",
  "kvcore",
  "listingai",
  "listingrobot",
  "realtor",
  "reimaginehome",
  "virtualstagingai",
  "writesonic",
  "zillow",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/pricing", changefreq: "monthly", priority: "0.9" },
          { path: "/features", changefreq: "monthly", priority: "0.9" },
          { path: "/explore", changefreq: "daily", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/compare", changefreq: "monthly", priority: "0.8" },
          ...COMPARE_SLUGS.map((slug) => ({
            path: `/compare/${slug}`,
            changefreq: "monthly" as const,
            priority: "0.6",
          })),
          ...ARTICLES.map((a) => ({
            path: `/blog/${a.slug}`,
            lastmod: a.date,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
          { path: "/docs/claude", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});