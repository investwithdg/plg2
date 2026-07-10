import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RetroButton, RetroInput } from "@/components/retro";
import TurnstileWidget from "@/components/TurnstileWidget";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;

type AuthMode = "signin" | "signup";

interface AuthModalProps {
  onClose: () => void;
  onAuth: (
    email: string,
    password: string,
    mode: AuthMode,
  ) => Promise<string | null>;
}

export default function AuthModal({ onClose, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const requiresTurnstile = mode === "signup" && !!TURNSTILE_SITE_KEY;
  const canSubmit =
    !!email.trim() &&
    !!password.trim() &&
    consentChecked &&
    (!requiresTurnstile || !!turnstileToken);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);

    if (requiresTurnstile && turnstileToken) {
      try {
        const { data } = await supabase.functions.invoke("verify-turnstile", {
          body: { token: turnstileToken },
        });
        if (!data?.success) {
          setError("Security check failed. Please try again.");
          setTurnstileToken(null);
          setSubmitting(false);
          return;
        }
      } catch {
        setError("Security check unavailable. Please try again.");
        setTurnstileToken(null);
        setSubmitting(false);
        return;
      }
    }

    const err = await onAuth(email, password, mode);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      onClose();
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="win95-window w-full max-w-sm">
        <div className="win95-titlebar">
          <span className="font-bold text-win95-12">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </span>
          <button className="win95-control-btn" onClick={onClose}>
            x
          </button>
        </div>
        <div className="p-4 bg-card space-y-3">
          <RetroButton onClick={handleGoogleSignIn} disabled={submitting || !consentChecked}>
            Continue with Google
          </RetroButton>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--win95-gray-dark)]" />
            <span className="text-win95-11 text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-[var(--win95-gray-dark)]" />
          </div>
          <div className="space-y-2">
            <label className="text-win95-11 block">Email:</label>
            <RetroInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@example.com"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-win95-11 block">Password:</label>
            <RetroInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 6 characters"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {requiresTurnstile && (
            <div className="flex justify-center">
              <TurnstileWidget
                siteKey={TURNSTILE_SITE_KEY!}
                onVerify={handleTurnstileVerify}
                onExpire={handleTurnstileExpire}
              />
            </div>
          )}

          <div className="flex items-start gap-2 pt-1 pb-1">
            <input
              type="checkbox"
              id="consent-checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="consent-checkbox" className="text-[10px] leading-tight text-muted-foreground cursor-pointer select-none">
              I agree to the Terms of Service & Privacy Policy, and consent to my listing data being used to improve the PLG AI model.
            </label>
          </div>

          {error && (
            <p className="text-win95-11 text-[color:var(--destructive)]">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-between items-center">
            <button
              className="text-win95-11 underline cursor-pointer bg-transparent border-none text-muted-foreground"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setTurnstileToken(null);
              }}
            >
              {mode === "signin" ? "Need an account?" : "Already have an account?"}
            </button>
            <RetroButton
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
            >
              {submitting ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
            </RetroButton>
          </div>
        </div>
      </div>
    </div>
  );
}
