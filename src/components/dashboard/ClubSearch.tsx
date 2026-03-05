/* Caminho: src/components/dashboard/ClubSearch.tsx
   Objetivo: Busca inteligente Local (Supabase) - SEM ACENTOS e DADOS COMPLETOS
*/
import { useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from "lodash";

export const ClubSearch = ({ onSelect }: { onSelect: (club: any) => void }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // CORREÇÃO SÊNIOR: Chamando a função v2 que criamos no SQL para ignorar acentos
        const { data, error } = await supabase
          .rpc('buscar_clube_v2', { termo_busca: query });

        if (error) {
          console.error("Erro ao buscar no banco local:", error);
          setResults([]);
          return;
        }
        
        if (Array.isArray(data)) {
          // Mapeia os campos do banco para o padrão visual do Heart Club
          const mappedData = data.map(club => ({
            id: club.api_id,
            name: club.nome,
            logo: club.escudo_url,
            // Prioriza a cidade/estado completa que inserimos
            location: club.cidade || 'Brasil' 
          }));
          setResults(mappedData);
        }
      } catch (err) {
        console.error("Erro crítico na busca:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input 
          placeholder="Busque o seu clube..." 
          className="bg-zinc-900/80 border-white/10 pl-11 rounded-full h-12 text-white focus:ring-2 focus:ring-orange-600"
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin w-4 h-4 text-orange-600" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-14 w-full bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-2xl max-h-[300px] overflow-y-auto">
          {results.map((club) => (
            <button
              key={club.id}
              onClick={() => { onSelect(club); setResults([]); }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 text-left transition-colors"
            >
              <img 
                src={club.logo || '/placeholder-shield.png'} 
                alt={club.name} 
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-shield.png' }}
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white uppercase italic tracking-wider">
                  {club.name}
                </span>
                <span className="text-[10px] text-white/40 uppercase font-medium">
                  {club.location}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};