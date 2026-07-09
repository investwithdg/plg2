import { CompareFeatureTable } from "@/components/CompareFeatureTable";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/compare/grammarly")({
  head: () => ({
    meta: [
      { title: "PLG vs Grammarly — Property Listing Generator Comparison" },
      { name: "description", content: "Grammarly is a writing assistant that catches typos. PLG actually writes the listing copy, researches the property, and ensures FHA compliance." },
      { property: "og:title", content: "PLG vs Grammarly — Property Listing Generator Comparison" },
      { property: "og:description", content: "Editing vs Writing. See the comparison." },
    ],
  }),
  component: VsGrammarly,
});

function VsGrammarly() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">PLG vs Grammarly</span>
            <div className="flex gap-[2px]">
              <Link to="/compare" className="win95-control-btn no-underline" aria-label="Back">&lt;</Link>
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">x</Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-win95-16 font-bold">Editor vs. Writer</h1>
            <p className="text-win95-12"><strong>Grammarly</strong> is a fantastic tool for catching typos, fixing commas, and improving sentence structure. If you write your own listing descriptions from scratch, you should definitely run them through Grammarly.</p>
            <p className="text-win95-12"><strong>PLG</strong> solves a different problem: the blank page. PLG does the research, formats the copy, and writes the actual text. You don't need Grammarly for PLG's output because the AI already uses perfect grammar.</p>
            <p className="text-win95-12 font-bold">Grammarly edits what you write. PLG writes it for you.</p>
            <div className="flex gap-2 pt-2">
              <Link to="/"><button type="button" className="win95-raised px-4 py-1 text-win95-12 font-bold cursor-pointer active:win95-pressed">Try PLG Free</button></Link>
              <Link to="/compare"><button type="button" className="win95-raised px-3 py-1 text-win95-12 cursor-pointer active:win95-pressed">More Comparisons</button></Link>
            </div>
          </div>
        
        <CompareFeatureTable rival="Grammarly" category="generic" />
      </div>
      </div>
    </div>
  );
}