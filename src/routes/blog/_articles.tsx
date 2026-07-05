import type { ReactNode } from "react";

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  Body: () => ReactNode;
}

export const ARTICLES: Article[] = [
  {
    slug: "mls-listing-description",
    title: "How to Write an MLS Listing Description That Gets More Showings",
    description:
      "A step-by-step formula for writing property descriptions that attract buyers, stay Fair Housing compliant, and actually convert.",
    date: "2026-07-01",
    readTime: "5 min read",
    Body: () => (
      <div className="space-y-4 text-win95-12 leading-relaxed">
        <p>
          Your MLS listing description is one of the most-read pieces of
          marketing copy in real estate — and most agents write it in five
          minutes right before upload. That's a mistake. A compelling description
          doesn't just describe the property; it sells the lifestyle, earns the
          click, and filters for buyers who are actually a fit.
        </p>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          Why It Matters More Than You Think
        </h2>
        <p>
          Buyers scroll dozens of listings in a single session. The ones that
          stop the scroll share a few things in common: a strong opening line,
          specific details (not vague adjectives), and copy that speaks to who
          the buyer actually is. Generic descriptions like "charming home with
          lots of potential" signal that the agent didn't try — which makes
          buyers wonder what else they didn't try.
        </p>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          The 4-Part Formula
        </h2>
        <p className="font-bold">1. Hook (1–2 sentences)</p>
        <p>
          Open with what makes this property different. Not "beautiful 3/2 in
          great location" — every listing says that. Try: "Corner lot with a
          detached workshop that doubles as studio space — rare for this zip
          code." Specificity creates desire.
        </p>

        <p className="font-bold mt-3">2. Features (3–5 bullet points or short sentences)</p>
        <p>
          Hit the must-haves a buyer searches for: bedroom/bath count, lot size,
          garage, updates, systems (HVAC age, roof year). These are the
          facts that buyers are already filtering on — surface them clearly
          rather than burying them in paragraphs.
        </p>

        <p className="font-bold mt-3">3. Lifestyle / Neighborhood (1–2 sentences)</p>
        <p>
          Buyers don't just buy a house — they buy into a life. "Walk to the
          Saturday farmers market, bike to the greenbelt, and be at the airport
          in 20 minutes" tells a story no square footage number can. Use distance
          to real places, not vague claims like "convenient location."
        </p>

        <p className="font-bold mt-3">4. Call to Action</p>
        <p>
          End with a soft close: "Schedule your private tour before this one's
          gone" or "Showings start Saturday — book yours today." It's a small
          nudge that converts browsers to appointments.
        </p>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          Fair Housing Act: What You Cannot Say
        </h2>
        <p>
          The Fair Housing Act prohibits language that discriminates (or appears
          to discriminate) based on race, color, religion, sex, national origin,
          disability, or familial status. Violations in listing copy are more
          common than agents realize:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Familial status:</strong> "Perfect for empty nesters" or
            "adult community" signal exclusion of families with children.
          </li>
          <li>
            <strong>Religion:</strong> "Walking distance to [specific church]"
            as a selling point raises flags.
          </li>
          <li>
            <strong>National origin / race:</strong> Any reference to
            neighborhood demographics — even positive framing — is a violation.
          </li>
          <li>
            <strong>Disability:</strong> "Ideal for able-bodied buyers" or
            describing a property as "not handicap accessible" without context.
          </li>
        </ul>
        <p className="mt-3">
          Stick to property features and genuine lifestyle descriptors. When in
          doubt, describe what the house has — not who should live in it.
        </p>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          The 3 Biggest Mistakes Agents Make
        </h2>
        <ol className="list-decimal pl-5 space-y-2 mt-2">
          <li>
            <strong>Being vague:</strong> "Updated kitchen" could mean anything.
            "Kitchen updated in 2023 with quartz counters and new appliances"
            is a fact a buyer can act on.
          </li>
          <li>
            <strong>Copying the previous listing:</strong> Old descriptions
            for the same address are still indexed. Duplicated copy hurts your
            SEO and signals laziness to savvy buyers.
          </li>
          <li>
            <strong>Forgetting mobile:</strong> Over 70% of property searches
            happen on mobile. Short paragraphs, white space, and frontloaded
            details win on small screens.
          </li>
        </ol>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          How PLG Handles This For You
        </h2>
        <p>
          PLG (PropertyListingGenerator.com) researches the property using live
          data — pulling square footage, school ratings, neighborhood walkability,
          and recent sales context — then generates MLS, social, and email copy
          that follows this exact formula. Every output is screened against a
          Fair Housing filter before it reaches you. The whole process takes
          about 15 seconds.
        </p>
        <p>
          It doesn't replace your voice or your knowledge of the property. But
          it gives you a polished first draft that you can edit in 2 minutes
          instead of writing from scratch in 20.
        </p>
        <p className="mt-4 font-bold">
          Try it free at{" "}
          <a href="/" className="underline">
            PropertyListingGenerator.com
          </a>
          . No credit card required.
        </p>
      </div>
    ),
  },
  {
    slug: "fair-housing-act-listing-copy",
    title: "Fair Housing Act: What Every Agent Must Know About Listing Copy",
    description:
      "A practical guide to Fair Housing compliance in property descriptions — what language to avoid, common violations, and how to write listings that protect you and your clients.",
    date: "2026-07-03",
    readTime: "4 min read",
    Body: () => (
      <div className="space-y-4 text-win95-12 leading-relaxed">
        <p>
          The Fair Housing Act has been federal law since 1968, but violations
          in MLS copy still happen every week. Most aren't intentional — they're
          the result of agents writing quickly, using outdated templates, or
          not knowing which phrases trigger a complaint. This guide covers what
          you need to know.
        </p>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          The 7 Protected Classes
        </h2>
        <p>
          Federal law protects buyers and renters from discrimination based on:
          race, color, religion, sex, national origin, familial status (families
          with children under 18), and disability. Many states add additional
          protected classes — sexual orientation, source of income, age, and
          others. Check your state's fair housing laws for the full list.
        </p>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          What "Steering" Looks Like in a Listing
        </h2>
        <p>
          Steering means directing buyers toward or away from a property based
          on protected class. It doesn't require intent — the effect is what
          matters. In listing copy, steering shows up as:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>"Quiet, established neighborhood" (can signal racial demographics)</li>
          <li>"Great school district" without naming the school (OK when paired with specific school name; alone it can imply exclusivity)</li>
          <li>"Adult community feel" (familial status violation)</li>
          <li>"Perfect for young professionals" (age discrimination)</li>
          <li>"No Section 8" (source of income, illegal in many states)</li>
        </ul>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          Language That's Commonly Flagged
        </h2>
        <p>
          NAR's fair housing guidelines flag hundreds of specific terms. The
          ones agents most often miss:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Religion:</strong> "Walking distance to [church/mosque/synagogue]" as a lifestyle benefit
          </li>
          <li>
            <strong>National origin:</strong> Any reference to ethnic character of the neighborhood
          </li>
          <li>
            <strong>Disability:</strong> "Accessible" or "not accessible" without full context; "able-bodied"
          </li>
          <li>
            <strong>Familial status:</strong> "Empty nester paradise," "no kids," "adult-only community"
          </li>
          <li>
            <strong>Sex:</strong> "Bachelor pad," "man cave" as primary descriptors
          </li>
        </ul>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          What You Should Say Instead
        </h2>
        <p>
          Describe the property's physical features and objectively verifiable
          facts about the surrounding area:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Square footage, bedroom/bath count, lot size</li>
          <li>Named schools (using the actual school name is fine)</li>
          <li>Distance to named landmarks, employers, transit stops</li>
          <li>ADA features as features, not as qualifiers for who should live there</li>
          <li>Year built, recent updates, systems ages</li>
        </ul>

        <h2 className="text-win95-14 font-bold mt-6 mb-2">
          How PLG Keeps Your Copy Compliant
        </h2>
        <p>
          Every listing generated by PLG is run through a Fair Housing filter
          that screens for flagged language before the copy is returned to you.
          The filter checks against NAR guidelines and common state-level
          additions. If a draft contains language that could raise a complaint,
          it's rewritten before you ever see it.
        </p>
        <p>
          This doesn't replace your judgment — you should still review every
          listing before publishing. But it catches the low-hanging fruit that
          agents miss when writing quickly.
        </p>
        <p className="mt-4 font-bold">
          Generate compliant listing copy in 15 seconds at{" "}
          <a href="/" className="underline">
            PropertyListingGenerator.com
          </a>
          .
        </p>
      </div>
    ),
  },
];
