import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { usePlanTier } from "@/hooks/usePlanTier";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RetroButton, RetroWindow } from "@/components/retro";
import ListingHistory from "@/components/ListingHistory";
import { toast as sonnerToast } from "sonner";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "User Hub — Property Listing Generator" },
      { name: "description", content: "Manage your PLG account, subscription, and view your generation history." },
    ],
  }),
  component: UserHubPage,
});

function UserHubPage() {
  const { user, loading: authLoading } = useAuth();
  const { plan } = usePlanTier(user);
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [totalListings, setTotalListings] = useState<number | null>(null);

  const isProUser = plan === "pro" || plan === "elite";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!cancelled && !error && count !== null) {
        setTotalListings(count);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {},
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Portal error:", err);
      sonnerToast.error("Failed to open subscription management");
      setPortalLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center justify-center">
        <RetroWindow title="PLG User Hub" showControls={false} className="w-full max-w-md">
          <p className="text-win95-12 text-muted-foreground">Loading account details...</p>
        </RetroWindow>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Main account window */}
        <RetroWindow title="PLG Member Hub" showControls={false} className="w-full">
          <div className="space-y-4">
            <div className="win95-inset bg-[var(--win95-gray)] text-black p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--win95-gray-dark)] pb-3">
                <div>
                  <h1 className="text-lg font-bold">Account Profile</h1>
                  <p className="text-win95-11 text-slate-700">{user.email}</p>
                </div>
                <div className="win95-raised px-4 py-2 bg-card text-center">
                  <span className="text-[10px] block font-bold text-muted-foreground uppercase">Active Plan</span>
                  <span className={`text-win95-14 font-bold ${isProUser ? "text-red-800" : "text-slate-800"}`}>
                    {plan?.toUpperCase() || "FREE"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Member Since</span>
                  <span className="text-win95-12 font-bold text-slate-900">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Total Listings Generated</span>
                  <span className="text-win95-12 font-bold text-slate-900">
                    {totalListings !== null ? totalListings : "Loading..."}
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--win95-gray-dark)] pt-3 flex flex-wrap items-center justify-between gap-3">
                {isProUser ? (
                  <>
                    <p className="text-win95-11 text-slate-700 max-w-md">
                      You are currently on a paid subscription. You can update billing details, change plans, or download invoices in your Stripe billing portal.
                    </p>
                    <RetroButton onClick={handleManageSubscription} disabled={portalLoading}>
                      {portalLoading ? "Loading..." : "Manage Subscription"}
                    </RetroButton>
                  </>
                ) : (
                  <>
                    <p className="text-win95-11 text-slate-700 max-w-md">
                      Upgrade to PLG Pro for unlimited generations, advanced property research, detailed school directories, and Fair Housing Act compliance reviews.
                    </p>
                    <Link to="/pricing">
                      <RetroButton variant="primary">Upgrade to Pro</RetroButton>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </RetroWindow>

        {/* Listings history rendering inside the Hub */}
        <ListingHistory userId={user.id} isProUser={isProUser} />
      </div>
    </div>
  );
}
