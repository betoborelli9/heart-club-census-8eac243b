import { useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from "lodash";

export const ClubSearch = ({ onSelect }: { onSelect: (club: any) => void }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Otimização Sênior: Debounce de 500ms para poupar créditos da API
  // A busca só dispara se houver 3 ou mais caracteres
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-clubs', {
          body: { query }
        });

        if (error) {
          console.error("Edge function error:", error);
          setResults([]);
          return;
        }
        
        if (Array.isArray(data)) {
          setResults(data);
        } else {
          console.warn("Unexpected response format:", data);
          setResults([]);
        }
      } catch (err) {
        console.error("Erro na busca:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input 
          placeholder="Busque o seu clube..." 
          className="bg-zinc-900/80 border-white/10 pl-11 rounded-full h-12 text-white focus:ring-2 focus:ring-red-600"
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin w-4 h-4 text-red-600" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-14 w-full bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-2xl max-h-[300px] overflow-y-auto">
          {results.map((club) => (
            <button
              key={club.id}
              onClick={() => { onSelect(club); setResults([]); }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 text-left"
            >
              <img src={club.logo} alt={club.name} className="w-8 h-8 object-contain" />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white uppercase italic">{club.name}</span>
                {club.country && <span className="text-[10px] text-white/40">{club.country}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};