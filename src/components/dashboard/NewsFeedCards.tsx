/**
 * [CAMINHO]: src/components/dashboard/NewsFeedCards.tsx
 * [MÓDULO]: Feed de notícias visuais (com imagem, fonte, drawer interno)
 */
import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  guid: string;
}

interface Props {
  teamName: string | null;
  primaryColor?: string;
  fallbackLogo?: string;
}

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
};

export default function NewsFeedCards({ teamName, primaryColor = "#ff6200", fallbackLogo }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<NewsItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!teamName) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("club-news", { body: { clubName: teamName } });
        if (!cancelled) setItems(Array.isArray(data) ? data : data?.data || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Newspaper className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tight">Notícias</h2>
        {teamName && <span className="text-[10px] font-mono text-white/30 ml-auto">{teamName.toUpperCase()}</span>}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full bg-white/5 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm italic text-white/40 py-6">
          {teamName ? "Nenhuma notícia recente nas últimas 48h." : "Selecione um clube para ver as notícias."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.slice(0, 6).map((item, i) => (
            <article
              key={`${item.guid}-${i}`}
              className="group relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all duration-300 flex flex-col"
            >
              <div
                className="h-[160px] overflow-hidden relative"
                style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #000 100%)" }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      const parent = e.currentTarget.parentElement as HTMLElement;
                      e.currentTarget.style.display = "none";
                      if (fallbackLogo) {
                        parent.innerHTML += `<div class="absolute inset-0 flex items-center justify-center"><img src="${fallbackLogo}" class="w-1/2 h-1/2 object-contain opacity-20"/></div>`;
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src="/logos/heart-club-mark.png"
                      alt=""
                      className="w-1/3 h-1/3 object-contain opacity-20"
                      onError={(e) => {
                        if (fallbackLogo) (e.currentTarget as HTMLImageElement).src = fallbackLogo;
                        else (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span
                    className="text-[9px] font-black uppercase italic tracking-widest px-2 py-1 rounded-full bg-black/70 backdrop-blur"
                    style={{ color: primaryColor }}
                  >
                    {item.source}
                  </span>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-sm font-black italic uppercase leading-snug text-white line-clamp-3 flex-1">
                  {item.title}
                </h3>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-white/40">{timeAgo(item.pubDate)}</span>
                  <button
                    onClick={() => setActive(item)}
                    className="text-[10px] font-black uppercase italic tracking-wider px-3 py-1.5 rounded-full hover:scale-105 transition-transform"
                    style={{ background: primaryColor, color: "#000" }}
                  >
                    Saiba Mais
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DrawerContent className="bg-black border-white/10 max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-white font-black italic uppercase text-base">{active?.title}</DrawerTitle>
            <DrawerDescription className="text-white/50 text-xs">
              {active?.source} • {active && timeAgo(active.pubDate)}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 flex-1 overflow-hidden flex flex-col gap-4">
            {active?.imageUrl && (
              <img src={active.imageUrl} alt="" className="w-full max-h-64 object-cover rounded-xl" />
            )}
            <p className="text-sm text-white/70 italic">
              Por questões de licenciamento, abrimos o conteúdo completo direto na fonte original.
            </p>
            <Button
              asChild
              className="w-full font-black italic uppercase"
              style={{ background: primaryColor, color: "#000" }}
            >
              <a href={active?.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir matéria original
              </a>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
