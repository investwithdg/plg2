import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePlanTier } from "@/hooks/usePlanTier";
import { supabase } from "@/integrations/supabase/client";
import { RetroButton, RetroWindow } from "@/components/retro";
import AuthModal from "@/components/AuthModal";

// The OAuth 2.1 "authorization_endpoint" the MCP authorization-server metadata
// (served by the `oauth` edge function) advertises for this connector — an MCP
// client's browser navigates a user here with the standard query params. We
// reuse the site's existing Supabase Auth session/login instead of building a
// parallel login system, then gate on plan (see usePlanTier) before ever
// minting an authorization code, and finally hand off to the `oauth` edge
// function's POST /authorize to do so.
interface AuthorizeSearch {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  resource?: string;
  scope?: string;
}

export const Route = createFileRoute("/oauth/authorize")({
  validateSearch: (search: Record<string, unknown>): AuthorizeSearch => ({
    response_type: typeof search.response_type === "string" ? search.response_type : undefined,
    client_id: typeof search.client_id === "string" ? search.client_id : undefined,
    redirect_uri: typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
    code_challenge: typeof search.code_challenge === "string" ? search.code_challenge : undefined,
    code_challenge_method:
      typeof search.code_challenge_method === "string" ? search.code_challenge_method : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    resource: typeof search.resource === "string" ? search.resource : undefined,
    scope: typeof search.scope === "string" ? search.scope : undefined,
  }),
  head: () => ({
    meta: [{ title: "Connect an App — PLG" }, { name: "robots", content: "noindex" }],
  }),
  component: OAuthAuthorizePage,
});

interface ClientInfo {
  clientName: string | null;
  clientUri: string | null;
}

