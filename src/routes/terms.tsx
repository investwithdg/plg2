import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — PLG" },
      {
        name: "description",
        content:
          "Terms of Service for PropertyListingGenerator.com — AI-powered real estate listing copy generator.",
      },
      { property: "og:title", content: "Terms of Service — PLG" },
      {
        property: "og:description",
        content:
          "Terms of Service for PropertyListingGenerator.com.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen font-system text-foreground">
      <main className="flex flex-col items-center p-4 gap-4">
        <div className="win95-window w-full max-w-3xl">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12">
              Terms of Service — PropertyListingGenerator.com
            </span>
          </div>
          <div className="p-4 bg-card text-win95-12 space-y-4 leading-relaxed">
            <p className="text-win95-11 text-muted-foreground">
              Effective Date: June 29, 2026
            </p>

            <p>
              Welcome to PropertyListingGenerator.com ("PLG," "we," "us," or
              "our"). By accessing or using our website and services, you agree
              to be bound by these Terms of Service ("Terms"). If you do not
              agree, do not use PLG.
            </p>

            <Section title="1. Acceptance of Terms">
              <p>
                By creating an account, accessing, or using PLG, you confirm
                that you are at least 18 years old and agree to these Terms and
                our Privacy Policy. We may update these Terms at any time;
                continued use after changes constitutes acceptance.
              </p>
            </Section>

            <Section title="2. Service Description">
              <p>
                PLG is an AI-powered real estate listing copy generator. You
                provide a property address or listing URL, and PLG researches
                the property and generates FHA-compliant MLS descriptions,
                social media posts, and email copy. All generated content is
                designed to comply with Fair Housing Act guidelines, though you
                should always review output before publishing.
              </p>
            </Section>

            <Section title="3. User Accounts">
              <p>
                Account creation and authentication are handled through
                Supabase. You are responsible for maintaining the
                confidentiality of your credentials. You agree to provide
                accurate information and to notify us immediately of any
                unauthorized access. We reserve the right to suspend or
                terminate accounts that violate these Terms.
              </p>
            </Section>

            <Section title="4. Subscription Plans and Billing">
              <p>
                PLG offers a <strong>Free tier</strong> (10 generations per
                month, limited property types) and a{" "}
                <strong>Pro subscription</strong> (unlimited generations, all 9
                property types, listing history). Pro is available as a monthly
                or annual plan.
              </p>
              <p>
                Payments are processed by <strong>Stripe</strong>. By
                subscribing to Pro, you authorize us to charge your payment
                method on a recurring basis. You may cancel at any time; access
                continues through the end of the current billing period. Refunds
                are handled in accordance with our refund policy. Prices may
                change with 30 days' notice.
              </p>
            </Section>

            <Section title="5. Acceptable Use">
              <p>You agree not to:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>
                  Use PLG for any unlawful purpose or to generate content that
                  violates fair housing laws
                </li>
                <li>
                  Attempt to reverse-engineer, decompile, or extract PLG's
                  underlying models or algorithms
                </li>
                <li>
                  Resell, sublicense, or redistribute PLG's services without
                  written permission
                </li>
                <li>
                  Circumvent usage limits, authentication, or security measures
                </li>
                <li>
                  Submit false, misleading, or fraudulent property information
                </li>
                <li>
                  Use automated scripts or bots to access PLG in a manner that
                  degrades service for others
                </li>
              </ul>
            </Section>

            <Section title="6. Intellectual Property">
              <p>
                <strong>Your content:</strong> You own the listing copy
                generated by PLG using your inputs. You may use, modify, and
                publish the generated content for any lawful purpose.
              </p>
              <p>
                <strong>Our content:</strong> The PLG name, logo, website
                design, underlying software, and all non-user-generated content
                are our intellectual property. You may not copy, modify, or
                distribute our materials without permission.
              </p>
            </Section>

            <Section title="7. Disclaimers">
              <p>
                PLG uses artificial intelligence to generate listing copy. While
                we train our models for FHA compliance and accuracy:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>
                  <strong>AI-generated content should always be reviewed</strong>{" "}
                  by you before publishing. You are responsible for verifying
                  accuracy, compliance, and suitability.
                </li>
                <li>
                  PLG does not provide legal, real estate, or professional
                  advice. Generated content is not a substitute for professional
                  guidance.
                </li>
                <li>
                  Property data is sourced from third-party providers and may
                  not be complete or current.
                </li>
                <li>
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                  WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                  NON-INFRINGEMENT.
                </li>
              </ul>
            </Section>

            <Section title="8. Limitation of Liability">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PLG AND ITS OPERATOR
                SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED
                TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING
                FROM YOUR USE OF THE SERVICE.
              </p>
              <p>
                OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR
                YOUR USE OF PLG SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE
                TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS
                GREATER.
              </p>
            </Section>

            <Section title="9. Termination">
              <p>
                We may suspend or terminate your access to PLG at any time, with
                or without cause, with or without notice. You may terminate your
                account at any time by contacting us. Upon termination, your
                right to use PLG ceases immediately, though provisions that by
                their nature should survive (disclaimers, limitation of
                liability, intellectual property) will remain in effect.
              </p>
            </Section>

            <Section title="10. Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the
                laws of the State of Texas, United States, without regard to
                conflict of law principles. Any disputes arising from these
                Terms shall be resolved in the courts located in Texas.
              </p>
            </Section>

            <Section title="11. Data Processing">
              <p>
                PLG uses the following third-party services to deliver its
                functionality:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>
                  <strong>Supabase</strong> — authentication, database, and
                  edge functions
                </li>
                <li>
                  <strong>Stripe</strong> — payment processing and subscription
                  management
                </li>
                <li>
                  <strong>AI providers</strong> — for generating listing copy
                </li>
              </ul>
              <p>
                By using PLG, you consent to your data being processed by these
                services in accordance with their respective privacy policies
                and our Privacy Policy.
              </p>
            </Section>

            <Section title="12. Changes to These Terms">
              <p>
                We reserve the right to modify these Terms at any time. Material
                changes will be communicated via email or a prominent notice on
                the website. Your continued use of PLG after changes take effect
                constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section title="13. Contact">
              <p>
                If you have questions about these Terms, contact us at:{" "}
                <a
                  href="mailto:support@propertylistinggenerator.com"
                  className="text-[color:var(--win95-blue)] underline"
                >
                  support@propertylistinggenerator.com
                </a>
              </p>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-win95-14 font-bold">{title}</h2>
      {children}
    </div>
  );
}
