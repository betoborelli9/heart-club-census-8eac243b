import { useEffect, useState } from "react";
import { Newspaper, Clock, ExternalLink, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  guid: string;
}

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #2d2d2d 100%)",
  "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
];

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NewsCarousel({ teamName }: { teamName: string }) {
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function getNews() {
      if (!teamName) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("club-news", {
          body: { clubName: teamName },
        });
        if (error) throw error;
        if (!cancelled) {
          const rawData = Array.isArray(data) ? data : [];
          
          // FILTRO: Só notícias que citam o time (para tirar Palmeiras/outros)
          const filtered = rawData.filter(item => 
            item.title.toLowerCase().includes(teamName.toLowerCase()) || 
            item.source.toLowerCase().includes(teamName.toLowerCase())
          );

          // ORDENAÇÃO: Coloca quem TEM imagem primeiro
          const sorted = filtered.sort((a, b) => {
            if (a.imageUrl && !b.imageUrl) return -1;
            if (!a.imageUrl && b.imageUrl) return 1;
            return 0;
          });

          setNoticias(sorted);
        }
      } catch (e) {
        if (!cancelled) setNoticias([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    getNews();
    return () => { cancelled = true; };
  }, [teamName]);

  if (loading) return (
    <div className="h-72 flex flex-col items-center justify-center rounded-3xl border border-border bg-card">
      <Loader2 className="animate-spin text-primary mb-3 w-8 h-8" />
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground italic font-bold">
        Sincronizando Radar...
      </span>
    </div>
  );

  // Pega as 4 primeiras para os cards
  const headlines = noticias.slice(0, 4);
  const sidebar = noticias.slice(4);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-primary italic font-bold font-display">
          Radar de Notícias — {teamName}
        </h2>
      </div>

      {noticias.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-3xl">
          <p className="text-muted-foreground uppercase tracking-widest text-sm italic">Nenhuma notícia para {teamName}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className={`lg:col-span-2 grid grid-cols-1 ${headlines.length > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
            {headlines.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block rounded-2xl overflow-hidden border border-border shadow-lg transition-all duration-300 hover:scale-[1.01]"
                style={{ height: "260px" }}
              >
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <div 
                  className="absolute inset-0" 
                  style={{ 
                    background: item.imageUrl 
                      ? "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" 
                      : FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length] 
                  }} 
                />
                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <span className="text-[9px] uppercase tracking-widest text-primary font-bold mb-2 italic">{item.source}</span>
                  <h3 className="text-white font-bold italic mb-3 line-clamp-3 leading-tight" style={{ fontSize: '1rem' }}>{item.title}</h3>
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}</span>
                    <span className="flex items-center gap-1 group-hover:text-primary transition-colors">Ler <ExternalLink className="w-3 h-3" /></span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="lg:col-span-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/20">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold italic">Mais Notícias</span>
            </div>
            <div className="overflow-y-auto max-h-[500px]">
              {sidebar.map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="block px-4 py-4 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors group">
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors italic leading-normal mb-2 line-clamp-2">{item.title}</h4>
                  <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                    <span className="font-bold text-primary/70">{item.source}</span>
                    <span>{timeAgo(item.pubDate)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}