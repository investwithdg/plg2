import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RetroWindow, RetroButton } from "@/components/retro";
import OutputTabsWindow from "@/components/OutputTabsWindow";
import type { OutputTabKey } from "@/components/OutputTabsWindow";
import { toast as sonnerToast } from "sonner";

interface HistoryEntry {
  id: string;
  address: string;
  property_type: string | null;
  status: string;
  created_at: string;
  beds: number | null;
  baths: number | null;
  price: number | null;
}

interface HistoryCopy {
  copy_type: string;
  content: string;
}

const TYPE_LABELS: Record<string, string> = {
  sfr: "SFR",
  fsbo: "FSBO",
  mf: "MF",
  str: "STR",
  mtr: "MTR",
  ltr: "LTR",
  estate: "ESTATE",
  commercial: "COMM",
  lease: "LEASE",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ListingHistory({
  userId,
  isProUser,
}: {
  userId: string;
  isProUser?: boolean;
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCopies, setExpandedCopies] = useState<Partial<
    Record<OutputTabKey, string>
  > | null>(null);
  const [loadingCopies, setLoadingCopies] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id, address, property_type, status, created_at, beds, baths, price")
      .eq("user_id", userId)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("History fetch error:", error);
    } else {
      setEntries((data ?? []) as HistoryEntry[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedCopies(null);
      return;
    }
    setExpandedId(id);
    setExpandedCopies(null);
    setLoadingCopies(true);

    const copyPromise = supabase
      .from("copy_generations")
      .select("copy_type, content")
      .eq("property_id", id)
      .order("created_at", { ascending: true });

    const enrichPromise = isProUser
      ? supabase
          .from("enrichments")
          .select("perplexity_raw_response")
          .eq("property_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [copyRes, enrichRes] = await Promise.all([copyPromise, enrichPromise]);

    if (copyRes.error) {
      console.error("Copy fetch error:", copyRes.error);
      setLoadingCopies(false);
      return;
    }

    const copies = (copyRes.data ?? []) as HistoryCopy[];
    const map: Partial<Record<OutputTabKey, string>> = { mls: "", social: "", email: "" };
    for (const c of copies) {
      const key = c.copy_type as OutputTabKey;
      if (key in map) map[key] = c.content;
    }

    if (enrichRes && enrichRes.data && enrichRes.data.perplexity_raw_response) {
      map.research =
        typeof enrichRes.data.perplexity_raw_response === "string"
          ? enrichRes.data.perplexity_raw_response
          : JSON.stringify(enrichRes.data.perplexity_raw_response, null, 2);
    }

    setExpandedCopies(map);
    setLoadingCopies(false);
  };

  const onCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copied!", { description: "Text copied to clipboard" });
  };

  if (loading) {
    return (
      <RetroWindow title="Your Listings" showControls={false} className="w-full max-w-3xl">
        <p className="text-win95-11 text-muted-foreground">Loading...</p>
      </RetroWindow>
    );
  }

  if (entries.length === 0) {
    return (
      <RetroWindow title="Your Listings" showControls={false} className="w-full max-w-3xl">
        <div className="win95-inset bg-input p-3">
          <p className="text-win95-12 text-muted-foreground text-center">
            No listings yet. Generate your first one above.
          </p>
        </div>
      </RetroWindow>
    );
  }

  return (
    <div className="w-full max-w-3xl space-y-2">
      <RetroWindow title="Your Listings" showControls={false}>
        <div className="space-y-1">
          {/* Table header */}
          <div className="flex gap-2 px-2 py-1 text-win95-11 font-bold text-muted-foreground border-b border-[var(--win95-gray-dark)]">
            <span className="flex-1">Address</span>
            <span className="w-14 text-center">Type</span>
            <span className="w-20 text-right hidden sm:block">Price</span>
            <span className="w-20 text-right">Date</span>
          </div>

          {entries.map((entry) => (
            <div key={entry.id}>
              <button
                className={`w-full flex gap-2 px-2 py-1.5 text-left cursor-pointer text-win95-12 ${
                  expandedId === entry.id
                    ? "bg-[color:var(--win95-blue)] text-white"
                    : "hover:bg-[color:var(--win95-blue)] hover:text-white"
                }`}
                onClick={() => handleExpand(entry.id)}
              >
                <span className="flex-1 truncate">{entry.address}</span>
                <span className="w-14 text-center font-bold">
                  {TYPE_LABELS[entry.property_type ?? ""] ?? "—"}
                </span>
                <span className="w-20 text-right hidden sm:block">
                  {entry.price ? `$${Number(entry.price).toLocaleString()}` : "—"}
                </span>
                <span className="w-20 text-right">{formatDate(entry.created_at)}</span>
              </button>

              {expandedId === entry.id && (
                <div className="p-2">
                  {loadingCopies ? (
                    <div className="win95-inset bg-input p-3">
                      <p className="text-win95-11 text-muted-foreground">Loading copies...</p>
                    </div>
                  ) : expandedCopies ? (
                    <OutputTabsWindow
                      outputs={expandedCopies}
                      renderActions={(activeTab) => (
                        <div className="flex gap-2 mt-2">
                          <RetroButton onClick={() => onCopy(expandedCopies[activeTab] ?? "")}>
                            copy {activeTab}
                          </RetroButton>
                          <RetroButton
                            onClick={() =>
                              onCopy(
                                `MLS Description:\n${expandedCopies.mls}\n\nSocial Post:\n${expandedCopies.social}\n\nEmail:\n${expandedCopies.email}`,
                              )
                            }
                          >
                            copy all
                          </RetroButton>
                        </div>
                      )}
                    />
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </RetroWindow>
    </div>
  );
}
