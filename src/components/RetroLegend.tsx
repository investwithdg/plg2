import { useState, type ReactNode } from "react";

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: "What you get",
    body: (
      <ul className="space-y-0.5">
        <li>
          <span className="font-bold">MLS</span> — long-form description for the MLS, Zillow,
          Redfin.
        </li>
        <li>
          <span className="font-bold">Social</span> — short Instagram / Facebook caption with
          hashtags.
        </li>
        <li>
          <span className="font-bold">Email</span> — buyer-list email blurb.
        </li>
      </ul>
    ),
  },
  {
    title: "FHA-compliant",
    body: (
      <p>
        Copy avoids protected-class language (race, religion, familial status, disability, etc.) so
        it's safe to publish on the MLS.
      </p>
    ),
  },
  {
    title: "Free vs Pro",
    body: (
      <p>
        10 free generations. <span className="font-bold">SFR</span> and{" "}
        <span className="font-bold">FSBO</span> are always free. Types marked with{" "}
        <span className="font-bold">*</span> (MF, STR, MTR, LTR, Estate, Commercial, Lease) require
        Pro.
      </p>
    ),
  },
  {
    title: "How generation works",
    body: (
      <p>
        Paste an address or a Zillow / Redfin / Realtor URL → we research the property and
        neighborhood → we write all 3 pieces in ~15 seconds.
      </p>
    ),
  },
];

export default function RetroLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="win95-raised w-5 h-5 flex items-center justify-center text-win95-11 font-bold cursor-pointer text-muted-foreground"
        title="How PLG works"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-7 right-0 z-50 win95-window w-72">
            <div className="win95-titlebar">
              <span className="font-bold text-win95-11">How PLG works</span>
              <button className="win95-control-btn" onClick={() => setOpen(false)}>
                x
              </button>
            </div>
            <div className="p-2 bg-card">
              <div className="win95-inset bg-input p-2 space-y-2 max-h-80 overflow-y-auto text-win95-11 text-muted-foreground">
                {SECTIONS.map((section) => (
                  <div key={section.title}>
                    <div className="font-bold text-foreground mb-0.5">{section.title}</div>
                    <div className="leading-snug">{section.body}</div>
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
