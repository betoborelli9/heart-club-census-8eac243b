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

  const handleSelect = (club: ClubSearchResult) => {
    console.log("CLUBE SELECIONADO:", club.name);
    onSelect(club);
    setResults([]);
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-md mx-auto" ref={searchRef}>
      <div className="relative z-[110]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={query}
          placeholder="Buscar clube do coração..."
          className="bg-zinc-900/80 border-white/10 pl-11 rounded-full h-12 text-white focus:ring-2 focus:ring-red-600 transition-all"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <div className="absolute top-14 left-0 right-0 bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden z-[1000] shadow-[0_20px_50px_rgba(0,0,0,1)] max-h-[400px] overflow-y-auto">
          <div className="p-2 border-b border-white/5 bg-zinc-900/50">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Resultados</span>
          </div>
          {results.map((club) => (
            <button
              key={`${club.api_id}-${club.shortName}`}
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => handleSelect(club)}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 text-left transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <ClubLogo src={club.logo} alt={club.name} size="sm" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-black text-sm text-white uppercase italic tracking-wider group-hover:text-red-500 transition-colors">
                  {club.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                    {club.location}
                  </span>
                  {club.mascote && (
                    <span className="text-[10px] text-red-500/80 italic font-bold">
                      🐾 {club.mascote}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};