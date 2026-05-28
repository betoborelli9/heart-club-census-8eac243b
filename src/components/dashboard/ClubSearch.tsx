// Path: src/components/dashboard/ClubSearch.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsWithFallback, ClubSearchResult } from "@/lib/search-clubs";

export const ClubSearch = ({ onSelect }: { onSelect: (club: ClubSearchResult) => void }) => {
  const [results, setResults] = useState<ClubSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Debounced search with fallback
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchClubsWithFallback(val, 10);
      setResults(results);
      setLoading(false);
    }, 300);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto px-1 sm:px-0" ref={searchRef}>
      <div className="relative z-[1100]">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          placeholder="Pesquisar clubes..."
          className="w-full bg-card/90 border-border pl-9 sm:pl-11 pr-10 rounded-full h-12 text-foreground focus:ring-2 focus:ring-primary"
          onChange={(e) => handleSearch(e.target.value)}
        />
        {loading && (
          <Loader2 className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-14 left-1 right-1 sm:left-0 sm:right-0 bg-card border border-border rounded-2xl overflow-hidden z-[1200] shadow-[0_20px_50px_hsl(0_0%_0%_/_0.7)] max-h-[60vh] overflow-y-auto">
          {results.map((club) => (
            <button
              key={`${club.id}-${club.shortName}-${club.source}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(club);
                setResults([]);
                setQuery("");
              }}
              className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-secondary/60 border-b border-border/40 text-left cursor-pointer group"
            >
              <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center p-1.5 shrink-0">
                <ClubLogo src={club.logo} alt={club.name} size="sm" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-black text-xs sm:text-sm text-foreground uppercase italic tracking-wider group-hover:text-primary transition-colors break-words leading-tight">
                  {club.name}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest break-words leading-tight mt-0.5">
                  {club.location}
                  {club.mascote && ` • 🐾 ${club.mascote}`}
                </span>
              </div>
              {club.source === "api" && (
                <Globe className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
