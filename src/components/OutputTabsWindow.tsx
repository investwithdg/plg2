import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export type OutputTabKey = "mls" | "social" | "email";

type OutputTabsWindowProps = {
  outputs: Record<OutputTabKey, string>;
  initialTab?: OutputTabKey;
  onTabChange?: (tab: OutputTabKey) => void;
  headerRight?: ReactNode;
  renderActions?: (activeTab: OutputTabKey) => ReactNode;
};

export default function OutputTabsWindow({
  outputs,
  initialTab = "mls",
  onTabChange,
  headerRight,
  renderActions,
}: OutputTabsWindowProps) {
  const [activeTab, setActiveTab] = useState<OutputTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabClick = (tab: OutputTabKey) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const tabs: { id: OutputTabKey; label: string }[] = [
    { id: "mls", label: "MLS" },
    { id: "social", label: "Social" },
    { id: "email", label: "Email" },
  ];

  return (
    <div className="win95-window">
      <div className="win95-titlebar">
        <span className="font-bold text-win95-12 pl-1">Your Listings</span>
        {headerRight && <div>{headerRight}</div>}
      </div>

      <div className="bg-card p-1 flex gap-0 border-b-2 border-b-black">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-1 text-win95-12 font-bold cursor-pointer relative ${
                isActive
                  ? "win95-raised bg-card -mb-[2px] pb-[3px] z-10"
                  : "win95-inset bg-input"
              } ${index > 0 ? "-ml-[1px]" : ""}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-card">
        <div className="win95-inset bg-input p-3">
          <pre className="whitespace-pre-wrap text-win95-12 font-system m-0 leading-relaxed">
            {outputs[activeTab]}
          </pre>
        </div>
        {renderActions?.(activeTab)}
      </div>
    </div>
  );
}