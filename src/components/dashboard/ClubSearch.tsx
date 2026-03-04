import { useState } from "react";
import { Search, Loader2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const ClubSearch = ({ onSelect }: { onSelect: (club: any) => void }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (query: string) => {
    // Só começa a buscar quando digitar pelo menos 3 letras
    if (query.length < 3) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      // ESTA É A LINHA QUE ESTAVA FALTANDO NO SEU CÓDIGO:
      const { data, error } = await supabase.functions.invoke('search-clubs', {
        body: { query }
      });

      if (error) throw error;
      
      if (data?.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error("Erro na busca global:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input 
          placeholder="Busque o seu clube..." 
          className="bg-zinc-900/80 border-white/10 pl-11 rounded-full h-12 text-white placeholder:text-white/20 focus:ring-2 focus:ring-red-600 transition-all"
          onChange={(e) => handleSearch(e.target.value)}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin w-4 h-4 text-red-600" />
          </div>
        )}
      </div>

      {/* Lista de resultados que aparece embaixo do campo */}
      {results.length > 0 && (
        <div className="absolute top-14 w-full bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-2xl max-h-[300px] overflow-y-auto">
          <div className="p-2 border-b border-white/5 bg-black/40 flex items-center gap-2">
            <Globe className="w-3 h-3 text-white/40" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Resultados Globais</span>
          </div>
          {results.map((club) => (
            <button
              key={club.id}
              onClick={() => { 
                onSelect(club); 
                setResults([]); 
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
            >
              <img src={club.logo} alt={club.name} className="w-8 h-8 object-contain bg-white/5 rounded-sm p-1" />
              <span className="font-bold text-sm text-white uppercase italic">{club.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};