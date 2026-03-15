// Path: src/components/dashboard/ClubSearch.tsx
import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";

export const ClubSearch = ({ onSelect }: { onSelect: (club: ClubSearchResult) => void }) => {
  const [results, setResults] = useState<ClubSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (val.length > 1) {
      setResults(searchClubsLocal(val, 10));
    } else {
      setResults([]);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto" ref={searchRef}>
      <div className="relative z-[1100]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          placeholder="Pesquisar clubes..."
          className="bg-card/90 border-border pl-11 rounded-full h-12 text-foreground focus:ring-2 focus:ring-primary"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <div className="absolute top-14 left-0 right-0 bg-card border border-border rounded-2xl overflow-hidden z-[1200] shadow-[0_20px_50px_hsl(0_0%_0%_/_0.7)] max-h-[400px] overflow-y-auto">
          {results.map((club) => (
            <button
              key={`${club.id}-${club.shortName}`}
              // Usando button + onMouseDown para capturar clique antes do input perder foco
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(club);
                setResults([]);
                setQuery("");
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/60 border-b border-border/40 text-left cursor-pointer group"
            >
              <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center p-1.5 shrink-0">
                <ClubLogo src={club.logo} alt={club.name} size="sm" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-black text-sm text-foreground uppercase italic tracking-wider group-hover:text-primary transition-colors">
                  {club.name}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  {club.location} • 🐾 {club.mascote}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
