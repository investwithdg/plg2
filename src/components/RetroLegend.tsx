import { useState } from "react";

const LEGEND_ITEMS = [
  { key: "SFR", desc: "Single Family Residential" },
  { key: "FSBO", desc: "For Sale By Owner" },
  { key: "MF", desc: "Multi-Family" },
  { key: "STR", desc: "Short Term Rental" },
  { key: "MTR", desc: "Mid Term Rental" },
  { key: "LTR", desc: "Long Term Rental" },
  { key: "ESTATE", desc: "Estate / Luxury" },
  { key: "COMM", desc: "Commercial" },
  { key: "LEASE", desc: "Lease" },
  { key: "MLS", desc: "Multiple Listing Service copy" },
  { key: "Social", desc: "Instagram / Facebook caption" },
  { key: "Email", desc: "Buyer list email blurb" },
  { key: "*", desc: "Pro-only property type" },
  { key: "FHA", desc: "Fair Housing Act compliant" },
];

export default function RetroLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="win95-raised w-5 h-5 flex items-center justify-center text-win95-11 font-bold cursor-pointer text-muted-foreground"
        title="Legend"
      >
        ?
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-7 right-0 z-50 win95-window w-56">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-11">Legend</span>
              <button
                className="win95-control-btn"
                onClick={() => setOpen(false)}
              >
                x
              </button>
            </div>
            <div className="p-2 bg-card">
              <div className="win95-inset bg-input p-2 space-y-0.5 max-h-52 overflow-y-auto">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.key} className="flex gap-2 text-win95-11">
                    <span className="font-bold w-12 shrink-0 text-right">
                      {item.key}
                    </span>
                    <span className="text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
