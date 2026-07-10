import { Link } from "@tanstack/react-router";
import RetroLegend from "@/components/RetroLegend";

interface RetroAnimatedHeaderProps {
  userName?: string | null;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
}

export function RetroAnimatedHeader({
  userName,
  onSignInClick,
  onSignOutClick,
}: RetroAnimatedHeaderProps) {
  return (
    <header className="w-full bg-[color:var(--win95-blue)] text-white px-3 py-1 flex items-center gap-2 border-b-2 border-black">
      <div className="w-4 h-4 win95-raised flex items-center justify-center text-black text-[10px] font-bold">
        P
      </div>
      <span className="text-win95-12 font-bold tracking-wide">PLG</span>
      <span className="text-win95-11 opacity-70 hidden sm:inline">
        PropertyListingGenerator.com
      </span>
      <Link
        to="/pricing"
        className="win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 no-underline cursor-pointer hidden sm:inline-block"
      >
        Pricing
      </Link>
      <Link
        to="/compare"
        className="win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 no-underline cursor-pointer hidden sm:inline-block"
      >
        Compare
      </Link>
      <span className="ml-auto flex items-center gap-2">
        <span className="text-win95-11 opacity-80 hidden md:inline">
          {userName ? `signed in as ${userName}` : "the listing tool for agents"}
        </span>
        {userName ? (
          <button
            onClick={onSignOutClick}
            className="win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 cursor-pointer"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={onSignInClick}
            className="win95-raised bg-[var(--win95-gray)] text-black px-2 py-0.5 text-win95-11 cursor-pointer"
          >
            Sign In
          </button>
        )}
        <RetroLegend />
      </span>
    </header>
  );
}
