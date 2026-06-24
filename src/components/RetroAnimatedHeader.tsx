export function RetroAnimatedHeader() {
  return (
    <header className="w-full bg-[color:var(--win95-blue)] text-white px-3 py-1 flex items-center gap-2 border-b-2 border-black">
      <div className="w-4 h-4 win95-raised flex items-center justify-center text-black text-[10px] font-bold">
        P
      </div>
      <span className="text-win95-12 font-bold">
        PropertyListingGenerator.com
      </span>
      <span className="ml-auto text-win95-11 opacity-80 hidden sm:inline">
        listings for agents who value their time
      </span>
    </header>
  );
}