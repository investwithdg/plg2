import { createFileRoute } from "@tanstack/react-router";
import RetroGenerator from "@/components/RetroGenerator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PropertyListingGenerator.com — Listings in seconds" },
      {
        name: "description",
        content:
          "Paste a Zillow link or address. Get MLS, social, and email copy — FHA Fair Housing compliant — in 15 seconds.",
      },
      { property: "og:title", content: "PropertyListingGenerator.com" },
      {
        property: "og:description",
        content:
          "Listings for real estate agents who value their time. MLS, social, email — in 15 seconds.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <RetroGenerator />;
}
