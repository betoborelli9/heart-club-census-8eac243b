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

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
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
          // FILTRO RIGOROSO: Só o time pesquisado
          const filtered = rawData.filter(item => 
            item.title.toLowerCase().includes(teamName.toLowerCase()) || 
            item.source.toLowerCase().includes(teamName.toLowerCase())
          );
          setNoticias(filtered);
        }
      } catch (e) {
        console.error("Erro radar:", e);
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
        Sincronizando Radar de Notícias...
      </span>
    </div>
  );

  // --- LÓGICA DE SEPARAÇÃO POR IMAGEM ---
  const comFoto = noticias.filter(item => item.imageUrl && item.imageUrl.startsWith('http')).slice(0, 4);
  const semFoto = noticias.filter(item => !item.imageUrl || !item.imageUrl.startsWith('http'));
  
  // Se sobrarem notícias com foto (além das 4 da vitrine), elas vão para a lateral também
  const listaLateral = [...semFoto, ...noticias.filter(item => item.imageUrl).slice(4)];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-primary italic font-bold">
          Radar de Notícias — {teamName}
        </h2>
      </div>

      {noticias.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-3xl">
          <p className="text-muted-foreground uppercase tracking-widest text-sm italic">
            Nenhuma notícia confirmada para {teamName}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* COLUNA DA ESQUERDA: APENAS CARDS COM FOTO */}
          <div className={`lg:col-span-2 grid grid-cols-1 ${comFoto.length > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
            {comFoto.map((item, i) => (
              <a
                key={item.guid || i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block rounded-2xl overflow-hidden border border-border shadow-lg transition-all duration-300 hover:scale-[1.01]"
                style={{ height: comFoto.length === 1 ? "400px" : "260px" }}
              >
                <img src={item.imageUrl!} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <span className="text-[9px] uppercase tracking-widest text-primary font-bold mb-2 italic">
                    {item.source}
                  </span>
                  <h3 className="text-white leading-tight font-bold italic mb-3 line-clamp-3" style={{ fontSize: i === 0 ? '1.1rem' : '0.9rem' }}>
                    {item.title}
                  </h3>
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}</span>
                    <span className="flex items-center gap-1 group-hover:text-primary transition-colors">Ler <ExternalLink className="w-3 h-3" /></span>
                  </div>
                </div>
              </a>
            ))}
            {/* Caso não tenha nenhuma notícia com foto, ele avisa aqui */}
            {comFoto.length === 0 && (
              <div className="col-span-full py-10 text-center glass-card rounded-2xl border border-dashed">
                <p className="text-muted-foreground text-xs italic italic">Galeria visual indisponível no momento.</p>
              </div>
            )}
          </div>

          {/* COLUNA DA DIREITA: LISTA DE LINKS (SEM FOTO) */}
          <div className="lg:col-span-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/20">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold italic">Radar Extra</span>
            </div>
            <div className="overflow-y-auto max-h-[540px]">
              {listaLateral.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground italic">Sem links adicionais.</div>
              ) : (
                listaLateral.map((item, i) => (
                  <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="block px-4 py-4 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors group">
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors italic leading-normal mb-2">
                      {item.title}
                    </h4>
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                      <span className="font-bold text-primary/70">{item.source}</span>
                      <span>{timeAgo(item.pubDate)}</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}