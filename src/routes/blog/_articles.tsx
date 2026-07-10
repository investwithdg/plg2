import type { ReactNode } from "react";

export interface ArticleSection {
  title: string;
  Body: () => ReactNode;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  intro: () => ReactNode;
  sections: ArticleSection[];
}

export const ARTICLES: Article[] = [
  {
    slug: "mls-listing-description",
    title: "How to Write an MLS Listing Description That Gets More Showings",
    description:
      "A step-by-step formula for writing property descriptions that attract buyers, stay Fair Housing compliant, and actually convert.",
    date: "2026-05-27",
    readTime: "6 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          The average buyer spends less than 60 seconds reading a listing description before
          deciding to schedule a showing or move on. Your MLS description isn't literature — it's a
          sales pitch with a one-minute window. Most agents blow it.
        </p>
        <p className="text-win95-12 leading-relaxed mt-3">
          "Charming 3/2 in great location. Move-in ready. Won't last long!" That copy appears,
          nearly verbatim, on thousands of active listings right now. It says nothing. It earns
          nothing.
        </p>
      </>
    ),
    sections: [
      {
        title: "What Makes a Buyer Stop Scrolling",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Buyers scroll dozens of listings in a single session. The ones that stop them share
              one thing: a specific, verifiable detail that speaks directly to what they want. Not
              adjectives — facts. "Charming," "cozy," and "stunning" are invisible at this point.
              Buyers have trained themselves to skip them. Concrete details create a picture. A
              picture earns a showing.
            </p>
            <div className="win95-inset bg-input p-3">
              <p className="text-win95-11 text-muted-foreground mb-1">Generic (skipped):</p>
              <p className="text-win95-12 mb-3 italic">
                "Charming home with updated kitchen and great backyard. Perfect for entertaining."
              </p>
              <p className="text-win95-11 text-muted-foreground mb-1">
                Specific (stops the scroll):
              </p>
              <p className="text-win95-12 italic">
                "1,800 sq ft craftsman on a corner lot — kitchen gut-renovated in 2023 (quartz, LG
                appliances, soft-close everything) — covered patio with sun until 7pm."
              </p>
            </div>
            <p>
              Same property. The second description earns a click because a buyer can already
              picture themselves in it.
            </p>
          </div>
        ),
      },
      {
        title: "The 4-Part Formula",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p className="font-bold">1. Hook (1–2 sentences)</p>
            <p>
              Open with the one thing that's genuinely hard to find at this price point in this zip
              code. "Corner lot with a detached workshop, no HOA, and a full guest suite above the
              garage" is a hook. "Beautiful home with character" is not. If you can't identify what
              makes this property genuinely different, that's where you start — before you write a
              word.
            </p>

            <p className="font-bold">2. Features (prioritized, not exhaustive)</p>
            <p>
              Hit the must-haves buyers filter on: bedroom/bath count, lot size, garage, system
              updates, school district. Order matters — put what your target buyer cares about
              first. Include the year of major updates: "Roof 2021, HVAC 2019, water heater 2024"
              kills inspection anxiety before the showing happens.
            </p>

            <p className="font-bold">3. Lifestyle / Neighborhood (1–2 sentences)</p>
            <p>
              Buyers don't just buy a house — they buy a commute, a weekend, a school year.
              "Six-minute walk to the Saturday farmers market, bike path to the office park, 18
              minutes to the airport" does more work than "convenient location" ever could. Use
              actual place names and actual distances.
            </p>

            <p className="font-bold">4. Call to Action</p>
            <p>
              End with a soft close that creates mild urgency: "Showings start Saturday — book your
              private tour before this weekend's open house." Without it, buyers bookmark and
              forget.
            </p>
          </div>
        ),
      },
      {
        title: "Fair Housing: Words That Create Legal Exposure",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              The Fair Housing Act prohibits language that discriminates — or appears to — based on
              race, color, religion, sex, national origin, disability, or familial status.
              Violations are more common than agents realize, and most are unintentional:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Familial status:</strong> "Perfect for empty nesters," "adult community
                feel" — signal exclusion of families with children.
              </li>
              <li>
                <strong>Religion:</strong> "Walking distance to [specific church]" as a lifestyle
                benefit raises a flag.
              </li>
              <li>
                <strong>National origin / race:</strong> Any reference to neighborhood demographics,
                even framed positively, is a violation.
              </li>
              <li>
                <strong>Disability:</strong> "Ideal for able-bodied buyers" — obvious. Less obvious:
                implying unsuitability due to accessibility without full context.
              </li>
            </ul>
            <p>Rule of thumb: describe what the house has, not who should live in it.</p>
          </div>
        ),
      },
      {
        title: "The 3 Mistakes That Cost You Showings",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Vague updates:</strong> "Updated kitchen" could mean new hardware or a $60K
                gut reno. "Kitchen renovated 2023: quartz counters, LG appliances, soft-close
                cabinets" is a fact a buyer can act on.
              </li>
              <li>
                <strong>Reusing the previous listing:</strong> Old descriptions for the same address
                are still indexed on Google. Duplicate copy hurts your SEO and signals to savvy
                buyers that you didn't try.
              </li>
              <li>
                <strong>Writing for desktop:</strong> Over 70% of property searches happen on
                mobile. Front-load your best details and use short paragraphs — mobile truncates
                after sentence two.
              </li>
            </ol>
          </div>
        ),
      },
      {
        title: "How PLG Writes This For You in 15 Seconds",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              PLG researches the property using live data — square footage, school ratings,
              neighborhood walkability, nearby transit and employers — then generates MLS, social,
              and email copy that follows this exact formula. Every output is screened against a
              Fair Housing filter before it reaches you.
            </p>
            <p>
              It won't replace your knowledge of the property. But it gives you a polished,
              compliant first draft in the time it takes to pour a coffee — one you edit in two
              minutes instead of building from scratch in twenty.
            </p>
            <p className="font-bold">
              Try it free at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              . No credit card required.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "fair-housing-act-listing-copy",
    title: "Fair Housing Act: What Every Agent Must Know About Listing Copy",
    description:
      "A practical guide to Fair Housing compliance in property descriptions — what language to avoid, common violations, and how to write listings that protect you and your clients.",
    date: "2026-06-01",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          Fair Housing complaints against agents have risen steadily for over a decade. Most
          violations aren't deliberate discrimination — they're the result of agents writing
          quickly, using decade-old templates, or not knowing which phrases now trigger complaints.
          A complaint doesn't require intent. The effect is what matters.
        </p>
        <p className="text-win95-12 leading-relaxed mt-3">
          Your listing copy is the first thing a potential complainant sees. Here's how to make sure
          it's clean.
        </p>
      </>
    ),
    sections: [
      {
        title: "The 7 Federal Protected Classes",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              The Fair Housing Act (1968) prohibits discrimination based on:{" "}
              <strong>race, color, religion, sex, national origin, familial status</strong>{" "}
              (families with children under 18), and <strong>disability</strong>. Many states extend
              protection further — sexual orientation, source of income, age, marital status, and
              others. The federal floor is not the ceiling — check your state's laws.
            </p>
          </div>
        ),
      },
      {
        title: "Steering: The Violation Agents Most Often Miss",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Steering means directing buyers toward or away from a property based on a protected
              class. It doesn't require explicit discrimination — coded language is enough. In
              listing copy, steering appears as:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>"Quiet, established neighborhood"</strong> — commonly read as a racial
                demographic signal, particularly in certain zip codes.
              </li>
              <li>
                <strong>"Great school district"</strong> alone — pair with the actual school name to
                make it factual: "Zoned for Lincoln Elementary (GreatSchools 9/10)" is fine; "great
                schools" alone is not.
              </li>
              <li>
                <strong>"Adult community feel"</strong> — familial status violation. Even "feel"
                doesn't protect you.
              </li>
              <li>
                <strong>"Perfect for young professionals"</strong> — both age and familial status
                discrimination risk.
              </li>
              <li>
                <strong>"No Section 8"</strong> — illegal in states where source of income is a
                protected class (California, New York, and a growing list of others).
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "Language That's Commonly Flagged",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              NAR maintains a list of flagged terms longer than most agents expect. The ones that
              regularly catch agents off-guard:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Religion:</strong> "Walking distance to [church/mosque/synagogue]" as a
                lifestyle benefit. You can name a religious institution as a distance landmark — you
                cannot position it as a selling point.
              </li>
              <li>
                <strong>National origin:</strong> Any reference to the ethnic character of the
                neighborhood, even framed positively.
              </li>
              <li>
                <strong>Disability:</strong> "Accessible" or "not accessible" without full factual
                context. "Able-bodied" in any context.
              </li>
              <li>
                <strong>Familial status:</strong> "Empty nester paradise," "no kids nearby,"
                "adult-only community" (unless the property is a legally designated 55+ community).
              </li>
              <li>
                <strong>Sex:</strong> "Bachelor pad," "man cave" as primary marketing descriptors.
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "What Happens When a Complaint Is Filed",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              A Fair Housing complaint triggers a HUD investigation. If it proceeds, you — and
              potentially your brokerage — face civil penalties up to $21,663 for a first violation,
              higher for repeat violations, plus potential private lawsuits. Even complaints that
              don't lead to penalties cost time, legal fees, and reputation. NAR also imposes its
              own sanctions layer on top of federal enforcement.
            </p>
            <p>
              One poorly worded sentence isn't worth it. The fix is simple: describe the property,
              not the people.
            </p>
          </div>
        ),
      },
      {
        title: "What to Write Instead",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>Stick to property features and objectively verifiable area facts:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Square footage, bedroom/bath count, lot size, garage</li>
              <li>Named schools with factual ratings</li>
              <li>Distance to named landmarks, employers, transit stops</li>
              <li>
                ADA features described as features — ramp, wide doorways, roll-in shower — without
                qualifying who should live there
              </li>
              <li>Year built, recent updates, system ages (roof, HVAC, water heater)</li>
            </ul>
            <p className="mt-2">
              The test: read every sentence and ask "does this describe the property, or the kind of
              person who should live here?" If it's the latter, rewrite it.
            </p>
          </div>
        ),
      },
      {
        title: "How PLG Keeps Your Copy Compliant",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Every listing generated by PLG is run through a Fair Housing filter before the copy is
              returned to you. The filter checks against NAR guidelines and common state-level
              additions. If a generated draft contains language that could raise a complaint, it's
              rewritten automatically — you never see the flagged version.
            </p>
            <p>
              This doesn't replace your review. But it catches the routine violations that happen
              when agents are writing quickly and not thinking about compliance.
            </p>
            <p className="font-bold">
              Generate compliant listing copy in 15 seconds at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              .
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "short-term-rental-listing-description",
    title: "How to Write a Short-Term Rental Listing Description (Airbnb, VRBO, Booking.com)",
    description:
      "Stand out on crowded STR platforms with listing copy that converts browsers into bookers — what to include, what to skip, and how to write for the algorithm.",
    date: "2026-06-06",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          There are over 7 million Airbnb listings worldwide. Your guests are comparing five of them
          side-by-side, on a phone, while distracted. Listing copy is one of the few factors you
          fully control — and most hosts write it like a real estate brochure. That's the wrong
          format for this job.
        </p>
      </>
    ),
    sections: [
      {
        title: "Why STR Copy Is Completely Different From MLS Copy",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              MLS descriptions sell to buyers who've already decided they want to move. STR
              descriptions sell to travelers who are still deciding whether this trip is worth it —
              and whether your place is the one they'll remember.
            </p>
            <p>
              The stakes are different: a buyer tours before committing. An Airbnb guest books
              sight-unseen based entirely on your photos and words. That's a complete trust
              transaction, and your listing copy either earns it or loses it.
            </p>
            <p>
              Two questions every STR description must answer immediately:{" "}
              <strong>What makes this place worth booking over the alternative?</strong> And{" "}
              <strong>Is it right for my specific trip?</strong>
            </p>
          </div>
        ),
      },
      {
        title: "The 5-Part STR Description Formula",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p className="font-bold">1. The vibe hook (1 sentence)</p>
            <p>Lead with the feeling, not the floor plan. Guests buy experiences.</p>
            <div className="win95-inset bg-input p-3 my-1">
              <p className="text-win95-11 text-muted-foreground mb-1">Spec-first (forgettable):</p>
              <p className="text-win95-12 mb-3 italic">
                "3BR/2BA near beach, fully equipped kitchen, sleeps 6."
              </p>
              <p className="text-win95-11 text-muted-foreground mb-1">Vibe-first (books):</p>
              <p className="text-win95-12 italic">
                "A sun-drenched bungalow two blocks from the water, with a hammock on the deck and a
                kitchen stocked for real cooking."
              </p>
            </div>

            <p className="font-bold">2. The space (3–5 sentences)</p>
            <p>
              Describe the layout in plain English. How many guests does it sleep comfortably — not
              the fire code maximum, the actual comfortable number? Is the kitchen stocked for real
              cooking or coffee-only? Answer the questions guests message about before they book.
            </p>

            <p className="font-bold">3. The one standout amenity</p>
            <p>
              Every listing has a thing: the rooftop hot tub, the record collection, the
              wood-burning fireplace, the EV charger, the outdoor shower. Find yours and give it a
              sentence of its own — this is what guests screenshot and send to friends, and what
              drives the booking decision over a comparable listing at the same price.
            </p>

            <p className="font-bold">4. Location in 3 specific facts</p>
            <p>
              "Centrally located" is noise. Travelers care about: how many minutes to the main
              attraction, what coffee shop is walkable, and whether parking is included or a
              nightmare. Three concrete facts beat a paragraph of location fluff every time.
            </p>

            <p className="font-bold">5. Who it's best for</p>
            <p>
              Pre-qualify your guests in the last sentence. "Ideal for remote workers who need quiet
              and fast WiFi" or "Great for families — the backyard is fully fenced and the Pack 'n
              Play is set up." This cuts misfit bookings, which is where bad reviews come from. Fair
              Housing rules still apply — describe the space, not who you prefer to host.
            </p>
          </div>
        ),
      },
      {
        title: "Platform-Specific Nuances",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong>Airbnb:</strong> The first ~500 characters show before guests click "more."
                Your hook and standout amenity must both fit in that window. Most hosts waste this
                space on specs.
              </li>
              <li>
                <strong>VRBO:</strong> Guests skew toward families booking longer stays (5–10
                nights). Emphasize kitchen quality, laundry access, and outdoor space. Nightlife
                proximity matters less.
              </li>
              <li>
                <strong>Booking.com:</strong> Attracts more value-conscious and business travelers.
                Lead with what's included — parking, fast WiFi, airport distance — before
                atmosphere.
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "What PLG Generates for Short-Term Rentals",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              PLG's STR mode researches the property location — pulling nearby attractions, transit
              options, walkability data, and neighborhood context — and writes platform-optimized
              copy tuned for travelers, not MLS buyers. You get a description built for each
              platform's format in about 15 seconds, Fair Housing compliant and ready to post.
            </p>
            <p className="font-bold">
              Try it at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              . No credit card required.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "fsbo-listing-description",
    title: "FSBO Listing Description: How to Write Copy That Competes With Agent Listings",
    description:
      "Selling your home without an agent? Your listing copy needs to work twice as hard. Here's how to write an FSBO description that attracts serious buyers.",
    date: "2026-06-11",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          FSBO sellers lose buyers before the showing — not during it. When your listing hits Zillow
          or Realtor.com, it sits next to professionally written, agent-crafted descriptions. A
          two-sentence description written in five minutes doesn't just underperform — it signals to
          buyers that something might be wrong.
        </p>
        <p className="text-win95-12 leading-relaxed mt-3">
          You can close this gap without an agent. It takes about 30 minutes of research and one
          solid draft. Here's how.
        </p>
      </>
    ),
    sections: [
      {
        title: "Why FSBO Copy Has to Be Better, Not Just Equal",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Buyers' agents often deprioritize FSBO listings when their clients aren't offering a
              co-op commission. That means your listing competes primarily for direct buyers — the
              person scrolling Zillow themselves. These buyers are educated, skeptical, and often
              assume an FSBO is priced to compensate for something the seller doesn't want to
              disclose.
            </p>
            <p>
              Your description has to pre-empt those objections, establish credibility, and create
              desire — all the work a buyer's agent would do in their pre-tour pitch. That's the
              bar.
            </p>
          </div>
        ),
      },
      {
        title: "The FSBO Description Formula",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p className="font-bold">Lead with the hardest-to-find feature</p>
            <p>
              Don't open with "Charming home available now." Open with what buyers at your price
              point can't easily find elsewhere. "Corner lot, finished 2-car garage, no HOA" is a
              hook. Give buyers a reason to stop scrolling before they even read the specs.
            </p>

            <p className="font-bold">Be surgical about updates</p>
            <p>
              "Updated kitchen" is the most useless phrase in real estate. Spell it out: "Kitchen
              renovated 2022: quartz countertops, soft-close cabinets, LG appliance suite." Roof,
              HVAC, and water heater ages matter enormously. "Roof 2020, HVAC 2018, water heater
              2023" tells a buyer they won't have a major repair bill in their first five years.
            </p>

            <p className="font-bold">Price the value, not just the home</p>
            <p>
              Direct buyers do Zillow comps while they read your listing. Help them see the value
              first: "Priced $25K below the last comp on Oak St with a newer roof and updated
              baths." Facts buyers would have to research themselves — given to them upfront — build
              trust that you're a serious seller.
            </p>

            <p className="font-bold">Address the agent co-op question</p>
            <p>
              If you're willing to offer a buyer's agent commission, say so: "Buyer's agents welcome
              — 2.5% offered." This one sentence puts your listing on agents' radar and can
              dramatically increase showing volume. If you're not offering one, don't leave it
              ambiguous — uncertainty is a reason agents skip you.
            </p>
          </div>
        ),
      },
      {
        title: "Fair Housing Applies to FSBO Sellers Too",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              The Fair Housing Act covers private sellers — not just agents and brokerages. You
              cannot write language that discriminates based on race, color, religion, sex, national
              origin, familial status, or disability. "Great for couples," "quiet adult community,"
              or "perfect for working professionals" can all trigger complaints, regardless of
              intent.
            </p>
            <p>
              Stick to the property's features and objectively verifiable facts about the area.
              Describe what the house has, not who should live in it.
            </p>
          </div>
        ),
      },
      {
        title: "How PLG Levels the Playing Field for FSBO Sellers",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              PLG generates professionally written listing copy by researching the property —
              pulling school ratings, walkability scores, comparable sales context, and neighborhood
              data — then writing MLS, social, and email copy that matches what agent-listed homes
              put out. Every output is Fair Housing compliant before you see it.
            </p>
            <p>
              For the cost of zero agent commission, you get professional-grade copy in 15 seconds.
              That's the whole pitch.
            </p>
            <p className="font-bold">
              Generate your FSBO listing in 15 seconds at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              .
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "rental-property-listing-description",
    title: "How to Write a Rental Property Listing Description That Fills Vacancies Fast",
    description:
      "Long-term rental listings compete on Zillow, Apartments.com, and Craigslist simultaneously. Here's the formula for copy that attracts qualified tenants and reduces vacancy time.",
    date: "2026-06-16",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          Every day a rental sits vacant is money out of your pocket. At $1,800/month, a two-week
          vacancy costs you $900. Writing better listing copy is the lowest-cost lever you have —
          and most landlords treat it as an afterthought, posting the same generic description they
          used three years ago.
        </p>
        <p className="text-win95-12 leading-relaxed mt-3">
          Better copy doesn't just fill your vacancy faster — it pre-qualifies tenants, reducing
          no-show tours and unfit applicants.
        </p>
      </>
    ),
    sections: [
      {
        title: "What Qualified Tenants Screen For First",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              A long-term tenant is making a 12-month financial commitment. Within the first five
              seconds, they're eliminating options based on:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Is the rent in my budget, all-in?</li>
              <li>Is it available when I need it?</li>
              <li>Are pets allowed? (non-negotiable for 40%+ of renters)</li>
              <li>Is laundry in-unit, in-building, or off-site?</li>
              <li>What's the commute to my job or transit line?</li>
            </ul>
            <p>
              If your listing doesn't answer these in the first two sentences, qualified tenants
              move to the next listing. The ones who do contact you are often the ones who didn't
              filter carefully — not the applicants you want.
            </p>
          </div>
        ),
      },
      {
        title: "The Rental Listing Formula",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p className="font-bold">Line 1: The filter line</p>
            <p>Start with the facts that eliminate unfit inquiries.</p>
            <div className="win95-inset bg-input p-3 my-1">
              <p className="text-win95-12 italic">
                "$1,850/mo | 2BR/1BA | Available Aug 1 | Cats OK, small dogs (under 40 lbs) OK with
                deposit."
              </p>
            </div>
            <p>
              Tenants who don't fit self-select out before you get a call from someone with a Great
              Dane.
            </p>

            <p className="font-bold">The unit</p>
            <p>
              Square footage, layout, and light. "South-facing with floor-to-ceiling windows" is
              specific. "Bright" is not. Include laundry status (in-unit washer/dryer is a major
              filter), parking specifics, and any included utilities.
            </p>

            <p className="font-bold">The building and neighborhood</p>
            <p>
              Name the transit line and walking distance. Name the grocery store. Give commute times
              to two major employers. "12-minute walk to the Blue Line, Whole Foods on the corner,
              25 minutes to downtown by train" tells a whole story in one sentence.
            </p>

            <p className="font-bold">The deal terms</p>
            <p>
              "12-month lease, first month + 1.5x security deposit, income requirement 3x rent" —
              this separates serious inquiries from time-wasters. Be explicit. Vague terms attract
              low-quality applicants.
            </p>
          </div>
        ),
      },
      {
        title: "Fair Housing and Rental Listings",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Rental properties are fully covered by the Fair Housing Act. The most common
              violations in rental listings:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>"No Section 8":</strong> Source of income is a protected class in
                California, New York, Washington, and many others. This phrase alone is a violation
                in those states.
              </li>
              <li>
                <strong>"Ideal for single professional":</strong> Familial status discrimination.
                You can state income requirements; you cannot state your preferred household type.
              </li>
              <li>
                <strong>"Quiet, mature community":</strong> Commonly read as exclusion of families
                with children. Describe the building instead — concrete construction, soundproofed
                units — not the community composition.
              </li>
            </ul>
            <p>
              Stick to the unit's features. Set your income and credit requirements — that's legal.
              Describe the people you want — that's not.
            </p>
          </div>
        ),
      },
      {
        title: "How PLG Helps Landlords and Property Managers",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              PLG's long-term rental mode generates copy tuned for Zillow Rentals, Apartments.com,
              and Craigslist — pulling transit data, walkability scores, and neighborhood context
              automatically. No research required on your end. Fair Housing compliant out of the
              box.
            </p>
            <p>
              For property managers with multiple units, PLG generates unique, non-duplicate copy
              for each unit in seconds — so your listings don't cannibalize each other's SEO or look
              copy-pasted to applicants.
            </p>
            <p className="font-bold">
              Fill your vacancy faster at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              .
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "luxury-home-listing-description",
    title: "How to Write a Luxury Home Listing Description (Estate & High-End Properties)",
    description:
      "Luxury buyers have a different decision process. Here's how to write listing copy for high-end estates that matches the quality of the property.",
    date: "2026-06-21",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          A $4M estate described the same way as a $400K starter home is malpractice. Luxury buyers
          aren't scrolling Zillow at midnight. Their agents are curating shortlists. In seconds,
          those agents judge whether a listing is worth their client's time — and they use
          presentation as a proxy for quality. Weak copy signals a weak seller.
        </p>
      </>
    ),
    sections: [
      {
        title: "How Luxury Buyers (and Their Advisors) Are Different",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              A significant share of luxury transactions happen before a property goes public —
              through agent-to-agent networks and private databases. When a property does appear
              publicly, it's often the buyer's agent who sees it first and decides whether to
              present it to their client.
            </p>
            <p>
              That agent is asking one question: "Does this listing present as well as the property
              actually is?" If the answer is no, they move on. Your copy is the filter that
              determines whether the buyer ever hears about it.
            </p>
          </div>
        ),
      },
      {
        title: "Luxury Listing Copy Principles",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p className="font-bold">Specificity over superlatives</p>
            <p>
              "Stunning" and "breathtaking" are the weakest words in luxury copy. They're
              unverifiable and signal the writer ran out of specific things to say. The test: could
              you paste this sentence onto any other luxury listing without changing a word? If yes,
              it doesn't belong here.
            </p>
            <div className="win95-inset bg-input p-3 my-1">
              <p className="text-win95-11 text-muted-foreground mb-1">Weak:</p>
              <p className="text-win95-12 mb-3 italic">
                "Stunning views from every room in this breathtaking estate."
              </p>
              <p className="text-win95-11 text-muted-foreground mb-1">Strong:</p>
              <p className="text-win95-12 italic">
                "Floor-to-ceiling steel casement windows frame unobstructed mountain views from the
                primary suite, the great room, and the chef's kitchen — each room oriented to catch
                the morning light."
              </p>
            </div>
            <p>
              A buyer's agent can use that second sentence verbatim in their pitch. They cannot do
              anything with "breathtaking."
            </p>

            <p className="font-bold">Lead with the architectural narrative</p>
            <p>
              Luxury properties have stories, and those stories are value. A 1920s Spanish Colonial
              painstakingly restored over four years is not just a house — it's a provenance. A
              contemporary build designed by a notable regional architect isn't just modern — it's a
              credential. Use the story. It's what separates this property from every comparable in
              the MLS.
            </p>

            <p className="font-bold">Name the materials</p>
            <p>
              "Quartzite waterfall island," "white oak wide-plank floors," "Lutron Caseta
              throughout," "Miele and Sub-Zero appliances." Material specificity is a proxy for
              quality. Buyers who know the difference use it to pre-qualify the listing. Buyers who
              don't are still impressed by the specificity.
            </p>

            <p className="font-bold">Privacy and security as features</p>
            <p>
              Estate buyers are often buying privacy as much as square footage. Gated entry, acreage
              buffers, mature tree screens, and smart security systems are selling points — name
              them explicitly.
            </p>
          </div>
        ),
      },
      {
        title: "Length, Format, and Word Count",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Luxury listings earn longer descriptions — buyers expect them, and agents need the
              material to work with. A $5M property described in three sentences reads as lazy or
              hiding something. Aim for 400–600 words in the MLS description, organized into
              readable sections: architectural overview, interior highlights, outdoor living,
              location. Use bold labels rather than burying everything in dense paragraphs.
            </p>
          </div>
        ),
      },
      {
        title: "How PLG Handles Luxury and Estate Properties",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              PLG's Estate mode generates long-form luxury listing copy — pulling architectural
              details, acreage, nearby amenities, and neighborhood context — and writes in a
              register appropriate for high-end properties. No filler superlatives. Specific,
              verifiable, and compelling copy that gives buyer's agents something to actually use.
            </p>
            <p className="font-bold">
              Try PLG for your next luxury listing at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              .
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "real-estate-social-media-listing-copy",
    title: "Real Estate Social Media Copy: How to Write Instagram and Facebook Posts for Listings",
    description:
      "MLS copy doesn't work on social. Here's how to write real estate Instagram captions and Facebook posts that stop the scroll and drive inquiries.",
    date: "2026-06-26",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          Most agents copy their MLS description into Instagram and call it social media marketing.
          It doesn't work. MLS copy is built for a search index — keyword-dense, spec-forward,
          formal. Social copy is built for a thumb moving at 3x speed with zero obligation to stop.
          The jobs are completely different.
        </p>
      </>
    ),
    sections: [
      {
        title: "Instagram: Photo Stops, Caption Sells",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Your photo does the stopping. Your caption does the selling. Most agents waste the
              caption moment with a price and an address, which tells a viewer nothing they didn't
              already know from the image.
            </p>
            <p className="font-bold">What actually works:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Open with a scene, not a spec.</strong> "Morning coffee on this porch hits
                different" does more work than "3BR/2BA with covered porch." Specs belong below the
                fold.
              </li>
              <li>
                <strong>One detail, one emotion.</strong> The fireplace. The city view at dusk. The
                clawfoot tub. Don't list everything — tease the showing.
              </li>
              <li>
                <strong>CTA in the first 2 lines.</strong> Instagram truncates after ~125
                characters. Your hook and next step both need to land before that cut.
              </li>
              <li>
                <strong>3–5 local hashtags.</strong> #AustinRealEstate, #78704Homes, #ATXLiving —
                local specificity outperforms #realestate, which is flooded and searched by no one
                with intent to buy.
              </li>
            </ul>
            <div className="win95-inset bg-input p-3 my-1">
              <p className="text-win95-11 text-muted-foreground mb-1">Generic (scrolled past):</p>
              <p className="text-win95-12 mb-3 italic">
                "Just listed! Beautiful 4BR/3BA in South Austin. 2,100 sqft. Updated kitchen.
                $649,000. DM for info. #realestate #austin"
              </p>
              <p className="text-win95-11 text-muted-foreground mb-1">
                Specific (stops the scroll):
              </p>
              <p className="text-win95-12 italic">
                "That backyard at golden hour. Book your tour before Sunday's open house — link in
                bio. 📍 South Austin | 4BR | $649K"
              </p>
            </div>
          </div>
        ),
      },
      {
        title: "Facebook: More Intent, More Text, Lead With Price",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Facebook real estate audiences skew slightly older and are often actively in a buying
              or relocation process. They read more and filter more systematically.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Lead with price.</strong> Facebook real estate browsers filter on it
                immediately.
              </li>
              <li>
                <strong>Specs in the first paragraph.</strong> Beds, baths, square footage, garage.
                Short sentences. This is the grid they're mentally filling in.
              </li>
              <li>
                <strong>Lifestyle copy after specs.</strong> 2–3 sentences on the neighborhood. What
                do weekends look like here? What's the commute?
              </li>
              <li>
                <strong>Specific CTA.</strong> "DM me to schedule a private tour this weekend"
                outperforms "contact for more info" significantly.
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "What to Avoid on Every Platform",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Fair Housing violations:</strong> The FHA applies to social media posts.
                "Perfect for young professionals" or "great neighborhood for families" can trigger
                complaints on Instagram the same as in MLS copy.
              </li>
              <li>
                <strong>ALL CAPS:</strong> Reads as aggressive or low-quality. Use it for nothing.
              </li>
              <li>
                <strong>Emoji overload:</strong> One or two is fine. Ten is spam. Real buyers don't
                stop for 🏡✨💯🔑🏠 chains.
              </li>
              <li>
                <strong>Soft CTAs:</strong> "Reach out!" drives nothing. "Book your private showing
                before Thursday — this one's going fast" is specific and creates mild urgency.
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "How PLG Generates Social Copy",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Every PLG generation produces a platform-tuned social media post alongside the MLS
              description and email. The social copy is written for Instagram and Facebook format —
              short, scene-first, with a CTA built in. Fair Housing compliant, ready to post. You
              get all three formats in about 15 seconds, for the same address, in one pass.
            </p>
            <p className="font-bold">
              Generate your MLS, social, and email copy all at once at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              .
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "commercial-real-estate-listing-description",
    title: "How to Write a Commercial Real Estate Listing Description",
    description:
      "Commercial buyers and tenants are analytical. Here's how to write CRE listing copy that answers the questions investors and business owners actually care about.",
    date: "2026-07-01",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          Commercial real estate buyers are doing math while they read your listing. What's the cap
          rate? Who are the tenants and when do their leases expire? How much deferred maintenance
          am I inheriting? Is the zoning compatible with my intended use? Your listing needs to
          answer these questions — or sophisticated buyers will move on without asking.
        </p>
      </>
    ),
    sections: [
      {
        title: "Lead With the Investment Thesis, Back It With Data",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Even data-driven buyers respond to a clear positioning statement up front. One
              sentence that frames the opportunity:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                "Value-add retail center anchored by a national tenant with 30% upside on
                below-market leases."
              </li>
              <li>
                "Rare 24-foot clear warehouse with 3-phase power and direct truck court access in a
                submarket with 3% vacancy."
              </li>
              <li>"Class B office building at 92% occupancy — fully stabilized at a 6.8% cap."</li>
            </ul>
            <p>
              This tells the buyer exactly what opportunity they're looking at. Write this first —
              then back it up with data. The data without the thesis is a spec sheet. The thesis
              without data is noise.
            </p>
          </div>
        ),
      },
      {
        title: "What to Include by Property Type",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p className="font-bold">Retail and office space:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Total square footage + breakdown of usable vs. rentable</li>
              <li>Ceiling height and column spacing</li>
              <li>Current use and zoning classification</li>
              <li>Parking ratio and type (surface, garage, reserved)</li>
              <li>Lease type (NNN, gross, modified gross) and remaining term</li>
              <li>Current tenant status: vacant, fully occupied, or anchor + inline breakdown</li>
              <li>Daily traffic count for retail-facing locations</li>
            </ul>

            <p className="font-bold">Industrial and warehouse:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Clear height (often the #1 filter for warehouse tenants)</li>
              <li>Door configuration: dock-high vs. grade-level, number and dimensions</li>
              <li>Power specs: amps, voltage, 3-phase availability</li>
              <li>Lot coverage and outdoor storage/yard area</li>
              <li>Access: truck court depth, rail spur if applicable</li>
              <li>Sprinkler system type (ESFR, K-17, wet pipe)</li>
            </ul>

            <p className="font-bold">Investment and multi-tenant properties:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Number of units, current occupancy rate</li>
              <li>Gross income, net operating income (NOI) if disclosed</li>
              <li>Lease expiration schedule summary (near-term rollover risk)</li>
              <li>Recent capital improvements with dates</li>
              <li>
                Cap rate at list price — buyers will calculate it anyway; showing your work builds
                credibility
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "What CRE Buyers Use to Screen You Out",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Sophisticated buyers use listing quality as a proxy for seller sophistication. Vague
              copy ("great bones, value-add opportunity with upside for the right buyer") reads as:
              the seller doesn't know their numbers, or the numbers don't support the ask. Either
              way, they skip.
            </p>
            <p>
              A data-dense, well-organized listing signals a seller who knows what they own and is
              priced accordingly — which makes buyers more comfortable moving forward without as
              much due diligence friction.
            </p>
          </div>
        ),
      },
      {
        title: "How PLG Handles Commercial Properties",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              PLG's commercial mode generates data-forward listing copy built for LoopNet, CoStar,
              and broker-to-broker email. It pulls zoning context, traffic counts where available,
              and neighborhood business data — and writes in a register appropriate for
              institutional and private investors. The result: a structured, information-dense
              description that reads like it was written by an experienced CRE broker.
            </p>
            <p className="font-bold">
              Try it at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              .
            </p>
          </div>
        ),
      },
    ],
  },
  {
    slug: "real-estate-email-marketing-listings",
    title: "Real Estate Email Templates for Property Listings (Buyers, Sellers, and Investors)",
    description:
      "Email is still the highest-converting channel in real estate. Here are the templates and formulas agents use to get replies and book showings.",
    date: "2026-07-06",
    readTime: "5 min read",
    intro: () => (
      <>
        <p className="text-win95-12 leading-relaxed">
          Social media organic reach for a typical agent's page hovers below 5%. Email open rates
          for real estate average 20–30%. And unlike social algorithms that decide who sees your
          content, email reaches everyone on your list every time you send. It's not a legacy
          channel — it's still your highest-converting one if you write it right.
        </p>
      </>
    ),
    sections: [
      {
        title: "The 4 Listing Email Types That Drive Appointments",
        Body: () => (
          <div className="space-y-4 text-win95-12 leading-relaxed">
            <div>
              <p className="font-bold">1. New listing announcement</p>
              <p className="mt-1">
                Sent to your database the moment a property hits the market. Goal: immediate showing
                requests from warm contacts before the weekend open house crowds the calendar.
              </p>
              <div className="win95-inset bg-input p-3 mt-2 space-y-1">
                <p className="text-win95-11 font-bold text-muted-foreground">TEMPLATE</p>
                <p className="text-win95-12 font-bold">
                  Subject: Just listed: 412 Oak St — [City] | $[Price]
                </p>
                <p className="text-win95-12 mt-2">
                  [First name], wanted to get this in front of you before it goes fully public this
                  weekend.
                </p>
                <p className="text-win95-12 mt-1">
                  [2–3 sentences: lead with the best feature, key specs, the neighborhood or commute
                  angle that matters for this buyer.]
                </p>
                <p className="text-win95-12 mt-1">
                  Showings open [day]. Reply here or call me at [number] to get in before Saturday.
                </p>
              </div>
            </div>

            <div>
              <p className="font-bold">2. Price reduction notice</p>
              <p className="mt-1">
                The best audience for a price reduction is everyone who looked at the listing and
                didn't offer. These are buyers who were close — the reduction is the nudge they
                needed.
              </p>
              <div className="win95-inset bg-input p-3 mt-2 space-y-1">
                <p className="text-win95-11 font-bold text-muted-foreground">TEMPLATE</p>
                <p className="text-win95-12 font-bold">
                  Subject: Price update on 412 Oak — worth another look
                </p>
                <p className="text-win95-12 mt-2">
                  [First name], the seller on 412 Oak has moved the price to $[new price] — down
                  from $[original].
                </p>
                <p className="text-win95-12 mt-1">
                  If this one was close to your range before, now's the time. Same property, better
                  entry point. I can get you in this week.
                </p>
              </div>
            </div>

            <div>
              <p className="font-bold">3. Just-sold proof email</p>
              <p className="mt-1">
                Send after closing to prospects in the same neighborhood or price range.
                Credibility-building with a FOMO hook — shows properties are moving and positions
                you as the agent who knows this market.
              </p>
              <div className="win95-inset bg-input p-3 mt-2 space-y-1">
                <p className="text-win95-11 font-bold text-muted-foreground">TEMPLATE</p>
                <p className="text-win95-12 font-bold">
                  Subject: Sold in [X] days at $[Y] — market update for [neighborhood]
                </p>
                <p className="text-win95-12 mt-2">
                  Just closed on [Address] — [X] days on market, [over/at/below] asking. [One
                  sentence on what drove the result.]
                </p>
                <p className="text-win95-12 mt-1">
                  If you've been thinking about [buying/selling] in [neighborhood], this is worth a
                  conversation. What's your timeline?
                </p>
              </div>
            </div>

            <div>
              <p className="font-bold">4. Investor alert</p>
              <p className="mt-1">
                A separate template for investor contacts, who want numbers — not lifestyle copy.
              </p>
              <div className="win95-inset bg-input p-3 mt-2 space-y-1">
                <p className="text-win95-11 font-bold text-muted-foreground">TEMPLATE</p>
                <p className="text-win95-12 font-bold">
                  Subject: Off-market duplex — [cap rate]% cap, [neighborhood]
                </p>
                <p className="text-win95-12 mt-2">
                  [First name] — [Address] just hit my desk. [Property type, price, current rents,
                  NOI estimate, cap rate.] Pre-inspected and priced to move.
                </p>
                <p className="text-win95-12 mt-1">
                  Happy to send the full package. Want me to loop you in?
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Subject Line Rules That Actually Matter",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Under 50 characters.</strong> That's the mobile preview cutoff. Everything
                after it gets cut off on the lock screen.
              </li>
              <li>
                <strong>Include the address or neighborhood.</strong> Specificity drives opens. "412
                Oak St" outperforms "new listing" for recipients who know the area.
              </li>
              <li>
                <strong>Avoid spam triggers.</strong> All caps, excessive punctuation, "FREE," "Act
                now," multiple exclamation points — all go to promotions or spam.
              </li>
              <li>
                <strong>Test the variant.</strong> "Just listed: 412 Oak" vs. "412 Oak — first look"
                can have 15–20% open rate variance with the same list. Send a small batch first.
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "How PLG Generates Listing Email Copy",
        Body: () => (
          <div className="space-y-3 text-win95-12 leading-relaxed">
            <p>
              Every PLG generation produces a listing-specific email template alongside the MLS
              description and social post — complete with a subject line, body copy, and CTA. No
              brackets to fill in, no templates to adapt. Paste it into your CRM and send. The same
              15-second run that writes your MLS description covers all three formats at once.
            </p>
            <p className="font-bold">
              Generate your listing email at{" "}
              <a href="/" className="underline">
                PropertyListingGenerator.com
              </a>
              .
            </p>
          </div>
        ),
      },
    ],
  },
];
