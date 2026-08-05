/**
 * EliteSocialPanel.tsx
 *
 * Auto-post to social (Elite). Scaffolding only — connecting a real Buffer account
 * requires a Buffer OAuth app (client id/secret) that doesn't exist yet, so this panel
 * is deliberately honest about being "coming soon" rather than wiring up a fake connect
 * flow. Shown only to Elite users, same clean-no-upsell pattern as PhotoAttachmentTray:
 * Elite isn't purchasable yet either, so there's nothing to upsell non-Elite users into.
 */
import { RetroWindow } from "@/components/retro";

export default function EliteSocialPanel() {
  return (
    <RetroWindow title="Auto-Post to Social (Elite)" showControls={false} className="w-full">
      <div className="win95-inset bg-[var(--win95-gray)] text-black p-4 space-y-2">
        <p className="text-win95-11 text-slate-700 max-w-lg">
          Schedule your generated social copy straight to Instagram, Facebook, and LinkedIn via
          Buffer — no copy-pasting between tools.
        </p>
        <div className="win95-raised bg-card p-3 flex items-center justify-between gap-3">
          <span className="text-win95-11 font-bold text-slate-600">Connect Buffer account</span>
          <span className="win95-inset px-2 py-1 text-win95-11 font-bold text-slate-500">
            Coming soon
          </span>
        </div>
      </div>
    </RetroWindow>
  );
}
