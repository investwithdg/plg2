/**
 * BrandVoicePanel.tsx
 *
 * Elite-only "Agent Brand Voice & Guidelines" editor for the User Hub.
 * Saves tone, banned words, and a brokerage signature to brand_profiles;
 * process-property merges these into the copy prompt for Elite users.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RetroButton, RetroWindow } from "@/components/retro";
import { toast as sonnerToast } from "sonner";
import type { PlanTier } from "@/hooks/usePlanTier";

interface BrandVoicePanelProps {
  userId: string;
  plan: PlanTier;
}

export default function BrandVoicePanel({ userId, plan }: BrandVoicePanelProps) {
  const [tone, setTone] = useState("");
  const [bannedWords, setBannedWords] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isElite = plan === "elite";

  useEffect(() => {
    if (!isElite) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("brand_profiles")
        .select("tone, banned_words, signature")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setTone(data.tone ?? "");
        setBannedWords((data.banned_words ?? []).join(", "));
        setSignature(data.signature ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, isElite]);

  const handleSave = async () => {
    setSaving(true);
    const words = bannedWords
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    const { error } = await supabase.from("brand_profiles").upsert(
      {
        user_id: userId,
        tone: tone.trim() || null,
        banned_words: words,
        signature: signature.trim() || null,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      sonnerToast.error("Couldn't save your brand voice");
    } else {
      sonnerToast.success("Brand voice saved — it applies to your next generation.");
    }
  };

  if (!isElite) return null;

  return (
    <RetroWindow title="Agent Brand Voice & Guidelines" showControls={false} className="w-full">
      <div className="win95-inset bg-[var(--win95-gray)] text-black p-4 space-y-3">
        <p className="text-win95-11 text-slate-700">
          Elite only: PLG blends these into every listing it writes for you.
        </p>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground block">
            Tone & style directive
          </label>
          <textarea
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={loading}
            rows={3}
            placeholder="e.g. Warm and confident, never salesy. Short sentences. Always mention walkability."
            className="win95-inset bg-white w-full p-2 text-win95-12 resize-y"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground block">
            Banned words (comma-separated)
          </label>
          <input
            value={bannedWords}
            onChange={(e) => setBannedWords(e.target.value)}
            disabled={loading}
            placeholder="e.g. cozy, charming, must-see"
            className="win95-inset bg-white w-full p-2 text-win95-12"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground block">
            Brokerage signature line
          </label>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            disabled={loading}
            placeholder="e.g. Listed by Jane Doe, Compass Austin · (512) 555-0100"
            className="win95-inset bg-white w-full p-2 text-win95-12"
          />
        </div>

        <div className="flex justify-end pt-1">
          <RetroButton variant="primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Brand Voice"}
          </RetroButton>
        </div>
      </div>
    </RetroWindow>
  );
}
