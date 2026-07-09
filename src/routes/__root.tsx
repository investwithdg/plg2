import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/AppNav";
import { initPostHog, identifyUser, resetUser, track } from "@/lib/posthog";
import { useAuth } from "@/hooks/useAuth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PLG — Property Listing Generator" },
      { name: "description", content: "The fastest way to generate FHA-compliant MLS, social, and email listing copy. Paste an address, get 3 polished listings in 15 seconds. Used by thousands of agents." },
      { name: "author", content: "PLG — PropertyListingGenerator.com" },
      { property: "og:title", content: "PLG — Property Listing Generator" },
      { property: "og:description", content: "The fastest way to generate FHA-compliant MLS, social, and email listing copy. Paste an address, get 3 polished listings in 15 seconds." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PLG" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PLG — Property Listing Generator" },
      { name: "twitter:description", content: "The fastest way to generate FHA-compliant MLS, social, and email listing copy. Used by thousands of agents." },
      { property: "og:image", content: "https://propertylistinggenerator.com/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "PLG — Listing Copy in 15 Seconds" },
      { property: "og:url", content: "https://propertylistinggenerator.com" },
      { name: "twitter:image", content: "https://propertylistinggenerator.com/og-image.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      {
        rel: "canonical",
        href: "https://propertylistinggenerator.com",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "PLG — Property Listing Generator",
          url: "https://propertylistinggenerator.com",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: "Generate FHA-compliant MLS, social, and email listing copy from any address in 15 seconds. The listing tool for real estate agents.",
          offers: [
            {
              "@type": "Offer",
              name: "Free",
              price: "0",
              priceCurrency: "USD",
              description: "10 free generations with 1 Pro-tier property sample; signed-in free accounts reset monthly",
            },
            {
              "@type": "Offer",
              name: "Pro Monthly",
              price: "49",
              priceCurrency: "USD",
              billingDuration: "P1M",
              description: "Unlimited generations, unlimited Pro-tier property types, listing history",
            },
            {
              "@type": "Offer",
              name: "Pro Annual",
              price: "468",
              priceCurrency: "USD",
              billingDuration: "P1Y",
              description: "Unlimited generations, billed annually at $39/mo",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PostHogInit />
      <AppNav />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}

function PostHogInit() {
  const { user, loading: authLoading } = useAuth();
  // undefined = unresolved; null = resolved anonymous; string = resolved user id
  const prevUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    // Wait until the session check resolves before touching identity — otherwise
    // resetUser() fires before getSession() returns, wiping distinct_id for returning users.
    if (authLoading) return;

    const currentId = user?.id ?? null;

    if (prevUserId.current === undefined) {
      // First settled value after session check
      if (currentId) {
        identifyUser(currentId, user?.email ?? undefined);
      }
      // If null here, visitor is genuinely anonymous — no reset needed
    } else if (currentId !== prevUserId.current) {
      if (currentId) {
        identifyUser(currentId, user?.email ?? undefined);
      } else {
        // Explicit logout transition
        resetUser();
      }
    } else if (currentId && user?.email) {
      // Same user id but email may have changed
      identifyUser(currentId, user.email);
    }

    prevUserId.current = currentId;
  }, [authLoading, user?.id, user?.email]);

  const router = useRouter();
  useEffect(() => {
    return router.subscribe("onLoad", ({ toLocation }) => {
      track("$pageview", { path: toLocation.pathname });
    });
  }, [router]);

  return null;
}
