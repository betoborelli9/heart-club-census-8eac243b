/* src/components/dashboard/ClubSearch.tsx
   Busca 100% local usando clubs-data.ts */
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";

export const ClubSearch = ({ onSelect }: { onSelect: (club: ClubSearchResult) => void }) => {
  const [results, setResults] = useState<ClubSearchResult[]>([]);

  const handleSearch = (query: string) => {
    setResults(searchClubsLocal(query, 10));
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clube..."
          className="bg-secondary/30 border-border/20 pl-11 rounded-full h-12 text-foreground focus:ring-2 focus:ring-primary"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <div className="absolute top-14 w-full bg-card border border-border/20 rounded-2xl overflow-hidden z-[100] shadow-2xl max-h-[300px] overflow-y-auto">
          {results.map((club) => (
            <button
              key={`${club.api_id}-${club.shortName}`}
              onClick={() => { onSelect(club); setResults([]); }}
              className="w-full flex items-center gap-4 p-4 hover:bg-primary/10 border-b border-border/10 text-left transition-colors"
            >
              <img
                src={club.logo}
                alt={club.name}
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-foreground uppercase italic tracking-wider">
                  {club.name}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {club.location}
                </span>
                <span className="text-[10px] text-primary/70 italic font-medium">
                  🐾 {club.mascote}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
