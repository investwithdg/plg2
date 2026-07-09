import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TYPE_LABELS: Record<string, string> = {
  sfr: "Single-Family",
  fsbo: "FSBO",
  mf: "Multi-Family",
  str: "Short-Term Rental",
  mtr: "Mid-Term Rental",
  ltr: "Long-Term Rental",
  estate: "Estate / Luxury",
  commercial: "Commercial",
  lease: "Lease",
};

interface ListingData {
  id: string;
  address: string;
  property_type: string | null;
  created_at: string;
  copies: { copy_type: string; content: string }[];
}

export const Route = createFileRoute("/listing/$id")({
  loader: async ({ params }) => {
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, address, property_type, created_at, status")
      .eq("id", params.id)
      .eq("status", "complete")
      .maybeSingle();

    if (propError || !property) {
      console.error("Listing route: Property fetch error or not found", propError);
      throw notFound();
    }

    const { data: copies, error: copiesError } = await supabase
      .from("copy_generations")
      .select("copy_type, content")
      .eq("property_id", params.id)
      .in("copy_type", ["mls", "social", "email"]);

    if (copiesError) {
      console.error("Listing route: Copies fetch error", copiesError);
    }

    if (!copies || copies.length === 0) {
      console.warn("Listing route: No copies found for property ID", params.id);
      throw notFound();
    }

    return {
      id: property.id,
      address: property.address,
      property_type: property.property_type,
      created_at: property.created_at,
      copies: copies as { copy_type: string; content: string }[],
    } satisfies ListingData;
  },
  head: ({ loaderData }) => {
    const addr = loaderData?.address ?? "Property Listing";
    const typeLabel = loaderData?.property_type
      ? (TYPE_LABELS[loaderData.property_type] ?? loaderData.property_type)
      : "";
    const title = `${addr}${typeLabel ? ` — ${typeLabel}` : ""} | PLG`;
    const mls = loaderData?.copies.find((c) => c.copy_type === "mls")?.content ?? "";
    const description = mls.slice(0, 160) || "AI-generated property listing copy via PLG.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: ListingPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 pl-1">Listing Not Found</span>
          </div>
          <div className="p-4 text-center space-y-3">
            <p className="text-win95-12">This listing isn't available.</p>
            <Link to="/">
              <button className="win95-raised px-4 py-1 text-win95-12 cursor-pointer active:win95-pressed">
                Generate Your Own →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  ),
});

type CopyTab = "mls" | "social" | "email";

const TAB_LABELS: Record<CopyTab, string> = {
  mls: "MLS Description",
  social: "Social Post",
  email: "Email Copy",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ListingPage() {
  const listing = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<CopyTab>("mls");

  const copyMap = Object.fromEntries(
    listing.copies.map((c: { copy_type: string; content: string }) => [c.copy_type, c.content]),
  ) as Partial<Record<CopyTab, string>>;

  const tabs = (["mls", "social", "email"] as CopyTab[]).filter(
    (t) => copyMap[t],
  );

  const handleCopy = () => {
    const text = copyMap[activeTab] ?? "";
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copied!", { description: "Text copied to clipboard" });
  };

  const handleShareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    sonnerToast.success("Link copied!", { description: "Share this listing with anyone" });
  };

  const typeLabel = listing.property_type
    ? (TYPE_LABELS[listing.property_type] ?? listing.property_type)
    : null;

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              {listing.address}
            </span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Home">
                ×
              </Link>
            </div>
          </div>
          <div className="p-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-win95-16 font-bold mb-1">{listing.address}</h1>
              <div className="flex gap-3 text-win95-11 text-muted-foreground flex-wrap">
                {typeLabel && <span>{typeLabel}</span>}
                <span>·</span>
                <span>Generated {formatDate(listing.created_at)}</span>
              </div>
            </div>
            <button
              onClick={handleShareUrl}
              className="win95-raised px-3 py-1 text-win95-11 cursor-pointer active:win95-pressed shrink-0"
            >
              📋 Copy Link
            </button>
          </div>
        </div>

        {/* Copy tabs window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 pl-1">Listing Copy</span>
          </div>

          {/* Tab bar */}
          <div className="flex border-b-2 border-[var(--win95-gray-dark)] bg-[var(--win95-gray)] px-2 pt-2 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-win95-11 font-bold cursor-pointer border-t-2 border-l-2 border-r-2 ${
                  activeTab === tab
                    ? "bg-card border-[var(--win95-gray-light)] -mb-px pb-px"
                    : "bg-[var(--win95-gray)] border-[var(--win95-gray-dark)]"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Copy content */}
          <div className="p-4 space-y-3">
            <div className="win95-inset bg-input p-3 min-h-[160px]">
              <p className="text-win95-12 leading-relaxed whitespace-pre-wrap">
                {copyMap[activeTab] ?? ""}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="win95-raised px-3 py-1 text-win95-11 cursor-pointer active:win95-pressed font-bold"
              >
                Copy {TAB_LABELS[activeTab]}
              </button>
              <button
                onClick={handleShareUrl}
                className="win95-raised px-3 py-1 text-win95-11 cursor-pointer active:win95-pressed"
              >
                Share Link
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 pl-1">
              Generate listing copy for your properties
            </span>
          </div>
          <div className="p-4 flex items-center justify-between gap-4">
            <p className="text-win95-11 text-muted-foreground">
              PLG researches the property and writes FHA-compliant MLS, social, and email copy in ~15 seconds.
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
