import { createFileRoute } from "@tanstack/react-router";
import RetroGenerator from "@/components/RetroGenerator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PLG — Listing Copy in 15 Seconds" },
      {
        name: "description",
        content:
          "Paste an address or Zillow link. Get FHA-compliant MLS, social, and email copy in 15 seconds. 10 free generations, no sign-up required.",
      },
      { property: "og:title", content: "PLG — Listing Copy in 15 Seconds" },
      {
        property: "og:description",
        content:
          "The listing tool for agents who value their time. MLS, social, email — researched and compliant — in 15 seconds.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <RetroGenerator />;
}
