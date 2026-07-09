import { CompareFeatureTable } from "@/components/CompareFeatureTable";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/virtualstagingai")({
  head: () => ({
    meta: [
      { title: "PLG vs Virtual Staging AI — Property Listing Generator Comparison" },
      { name: "description", content: "Virtual Staging AI puts furniture in photos. PLG writes listing copy. Two different AI tools for real estate." },
      { property: "og:title", content: "PLG vs Virtual Staging AI — Property Listing Generator Comparison" },
      { property: "og:description", content: "Visuals vs Text. See the difference." },
    ],
  }),
  component: VsVirtualStaging,
});

function VsVirtualStaging() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Virtual Staging AI</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">Photos vs. Words</h1>
            <p className="text-win95-12"><strong>Virtual Staging AI</strong> does exactly what its name says: it uses AI to stage vacant listing photos.</p>
            <p className="text-win95-12"><strong>PLG</strong> is a listing copy generator. It writes the text that goes next to those staged photos on the MLS, on Instagram, and in your email blasts.</p>
            <p className="text-win95-12 font-bold">Both use AI to save you time and money, but they handle completely different parts of your marketing workflow.</p>
            <div className="flex gap-2 pt-2">
              <Link to="/"><button type="button" className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed">Try PLG Free</button></Link>
              <Link to="/compare"><button type="button" className="win95-raised px-3 py-1 text-win95-12 cursor-pointer active:win95-pressed">More Comparisons</button></Link>
            </div>
          </div>
        
        <CompareFeatureTable rival="Virtual Staging AI" category="visual" />
      </div>
      </div>
    </div>
  );
}