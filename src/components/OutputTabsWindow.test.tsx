import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OutputTabsWindow from "@/components/OutputTabsWindow";
import ResearchDossier from "@/components/ResearchDossier";
import { mockCompleteProperty, mockEnrichmentData } from "@/test/mocks/fixtures";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("OutputTabsWindow Dynamic Reactivity", () => {
  it("eliminates state freezing by dynamically injecting live isProUser into frozen ResearchDossier element", () => {
    // Simulate the state freezing anti-pattern where a <ResearchDossier isProUser={false} ... />
    // was frozen into an outputs object at generation time before plan tier resolved
    const frozenOutputs = {
      mls: "Cozy home with updated kitchen.",
      social: "Just listed! #realestate",
      email: "Exclusive buyer alert",
      research: (
        <ResearchDossier
          property={mockCompleteProperty}
          enrichmentData={mockEnrichmentData}
          isProUser={false} // Initially frozen as false
        />
      ),
    };

    // 1. Initial render with isProUser={false}
    const { rerender } = render(
      <OutputTabsWindow
        outputs={frozenOutputs}
        propertyAddress={mockCompleteProperty.address}
        isProUser={false}
        initialTab="research"
      />,
    );

    // Tab label shows star for non-pro: "Research+ ★"
    expect(screen.getByRole("button", { name: "Research+ ★" })).toBeInTheDocument();

    // ResearchDossier receives isProUser=false => shows Pro Preview and teaser
    expect(screen.getByText("PRO PREVIEW")).toBeInTheDocument();
    expect(screen.getByText("PLG Research+ Intelligence Dossier [PRO ONLY]")).toBeInTheDocument();

    // 2. usePlanTier resolves: isProUser flips to true in parent container
    // The exact same frozenOutputs object reference is passed, but live isProUser is now true
    rerender(
      <OutputTabsWindow
        outputs={frozenOutputs}
        propertyAddress={mockCompleteProperty.address}
        isProUser={true}
        initialTab="research"
      />,
    );

    // Tab label immediately updates to "Research+" (no star)
    expect(screen.getByRole("button", { name: "Research+" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Research+ ★" })).not.toBeInTheDocument();

    // ResearchDossier dynamically updates to RESEARCH+ ACTIVE unblurred view
    expect(screen.getByText("RESEARCH+ ACTIVE")).toBeInTheDocument();
    expect(screen.queryByText("PRO PREVIEW")).not.toBeInTheDocument();
    expect(
      screen.queryByText("PLG Research+ Intelligence Dossier [PRO ONLY]"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Walkability Score")).toBeInTheDocument();
  });

  it("supports dynamic render functions for outputs.research", () => {
    const outputsWithRenderFn = {
      mls: "MLS description",
      research: ({ isProUser }: { isProUser: boolean }) => (
        <div data-testid="dynamic-research">
          {isProUser ? "PRO UNLOCKED CONTENT" : "FREE PREVIEW CONTENT"}
        </div>
      ),
    };

    const { rerender } = render(
      <OutputTabsWindow outputs={outputsWithRenderFn} isProUser={false} initialTab="research" />,
    );

    expect(screen.getByText("FREE PREVIEW CONTENT")).toBeInTheDocument();

    rerender(
      <OutputTabsWindow outputs={outputsWithRenderFn} isProUser={true} initialTab="research" />,
    );

    expect(screen.getByText("PRO UNLOCKED CONTENT")).toBeInTheDocument();
  });
});
