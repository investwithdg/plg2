import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      {
        title: "Features — Property Listing Generator",
      },
      {
        name: "description",
        content:
          "Explore the features of PropertyListingGenerator.com. FHA-compliant, research-backed real estate listing copy in seconds, perfectly formatted.",
      },
      {
        property: "og:title",
        content: "Features — Property Listing Generator",
      },
      {
        property: "og:description",
        content:
          "Explore the features of PropertyListingGenerator.com. FHA-compliant, research-backed real estate listing copy in seconds, perfectly formatted.",
      },
    ],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  {
    title: "Research+",
    description:
      "Instead of hallucinating details like ChatGPT, our engine queries property and neighborhood data in real-time to gather deep, factual insights about your property before writing a single word. Access raw, copyable research data to augment your own workflows.",
  },
  {
    title: "FHA Compliance Engine",
    description:
      "Our proprietary compliance guardrails scan and rewrite your listing copy to ensure 100% compliance with Fair Housing Act guidelines. Avoid discriminatory language and costly fines effortlessly.",
  },
  {
    title: "Triple Format Output",
    description:
      "Generate copy optimized for your MLS, a punchy version for Instagram and Facebook, and a persuasive buyer-focused email—all simultaneously in just 15 seconds.",
  },
  {
    title: "Unlimited Generation Architecture",
    description:
      "With our Pro Plan, you can generate as many listings as you need without counting tokens. Our infrastructure scales with your business.",
  },
  {
    title: "Property Type Specialization",
    description:
      "We don't use generic prompts. Whether it's a Single Family Residence, a Luxury Estate, or a Short Term Rental, the system adapts its tone and structure perfectly.",
  },
  {
    title: "Secure & Simple History",
    description:
      "Your past listings and generated copies are securely saved to your account. Retrieve them instantly from any device with our blazing-fast, distraction-free interface.",
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        {/* Main window */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12 truncate pl-1">Platform Features</span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                ×
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="win95-inset bg-[var(--win95-gray)] text-black p-4">
              <h1 className="text-xl font-bold mb-2">Why Property Listing Generator?</h1>
              <p className="text-win95-12">
                We didn't just build another AI wrapper. We engineered a purpose-built real estate
                copywriting engine designed to save you hours while keeping you compliant and
                competitive.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              {FEATURES.map((feature, idx) => (
                <div key={idx} className="win95-window">
                  <div className="win95-titlebar bg-[var(--win95-gray-dark)] text-white">
                    <span className="font-bold text-win95-12 truncate pl-1 flex items-center gap-2">
                      {feature.title}
                    </span>
                  </div>
                  <div className="p-3 bg-card">
                    <p className="text-win95-12 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-6">
              <Link
                to="/"
                className="win95-raised bg-[var(--win95-gray)] text-black px-4 py-2 text-win95-12 font-bold no-underline active:win95-pressed cursor-pointer"
              >
                Try it now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
