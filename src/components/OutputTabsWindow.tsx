import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  MLS_LIMIT_PRESETS,
  getRecommendedMlsLimit,
  autoTrimToLimit,
  detectStateFromAddress,
  type MlsLimitPreset,
} from "@/lib/mlsLimits";
import { RetroButton } from "@/components/retro";

export type OutputTabKey = "mls" | "social" | "email" | "research";

type OutputTabsWindowProps = {
  outputs: Partial<Record<OutputTabKey, ReactNode>>;
  initialTab?: OutputTabKey;
  onTabChange?: (tab: OutputTabKey) => void;
  headerRight?: ReactNode;
  propertyAddress?: string | null;
  isProUser?: boolean;
  onCopiesChange?: (copies: { mls: string; social: string; email: string }) => void;
  renderActions?: (activeTab: OutputTabKey, currentContent: string) => ReactNode;
};

export default function OutputTabsWindow({
  outputs,
  initialTab = "mls",
  onTabChange,
  headerRight,
  propertyAddress,
  isProUser = false,
  onCopiesChange,
  renderActions,
}: OutputTabsWindowProps) {
  const [activeTab, setActiveTab] = useState<OutputTabKey>(initialTab);

  // Editable copies state (MLS, Social, Email)
  const [editedCopies, setEditedCopies] = useState<{
    mls: string;
    social: string;
    email: string;
  }>({
    mls: typeof outputs.mls === "string" ? outputs.mls : "",
    social: typeof outputs.social === "string" ? outputs.social : "",
    email: typeof outputs.email === "string" ? outputs.email : "",
  });

  // Track original copies so agent can revert edits
  const [originalCopies, setOriginalCopies] = useState<{
    mls: string;
    social: string;
    email: string;
  }>({
    mls: typeof outputs.mls === "string" ? outputs.mls : "",
    social: typeof outputs.social === "string" ? outputs.social : "",
    email: typeof outputs.email === "string" ? outputs.email : "",
  });

  // MLS character limit preset
  const detectedState = detectStateFromAddress(propertyAddress);
  const [selectedMlsPreset, setSelectedMlsPreset] = useState<MlsLimitPreset>(() =>
    getRecommendedMlsLimit(propertyAddress)
  );

  // Update copies when outputs change
  useEffect(() => {
    const next = {
      mls: typeof outputs.mls === "string" ? outputs.mls : "",
      social: typeof outputs.social === "string" ? outputs.social : "",
      email: typeof outputs.email === "string" ? outputs.email : "",
    };
    setEditedCopies(next);
    setOriginalCopies(next);
    onCopiesChange?.(next);
  }, [outputs, onCopiesChange]);

  // Update recommended MLS preset when address changes
  useEffect(() => {
    setSelectedMlsPreset(getRecommendedMlsLimit(propertyAddress));
  }, [propertyAddress]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabClick = (tab: OutputTabKey) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleTextChange = (text: string) => {
    if (activeTab === "research") return;
    const updated = { ...editedCopies, [activeTab]: text };
    setEditedCopies(updated);
    onCopiesChange?.(updated);
  };

  const handleResetOriginal = () => {
    if (activeTab === "research") return;
    const originalText = originalCopies[activeTab];
    const updated = { ...editedCopies, [activeTab]: originalText };
    setEditedCopies(updated);
    onCopiesChange?.(updated);
  };

  const handleAutoTrimMls = () => {
    if (selectedMlsPreset.limit <= 0) return;
    const trimmed = autoTrimToLimit(editedCopies.mls, selectedMlsPreset.limit);
    const updated = { ...editedCopies, mls: trimmed };
    setEditedCopies(updated);
    onCopiesChange?.(updated);
  };

  const tabs: { id: OutputTabKey; label: string }[] = [
    { id: "mls", label: "MLS" },
    { id: "social", label: "Social" },
    { id: "email", label: "Email" },
  ];
  if (outputs.research !== undefined) {
    tabs.push({
      id: "research",
      label: isProUser ? "Research+" : "Research+ ★",
    });
  }

  // Active text calculations
  const isTextTab = activeTab !== "research";
  const currentText = isTextTab ? editedCopies[activeTab] : "";
  const originalText = isTextTab ? originalCopies[activeTab] : "";
  const isModified = isTextTab && currentText !== originalText;
  const charCount = currentText.length;
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

  // MLS specific checks
  const mlsLimit = selectedMlsPreset.limit;
  const isOverMlsLimit = activeTab === "mls" && mlsLimit > 0 && charCount > mlsLimit;
  const mlsDiff = charCount - mlsLimit;

  return (
    <div className="win95-window">
      <div className="win95-titlebar">
        <span className="font-bold text-win95-12 pl-1 flex items-center gap-1.5">
          <span>📝</span>
          <span>PLG Listing Workbench — {activeTab.toUpperCase()}</span>
        </span>
        {headerRight && <div>{headerRight}</div>}
      </div>

      {/* Tabs bar */}
      <div className="bg-card p-1 flex gap-0 border-b-2 border-b-black">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-1 text-win95-12 font-bold cursor-pointer relative ${
                isActive ? "win95-raised bg-card -mb-[2px] pb-[3px] z-10" : "win95-inset bg-input"
              } ${index > 0 ? "-ml-[1px]" : ""}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-card space-y-2">
        {/* Toolbar for text tabs (MLS, Social, Email) */}
        {isTextTab && (
          <div className="win95-raised p-2 bg-slate-100 flex flex-wrap items-center justify-between gap-2 border border-slate-400 text-win95-11">
            {/* Left side: MLS state and limits or format note */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === "mls" ? (
                <>
                  <label htmlFor="mls-limit-select" className="font-bold flex items-center gap-1">
                    <span>MLS Limit:</span>
                    {detectedState && (
                      <span className="text-[10px] bg-slate-200 px-1 font-mono text-slate-700 border border-slate-300">
                        {detectedState} Detected
                      </span>
                    )}
                  </label>
                  <select
                    id="mls-limit-select"
                    value={selectedMlsPreset.id}
                    onChange={(e) => {
                      const found = MLS_LIMIT_PRESETS.find((p) => p.id === e.target.value);
                      if (found) setSelectedMlsPreset(found);
                    }}
                    className="win95-inset bg-white px-2 py-0.5 text-win95-11 font-system text-black cursor-pointer border border-slate-400"
                  >
                    {MLS_LIMIT_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>

                  {isOverMlsLimit && (
                    <RetroButton
                      onClick={handleAutoTrimMls}
                      className="bg-amber-100 text-amber-900 border-amber-600 font-bold text-[10px] px-2 py-0.5"
                      title="Automatically trim text to fit the MLS limit at a clean sentence boundary"
                    >
                      ✂ Auto-Trim ({mlsDiff} over)
                    </RetroButton>
                  )}
                </>
              ) : activeTab === "social" ? (
                <div className="text-muted-foreground flex items-center gap-1">
                  <span className="font-bold text-black">Format:</span>
                  <span>Instagram / Facebook optimized caption with hashtags</span>
                </div>
              ) : (
                <div className="text-muted-foreground flex items-center gap-1">
                  <span className="font-bold text-black">Format:</span>
                  <span>Buyer list email blast with subject line</span>
                </div>
              )}
            </div>

            {/* Right side: Revert button if edited */}
            <div className="flex items-center gap-2">
              {isModified && (
                <RetroButton
                  onClick={handleResetOriginal}
                  className="text-[10px] py-0.5 px-2 text-slate-700"
                  title="Revert your edits back to the original generated copy"
                >
                  ⎌ Reset to Generated
                </RetroButton>
              )}
              <span className="text-[10px] text-muted-foreground font-mono">
                {isModified ? "● EDITED" : "○ CLEAN"}
              </span>
            </div>
          </div>
        )}

        {/* Content Box */}
        {isTextTab ? (
          <div className="space-y-1">
            <textarea
              value={currentText}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={12}
              className="win95-inset bg-white p-3 font-system text-win95-12 text-black w-full resize-y leading-relaxed outline-none focus:win95-focus"
              placeholder={`Enter or edit your ${activeTab.toUpperCase()} listing copy here...`}
              spellCheck={true}
            />

            {/* Status bar */}
            <div className="win95-inset bg-slate-50 px-2 py-1 flex flex-wrap items-center justify-between text-win95-11 text-slate-700">
              <div className="flex items-center gap-3">
                <span className="font-mono">
                  {charCount.toLocaleString()} {charCount === 1 ? "char" : "chars"} • {wordCount.toLocaleString()}{" "}
                  {wordCount === 1 ? "word" : "words"}
                </span>

                {activeTab === "mls" && mlsLimit > 0 && (
                  <span
                    className={`font-bold text-[11px] flex items-center gap-1 ${
                      isOverMlsLimit ? "text-[#800000]" : "text-[#008000]"
                    }`}
                  >
                    {isOverMlsLimit ? (
                      <span>⚠️ {mlsDiff} chars over limit (MLS will truncate!)</span>
                    ) : (
                      <span>✓ Within {mlsLimit.toLocaleString()} char limit (Safe for MLS)</span>
                    )}
                  </span>
                )}

                {activeTab === "email" && (
                  <span className="text-muted-foreground text-[10px]">
                    ~{Math.max(1, Math.ceil(wordCount / 200))} min read
                  </span>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground font-mono">
                <span>SANDBOX: EDITABLE</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="win95-inset bg-input p-3">{outputs.research}</div>
        )}

        {renderActions?.(activeTab, currentText)}
      </div>
    </div>
  );
}
