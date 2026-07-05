import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Listings — PLG" },
      {
        name: "description",
        content:
          "Browse recent property listings generated with PLG — FHA-compliant MLS, social, and email copy from real estate agents across the US.",
      },
      { property: "og:title", content: "Explore Listings — PLG" },
      {
        property: "og:description",
        content: "Browse real listing copy generated with PLG by agents across the US.",
      },
    ],
  }),
  component: Explore,
});

interface PropertyRow {
  id: string;
  address: string;
  property_type: string | null;
  created_at: string;
  beds: number | null;
  baths: number | null;
  price: number | null;
}

interface CopyRow {
  property_id: string;
  content: string;
}

interface ListingCard {
  property: PropertyRow;
  mlsCopy: string;
}

const TYPE_LABELS: Record<string, string> = {
  sfr: "SFR",
  fsbo: "FSBO",
  mf: "Multi-Family",
  str: "Short-Term Rental",
  mtr: "Mid-Term Rental",
  ltr: "Long-Term Rental",
  estate: "Estate / Luxury",
  commercial: "Commercial",
  lease: "Lease",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Explore() {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: properties, error } = await (
        supabase.from("properties" as never) as any
      )
        .select("id, address, property_type, created_at, beds, baths, price")
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error || !properties?.length) {
        setLoading(false);
        return;
      }

      const ids = (properties as PropertyRow[]).map((p) => p.id);
      const { data: copies } = await (
        supabase.from("copy_generations" as never) as any
      )
        .select("property_id, content")
        .eq("copy_type", "mls")
        .in("property_id", ids);

      const copyMap: Record<string, string> = {};
      for (const c of (copies ?? []) as CopyRow[]) {
        copyMap[c.property_id] = c.content;
      }

      const cards: ListingCard[] = (properties as PropertyRow[])
        .filter((p) => copyMap[p.id])
        .map((p) => ({ property: p, mlsCopy: copyMap[p.id] }));

      setListings(cards);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              Explore — Recent PLG Listings
            </span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                ×
              </Link>
            </div>
          </div>
          <div className="p-4">
            <p className="text-win95-12 font-bold mb-1">
              Browse listings generated with PLG
            </p>
            <p className="text-win95-11 text-muted-foreground">
              Real FHA-compliant copy written by PLG for agents across the US.
              Click any listing to expand the MLS description.
            </p>
          </div>
        </div>

        {/* Listings */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              {loading ? "Loading..." : `${listings.length} recent listings`}
            </span>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="win95-inset bg-input p-4 text-center">
                <p className="text-win95-11 text-muted-foreground">Loading listings...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="win95-inset bg-input p-4 text-center space-y-2">
                <p className="text-win95-12">No public listings yet.</p>
                <p className="text-win95-11 text-muted-foreground">
                  Be the first —{" "}
                  <Link to="/" className="underline">
                    generate a listing
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table header */}
                <div className="flex gap-2 px-2 py-1 text-win95-11 font-bold text-muted-foreground border-b border-[var(--win95-gray-dark)]">
                  <span className="flex-1">Address</span>
                  <span className="w-20 text-center hidden sm:block">Type</span>
                  <span className="w-24 text-right">Date</span>
                </div>

                {listings.map(({ property, mlsCopy }) => (
                  <div key={property.id}>
                    <button
                      className={`w-full flex gap-2 px-2 py-1.5 text-left cursor-pointer text-win95-12 ${
                        expanded === property.id
                          ? "bg-[color:var(--win95-blue)] text-white"
                          : "hover:bg-[color:var(--win95-blue)] hover:text-white"
                      }`}
                      onClick={() =>
                        setExpanded(expanded === property.id ? null : property.id)
                      }
                    >
                      <span className="flex-1 truncate">{property.address}</span>
                      <span className="w-20 text-center hidden sm:block font-bold text-win95-11">
                        {TYPE_LABELS[property.property_type ?? ""] ??
                          property.property_type ??
                          "—"}
                      </span>
                      <span className="w-24 text-right text-win95-11">
                        {formatDate(property.created_at)}
                      </span>
                    </button>

                    {expanded === property.id && (
                      <div className="p-3">
                        <div className="win95-inset bg-input p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-win95-11 font-bold text-muted-foreground">
                              MLS DESCRIPTION
                            </span>
                            <button
                              className="win95-raised px-2 py-0.5 text-win95-11 cursor-pointer active:win95-pressed"
                              onClick={() =>
                                navigator.clipboard.writeText(mlsCopy)
                              }
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-win95-12 whitespace-pre-wrap leading-relaxed">
                            {mlsCopy}
                          </p>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Link
                            to="/listing/$id"
                            params={{ id: property.id }}
                          >
                            <button className="win95-raised px-3 py-1 text-win95-11 cursor-pointer active:win95-pressed">
                              View full listing →
                            </button>
                          </Link>
                          <Link to="/">
                            <button className="win95-raised px-3 py-1 text-win95-11 cursor-pointer active:win95-pressed">
                              Generate similar →
                            </button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">
              Want your listing here?
            </span>
          </div>
          <div className="p-4 flex items-center justify-between gap-4">
            <p className="text-win95-11 text-muted-foreground">
              Generate FHA-compliant MLS copy in 15 seconds. Free to start.
            </p>
            <Link to="/">
              <button className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed shrink-0">
                Try PLG Free →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
