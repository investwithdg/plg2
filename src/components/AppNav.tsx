import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";
import RetroLegend from "@/components/RetroLegend";

const NAV_LINKS = [
  { to: "/", label: "Home", exact: true },
  { to: "/pricing", label: "Pricing" },
  { to: "/compare", label: "Compare" },
  { to: "/blog", label: "Blog" },
  { to: "/explore", label: "Explore" },
] as const;

export function AppNav() {
  const { user, signIn, signUp, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userEmail = user?.email ?? null;

  // Close mobile menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  const handleAuth = async (
    email: string,
    password: string,
    mode: "signin" | "signup",
  ) => {
    if (mode === "signin") return signIn(email, password);

    const { error, isNewUser } = await signUp(email, password);
    if (isNewUser) {
      supabase.functions
        .invoke("send-welcome-email", { body: { email } })
        .catch(console.error);
    }
    return error;
  };

  return (
    <>
      <header className="w-full bg-[color:var(--win95-blue)] text-white px-3 py-1.5 flex items-center gap-2 border-b-2 border-black relative z-40">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 no-underline text-white shrink-0">
          <div className="w-4 h-4 win95-raised flex items-center justify-center text-black text-[10px] font-bold">
            P
          </div>
          <span className="text-win95-12 font-bold tracking-wide">PLG</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-1 ml-1">
          {NAV_LINKS.filter(l => l.to !== "/").map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 no-underline"
              activeProps={{ className: "win95-pressed bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 no-underline" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="ml-auto" />

        {/* Desktop: user info + auth button */}
        <div className="hidden sm:flex items-center gap-2">
          {userEmail && (
            <span className="text-win95-11 opacity-80 hidden md:inline truncate max-w-[160px]">
              {userEmail}
            </span>
          )}
          {userEmail ? (
            <button
              onClick={handleSignOut}
              className="win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>

        <RetroLegend />

        {/* Mobile: hamburger button */}
        <button
          className="sm:hidden win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 cursor-pointer font-bold"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute top-full left-0 right-0 z-50 px-2 pt-1 pb-2"
          >
            <div className="win95-window">
              <div className="win95-titlebar">
                <span className="font-bold text-win95-12 truncate pl-1">Navigation</span>
                <button
                  className="win95-control-btn"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  ×
                </button>
              </div>
              <div className="py-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block w-full text-left px-4 py-1.5 text-win95-12 text-black no-underline hover:bg-[color:var(--win95-blue)] hover:text-white"
                    activeProps={{ className: "block w-full text-left px-4 py-1.5 text-win95-12 no-underline bg-[color:var(--win95-blue)] text-white" }}
                    activeOptions={"exact" in link && link.exact ? { exact: true } : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t-2 border-[var(--win95-gray-dark)] my-1 mx-2" />
                {userEmail ? (
                  <div className="px-4 space-y-1">
                    <p className="text-win95-11 text-muted-foreground truncate">{userEmail}</p>
                    <button
                      onClick={handleSignOut}
                      className="win95-raised px-3 py-0.5 text-win95-12 cursor-pointer w-full text-left"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="px-4">
                    <button
                      onClick={() => { setMenuOpen(false); setShowAuthModal(true); }}
                      className="win95-raised px-3 py-0.5 text-win95-12 cursor-pointer w-full text-left"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuth={handleAuth}
        />
      )}
    </>
  );
}
