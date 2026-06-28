import { useState } from "react";
import { RetroButton, RetroInput } from "@/components/retro";

type AuthMode = "signin" | "signup";

interface AuthModalProps {
  onClose: () => void;
  onAuth: (email: string, password: string, mode: AuthMode) => Promise<string | null>;
}

export default function AuthModal({ onClose, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setSubmitting(true);
    const err = await onAuth(email, password, mode);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else if (mode === "signup") {
      setSuccess(true);
    } else {
      onClose();
    }
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
          {success ? (
            <>
              <div className="win95-inset bg-input p-3">
                <p className="text-win95-12">
                  Check your email for a confirmation link, then sign in.
                </p>
              </div>
              <div className="flex justify-center">
                <RetroButton
                  variant="primary"
                  onClick={() => {
                    setSuccess(false);
                    setMode("signin");
                  }}
                >
                  Sign In
                </RetroButton>
              </div>
            </>
          ) : (
            <>
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
                  }}
                >
                  {mode === "signin"
                    ? "Need an account?"
                    : "Already have an account?"}
                </button>
                <RetroButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={submitting || !email.trim() || !password.trim()}
                >
                  {submitting
                    ? "..."
                    : mode === "signin"
                      ? "Sign In"
                      : "Sign Up"}
                </RetroButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
