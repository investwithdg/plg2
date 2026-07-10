import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PLG" },
      {
        name: "description",
        content:
          "Privacy Policy for PropertyListingGenerator.com — how we collect, use, and protect your data.",
      },
      { property: "og:title", content: "Privacy Policy — PLG" },
      {
        property: "og:description",
        content:
          "Privacy Policy for PropertyListingGenerator.com.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen font-system text-foreground">
      <main className="flex flex-col items-center p-4 gap-4">
        <div className="win95-window w-full max-w-3xl">
          <div className="win95-titlebar">
            <span className="font-bold text-win95-12">
              Privacy Policy — PropertyListingGenerator.com
            </span>
            <div className="flex gap-[2px]">
              <Link to="/" className="win95-control-btn no-underline" aria-label="Close">
                x
              </Link>
            </div>
          </div>
          <div className="p-4 bg-card text-win95-12 space-y-4 leading-relaxed">
            <p className="text-win95-11 text-muted-foreground">
              Effective Date: June 29, 2026
            </p>

            <p>
              This Privacy Policy describes how PropertyListingGenerator.com
              ("PLG," "we," "us," or "our") collects, uses, and shares your
              information when you use our website and services. By using PLG,
              you agree to the practices described in this policy.
            </p>

            <Section title="1. Information We Collect">
              <p>
                <strong>Account information:</strong> When you create an
                account, we collect your email address and authentication
                credentials (managed by Supabase).
              </p>
              <p>
                <strong>Property data:</strong> Property addresses, listing
                URLs, and property type selections you submit for copy
                generation.
              </p>
              <p>
                <strong>Generated content:</strong> The listing copy generated
                by PLG from your inputs, stored in your listing history.
              </p>
              <p>
                <strong>Usage data:</strong> Pages visited, features used,
                generation counts, browser type, device information, IP address,
                and referring URLs.
              </p>
              <p>
                <strong>Payment information:</strong> Billing details are
                collected and processed directly by Stripe. We do not store your
                full credit card number.
              </p>
            </Section>

            <Section title="2. How We Use Your Information">
              <ul className="list-disc ml-6 space-y-1">
                <li>
                  <strong>Provide the service:</strong> Research properties,
                  generate listing copy, and maintain your listing history.
                </li>
                <li>
                  <strong>Process payments:</strong> Manage subscriptions and
                  billing through Stripe.
                </li>
                <li>
                  <strong>Improve the product:</strong> Analyze usage patterns
                  to improve copy quality, performance, and user experience.
                </li>
                <li>
                  <strong>Communicate:</strong> Send service-related emails
                  including account notifications and billing receipts.
                </li>
                <li>
                  <strong>Ensure compliance:</strong> Monitor for acceptable use
                  and enforce our Terms of Service.
                </li>
              </ul>
            </Section>

            <Section title="3. Third-Party Services">
              <p>
                We use the following third-party services to operate PLG. Each
                processes data in accordance with their own privacy policies:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>
                  <strong>Supabase</strong> — Authentication, database storage,
                  and edge functions. Stores your account data, property
                  submissions, and generated content.
                </li>
                <li>
                  <strong>Stripe</strong> — Payment processing and subscription
                  management. Handles all billing and payment card data.
                </li>
                <li>
                  <strong>Data Providers / OpenAI</strong> — AI services used to
                  research properties and generate listing copy. Property
                  addresses and related data are sent to these services for
                  processing.
                </li>
                <li>
                  <strong>PostHog</strong> — Product analytics. Collects
                  anonymized usage data to help us understand how PLG is used
                  and improve the product.
                </li>
              </ul>
            </Section>

            <Section title="4. Cookies and Tracking">
              <p>
                PLG uses cookies and similar technologies for authentication
                (session tokens), analytics (PostHog), and remembering your
                preferences (e.g., generation count). You can configure your
                browser to reject cookies, though some features may not function
                properly.
              </p>
            </Section>

            <Section title="5. Data Retention">
              <p>
                We retain your account data and generated content for as long as
                your account is active. Usage and analytics data is retained in
                aggregated form. If you delete your account, we will remove your
                personal data within 30 days, except where retention is required
                by law or for legitimate business purposes (e.g., billing
                records).
              </p>
            </Section>

            <Section title="6. Your Rights">
              <p>
                Depending on your jurisdiction, you may have the following
                rights regarding your personal data:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>
                  <strong>Access:</strong> Request a copy of the personal data
                  we hold about you.
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your account
                  and associated data.
                </li>
                <li>
                  <strong>Export:</strong> Request a machine-readable export of
                  your data.
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate
                  personal data.
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain processing of
                  your data.
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a
                  href="mailto:privacy@propertylistinggenerator.com"
                  className="text-[color:var(--win95-blue)] underline"
                >
                  privacy@propertylistinggenerator.com
                </a>
                . We will respond within 30 days.
              </p>
            </Section>

            <Section title="7. CCPA (California Residents)">
              <p>
                If you are a California resident, you have the right to know
                what personal information we collect, request its deletion, and
                opt out of any sale of personal information. We do not sell
                personal information. To make a request, contact us at{" "}
                <a
                  href="mailto:privacy@propertylistinggenerator.com"
                  className="text-[color:var(--win95-blue)] underline"
                >
                  privacy@propertylistinggenerator.com
                </a>
                .
              </p>
            </Section>

            <Section title="8. GDPR (European Economic Area Residents)">
              <p>
                If you are in the EEA, our legal bases for processing your data
                include: performance of a contract (providing the service),
                legitimate interests (improving the product, ensuring security),
                and consent (where applicable). You have the right to access,
                rectify, erase, restrict processing, data portability, and
                object to processing. You may also lodge a complaint with your
                local data protection authority.
              </p>
            </Section>

            <Section title="9. Data Security">
              <p>
                We implement reasonable technical and organizational measures to
                protect your data, including encryption in transit (TLS),
                secure authentication through Supabase, and PCI-compliant
                payment processing through Stripe. However, no method of
                transmission or storage is 100% secure.
              </p>
            </Section>

            <Section title="10. Children's Privacy">
              <p>
                PLG is not intended for use by children under the age of 13. We
                do not knowingly collect personal information from children
                under 13. If we learn that we have collected data from a child
                under 13, we will delete it promptly. If you believe a child
                under 13 has provided us with personal information, please
                contact us.
              </p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Material
                changes will be communicated via email or a prominent notice on
                the website. The "Effective Date" at the top reflects the most
                recent revision.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                For privacy-related questions or requests, contact us at:{" "}
                <a
                  href="mailto:privacy@propertylistinggenerator.com"
                  className="text-[color:var(--win95-blue)] underline"
                >
                  privacy@propertylistinggenerator.com
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
