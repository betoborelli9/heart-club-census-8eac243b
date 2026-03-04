import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export const ClubSearch = ({ onSelect }: { onSelect: (club: any) => void }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async (query: string) => {
    if (query.length < 3) return;
    setLoading(true);
    
    // Aqui conectaremos com a API Football no próximo passo
    console.log("Buscando clube:", query);
    setLoading(false);
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <Input 
        placeholder="Buscar clube no mundo todo..." 
        className="bg-white/5 border-white/10 pl-11 rounded-full h-12"
        onChange={(e) => handleSearch(e.target.value)}
      />
      {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 text-red-600" />}
    </div>
  );
};