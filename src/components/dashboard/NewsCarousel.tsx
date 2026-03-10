// Path: src/components/dashboard/NewsCarousel.tsx
import { useEffect, useState } from "react";
import { Newspaper, Clock, ExternalLink, Loader2 } from "lucide-react";

export default function NewsCarousel({ teamName }: { teamName: string }) {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getNews() {
      setLoading(true);
      try {
        const query = encodeURIComponent(`${teamName} futebol`);
        // Usando RSS do Google News convertido para JSON
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss/search?q=${query}+when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419`);
        const data = await res.json();
        setNoticias(data.items || []);
      } catch (e) {
        console.error("Erro ao buscar notícias", e);
      } finally {
        setLoading(false);
      }
    }
    getNews();
  }, [teamName]);

  if (loading) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {noticias.slice(0, 6).map((item: any) => (
        <a 
          key={item.guid} 
          href={item.link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="group block bg-zinc-900/40 border border-white/5 rounded-2xl p-6 hover:bg-zinc-800/50 transition-all hover:border-red-600/30 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
              <Newspaper className="w-3 h-3" /> {item.author || "Notícia"}
            </span>
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(item.pubDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <h2 className="text-lg font-black italic uppercase leading-tight text-white group-hover:text-red-500 transition-colors line-clamp-3 mb-4 tracking-tighter">
            {item.title}
          </h2>
          <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
            Ler no portal original <ExternalLink className="w-3 h-3" />
          </div>
        </a>
      ))}
    </div>
  );
}