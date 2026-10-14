import React from "react";

export type CompetitorCategory = "ai_writer" | "crm" | "visual" | "portal" | "generic";

interface CompareFeatureTableProps {
  rival: string;
  category: CompetitorCategory;
}

export function CompareFeatureTable({ rival, category }: CompareFeatureTableProps) {
  let features = [];

  switch (category) {
    case "ai_writer":
      features = [
        {
          feature: "Primary purpose",
          plg: "Real estate listing copy",
          rival: "General marketing & sales copy",
        },
        {
          feature: "FHA Fair Housing compliance",
          plg: "Built-in training & guardrails",
          rival: "None",
        },
        {
          feature: "Real property research",
          plg: "Yes (Deep research)",
          rival: "No — hallucinations common",
        },
        {
          feature: "MLS-ready formatting",
          plg: "Yes — structure & character limits",
          rival: "No — generic paragraphs",
        },
        {
          feature: "Input method",
          plg: "Paste an address or URL",
          rival: "Prompt engineering required",
        },
      ];
      break;
    case "crm":
      features = [
        {
          feature: "Primary purpose",
          plg: "Automated listing copy generator",
          rival: "Lead management & tracking",
        },
        {
          feature: "FHA Fair Housing compliance",
          plg: "Built-in training & guardrails",
          rival: "Basic or non-existent",
        },
        { feature: "Real property research", plg: "Yes (Deep research)", rival: "No" },
        {
          feature: "Listing copy focus",
          plg: "Core product",
          rival: "Afterthought / basic add-on",
        },
      ];
      break;
    case "visual":
      features = [
        {
          feature: "Primary purpose",
          plg: "Writing listing copy that sells",
          rival: "Virtual staging & photo editing",
        },
        {
          feature: "FHA Fair Housing compliance",
          plg: "Built-in training & guardrails",
          rival: "N/A",
        },
        { feature: "Text generation", plg: "MLS, Social, Email formats", rival: "None" },
        {
          feature: "Integration",
          plg: "Generates the text for your listing",
          rival: "Generates the visuals for your listing",
        },
      ];
      break;
    case "portal":
      features = [
        {
          feature: "Primary purpose",
          plg: "Independent listing copy generator",
          rival: "Locked ecosystem portal",
        },
        {
          feature: "FHA Fair Housing compliance",
          plg: "Built-in training & guardrails",
          rival: "Basic filters",
        },
        { feature: "Social media copy", plg: "Instagram & Facebook optimized", rival: "No" },
        { feature: "Portability", plg: "Use the copy anywhere", rival: "Stuck on their platform" },
      ];
      break;
    default:
      features = [
        { feature: "Primary purpose", plg: "Real estate listing copy", rival: "Varies" },
        {
          feature: "FHA Fair Housing compliance",
          plg: "Built-in training & guardrails",
          rival: "Rarely included",
        },
        { feature: "Real property research", plg: "Yes (Deep research)", rival: "No" },
        { feature: "MLS-ready formatting", plg: "Yes — structure & character limits", rival: "No" },
      ];
      break;
  }

  return (
    <div className="win95-window">
      <div className="win95-titlebar">
        <span className="font-bold text-win95-12 truncate pl-1">Feature Comparison</span>
      </div>
      <div className="p-3">
        <div className="win95-inset overflow-x-auto">
          <table className="w-full text-win95-11 border-collapse">
            <thead>
              <tr className="bg-[var(--win95-gray)]">
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">
                  Feature
                </th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold text-[var(--win95-blue)]">
                  PLG
                </th>
                <th className="text-left p-2 border-b border-[var(--win95-gray-dark)] font-bold">
                  {rival}
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i % 2 === 0 ? "bg-white" : "bg-[var(--win95-gray-light)]"}
                >
                  <td className="p-2 border-b border-[var(--win95-gray-light)] font-bold">
                    {row.feature}
                  </td>
                  <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.plg}</td>
                  <td className="p-2 border-b border-[var(--win95-gray-light)]">{row.rival}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