function OAuthAuthorizePage() {
  const search = Route.useSearch();
  const { user, session, loading: authLoading, signIn, signUp } = useAuth();
  const { plan, loading: planLoading } = usePlanTier(user);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [clientInfoLoading, setClientInfoLoading] = useState(true);
  const [clientNotFound, setClientNotFound] = useState(false);

  const missingParams = !search.client_id || !search.redirect_uri || !search.code_challenge;

  // Dynamic client registration (oauth/register) is unauthenticated, so anyone can register a
  // client and send a signed-in user an /authorize link. Fetch the requesting client's display
  // identity BEFORE showing the consent screen, so "Approve" always names the app being
  // authorized instead of a generic "an app wants access" prompt a phishing page could hide
  // behind. This lookup is itself public (no auth) — the client_id in the URL isn't a secret,
  // same as how Google/GitHub show an app's name on their consent screens to anyone with a
  // valid client_id.
  useEffect(() => {
    if (missingParams || !search.client_id) return;
    let cancelled = false;
    setClientInfoLoading(true);
    supabase.functions
      .invoke("oauth/client-info", { body: { client_id: search.client_id } })
      .then(({ data, error: invokeError }) => {
        if (cancelled) return;
        if (invokeError || !data || data.error) {
          setClientNotFound(true);
        } else {
          setClientInfo({
            clientName: data.client_name ?? null,
            clientUri: data.client_uri ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setClientNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setClientInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [missingParams, search.client_id]);

  const handleAuth = async (email: string, password: string, mode: "signin" | "signup") => {
    const err =
      mode === "signin" ? await signIn(email, password) : (await signUp(email, password)).error;
    return err;
  };

  const handleApprove = async () => {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("oauth/authorize", {
        body: {
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          code_challenge: search.code_challenge,
          code_challenge_method: search.code_challenge_method ?? "S256",
          state: search.state,
          resource: search.resource,
          scope: search.scope,
        },
      });
      if (invokeError) throw invokeError;
      if (data?.upgradeRequired) {
        setUpgradeRequired(true);
        setSubmitting(false);
        return;
      }
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      throw new Error(data?.error_description ?? "Could not complete authorization.");
    } catch (err) {
      console.error("OAuth authorize error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      sonnerToast.error("Could not connect the app");
      setSubmitting(false);
    }
  };

  const handleDeny = () => {
    // Deliberately does NOT redirect back to redirect_uri — until the backend
    // has validated client_id/redirect_uri (which only happens once Approve is
    // clicked), bouncing the browser to an as-yet-unvalidated redirect_uri from
    // the query string would be an open-redirect risk. A cancelled connection
    // just lands the user back on their own account, which is a safe default.
    window.location.href = "/hub";
  };

  if (missingParams) {
    return (
      <CenteredWindow title="Invalid Connection Request">
        <p className="text-win95-11 text-slate-700">
          This link is missing required parameters and can&apos;t be used to connect an app. Ask the
          app you&apos;re connecting from to try again.
        </p>
      </CenteredWindow>
    );
  }

  if (clientNotFound) {
    return (
      <CenteredWindow title="Unknown App">
        <p className="text-win95-11 text-slate-700">
          This connection request isn&apos;t coming from a recognized app and can&apos;t be
          approved. If you followed a link to get here, don&apos;t approve it — ask whoever sent it
          to you to verify the request.
        </p>
      </CenteredWindow>
    );
  }

  if (authLoading) {
    return (
      <CenteredWindow title="Connect an App">
        <p className="text-win95-11 text-muted-foreground">Loading...</p>
      </CenteredWindow>
    );
  }

  if (!user) {
    return (
      <>
        <CenteredWindow title="Connect an App">
          <p className="text-win95-11 text-slate-700 mb-3">
            Sign in to your PLG account to connect this app to your listings.
          </p>
          <RetroButton variant="primary" onClick={() => setShowAuthModal(true)}>
            Sign In
          </RetroButton>
        </CenteredWindow>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onAuth={handleAuth} />}
      </>
    );
  }

  if (planLoading) {
    return (
      <CenteredWindow title="Connect an App">
        <p className="text-win95-11 text-muted-foreground">Checking your plan...</p>
      </CenteredWindow>
    );
  }

  const isProUser = plan === "pro" || plan === "elite";

  if (!isProUser || upgradeRequired) {
    return (
      <CenteredWindow title="Upgrade Required">
        <div className="space-y-3">
          <p className="text-win95-12 font-bold text-slate-900">
            MCP access requires a Pro or Elite plan — upgrade to continue.
          </p>
          <p className="text-win95-11 text-slate-700">
            Connecting PLG to AI agents (Claude and other MCP clients) so they can generate and
            check listing copy directly is a Pro/Elite feature. Your account (
            <span className="font-bold">{user.email}</span>) is currently on the Free plan.
          </p>
          <Link to="/pricing">
            <RetroButton variant="primary">Upgrade to Pro</RetroButton>
          </Link>
        </div>
      </CenteredWindow>
    );
  }

  if (clientInfoLoading) {
    return (
      <CenteredWindow title="Connect an App">
        <p className="text-win95-11 text-muted-foreground">
          Verifying the app requesting access...
        </p>
      </CenteredWindow>
    );
  }

  const requesterLabel = clientInfo?.clientName?.trim() || "An unverified app";

  return (
    <CenteredWindow title="Connect an App">
      <div className="space-y-3">
        <p className="text-win95-12 text-slate-900">
          <span className="font-bold">{requesterLabel}</span> is requesting access to generate and
          check listing copy on behalf of your PLG account (
          <span className="font-bold">{user.email}</span>).
        </p>
        {clientInfo?.clientUri && (
          <p className="text-win95-11 text-slate-600">
            App website:{" "}
            <a
              href={clientInfo.clientUri}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {clientInfo.clientUri}
            </a>
          </p>
        )}
        {!clientInfo?.clientName && (
          <p className="text-win95-11 font-bold text-red-800">
            This app didn&apos;t provide a name when it registered. Only approve this if you
            recognize and trust exactly what sent you here.
          </p>
        )}
        <p className="text-win95-11 text-slate-700">
          It will be able to generate listings and run compliance checks using your Pro/Elite
          access. Only approve apps you recognize — this connection stays active until it expires or
          your plan changes.
        </p>
        {error && <p className="text-win95-11 text-[color:var(--destructive)]">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <RetroButton onClick={handleDeny} disabled={submitting}>
            Deny
          </RetroButton>
          <RetroButton variant="primary" onClick={handleApprove} disabled={submitting}>
            {submitting ? "Connecting..." : "Approve"}
          </RetroButton>
        </div>
      </div>
    </CenteredWindow>
  );
}

function CenteredWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 flex items-center justify-center">
      <RetroWindow title={title} showControls={false} className="w-full max-w-md">
        <div className="win95-inset bg-[var(--win95-gray)] text-black p-4">{children}</div>
      </RetroWindow>
    </div>
  );
}
