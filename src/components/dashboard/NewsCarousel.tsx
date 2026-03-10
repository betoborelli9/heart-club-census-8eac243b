// Path: src/components/dashboard/NewsCarousel.tsx
import { useEffect, useState } from "react";
import { Newspaper, Clock, ExternalLink, Loader2 } from "lucide-react";

export default function NewsCarousel({ teamName }: { teamName: string }) {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getNews() {
      if (!teamName) return;
      setLoading(true);
      try {
        // Chamada direta para a nossa API interna que criamos no Passo 194
        const response = await fetch(`/api/noticias?clube=${encodeURIComponent(teamName)}`);
        
        if (!response.ok) {
          throw new Error('Falha na resposta da API');
        }

        const data = await response.json();
        setNoticias(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Erro ao carregar radar de notícias:", e);
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    }
    getNews();
  }, [teamName]);

  if (loading) return (
    <div className="h-60 flex flex-col items-center justify-center bg-zinc-900/10 rounded-3xl border border-white/5">
      <Loader2 className="animate-spin text-red-600 mb-2 w-8 h-8" />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Sincronizando Radar de Notícias...</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {noticias.length > 0 ? (
        noticias.map((item: any, index: number) => (
          <a 
            key={item.guid || index} 
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group block bg-zinc-900/40 border border-white/5 rounded-2xl p-6 hover:bg-zinc-800/50 transition-all hover:border-red-600/40 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                <Newspaper className="w-3.5 h-3.5" /> {item.source || "Notícia"}
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">
                <Clock className="w-3 h-3 inline mr-1" /> {item.pubDate ? new Date(item.pubDate).toLocaleDateString('pt-BR') : ''}
              </span>
            </div>
            <h2 className="text-lg font-black italic uppercase leading-tight text-white group-hover:text-red-500 transition-colors line-clamp-3 mb-4 tracking-tighter">
              {item.title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest opacity-80 group-hover:opacity-100">
              Ler matéria completa <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        ))
      ) : (
        <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl">
          <p className="text-zinc-500 font-black uppercase tracking-widest">Aguardando sinal do radar para {teamName}...</p>
        </div>
      )}
    </div>
  );
}