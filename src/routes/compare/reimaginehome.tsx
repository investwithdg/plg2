import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/reimaginehome")({
  head: () => ({
    meta: [
      { title: "PLG vs REimagineHome — Property Listing Generator Comparison" },
      { name: "description", content: "REimagineHome is an AI virtual staging tool. PLG writes listing copy. They do completely different things." },
      { property: "og:title", content: "PLG vs REimagineHome — Property Listing Generator Comparison" },
      { property: "og:description", content: "Visuals vs Text. See the difference." },
    ],
  }),
  component: VsReimagine,
});

function VsReimagine() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs REimagineHome</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">Photos vs. Words</h1>
            <p className="text-win95-12"><strong>REimagineHome</strong> is an incredible AI tool for virtual staging. It lets you upload a photo of an empty room and use AI to add furniture, change flooring, and visualize renovations.</p>
            <p className="text-win95-12"><strong>PLG</strong> is an incredible tool for copywriting. It researches the property and writes the FHA-compliant text for the MLS, social media, and email.</p>
            <p className="text-win95-12 font-bold">They don't compete. A great listing uses REimagineHome for the visuals and PLG for the words.</p>
            <div className="flex gap-2 pt-2">
              <Link to="/"><button type="button" className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed">Try PLG Free</button></Link>
              <Link to="/compare"><button type="button" className="win95-raised px-3 py-1 text-win95-12 cursor-pointer active:win95-pressed">More Comparisons</button></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
