/**
 * [CAMINHO]: src/components/dashboard/NewsFeedCards.tsx
 * [MÓDULO]: Feed de notícias — LIMPEZA TOTAL E BLINDAGEM DE LOGOS
 */
import { useEffect, useState } from "react";
import { ExternalLink, Newspaper, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

/** BLOQUEIO RADICAL DE LOGOS DE PORTAIS EXTERNOS */
function isBadImage(url: string | null): boolean {
  if (!url) return true;
  const val = url.toLowerCase();
  const blocked = [
    "logo",
    "favicon",
    "s.glbimg.com",
    "ge.globo",
    "uol.com",
    "lance.com",
    "espn",
    "tntsports",
    "og-image",
    "default",
    "brand",
    "placeholder",
    "thumbnail",
  ];
  return blocked.some((b) => val.includes(b));
}

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

export default function NewsFeedCards({ teamName, primaryColor = "#ff6200", fallbackLogo }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (!cancelled) {
          const rawData = Array.isArray(data) ? data : data?.data || [];
          // Deduplicação básica por título
          const unique = rawData.filter((v: any, i: any, a: any) => a.findIndex((t: any) => t.title === v.title) === i);
          setItems(unique);
        }
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

  // Filtra imagens ruins e separa
  const withImg = items.filter((n) => !isBadImage(n.imageUrl)).slice(0, 4);
  const others = items.filter((n) => isBadImage(n.imageUrl) || !withImg.includes(n)).slice(0, 6);

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2 px-2">
        <Newspaper className="w-4 h-4 text-[#ff6200]" />
        <h2 className="text-[11px] font-black uppercase italic tracking-widest text-white/50">Radar: {teamName}</h2>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          <Skeleton className="h-40 w-full bg-white/5 rounded-[24px]" />
          <Skeleton className="h-20 w-full bg-white/5 rounded-[20px]" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[10px] uppercase font-black text-white/20 text-center py-10">Sem notícias nas últimas 48h</p>
      ) : (
        <div className="space-y-4">
          {/* CARDS PRINCIPAIS (COM FOTO REAL) */}
          <div className="grid grid-cols-1 gap-3">
            {withImg.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 p-3 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-[#ff6200]/40 transition-all"
              >
                <div className="w-24 h-24 rounded-[18px] overflow-hidden shrink-0 bg-zinc-900 border border-white/5">
                  <img
                    src={item.imageUrl!}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="flex flex-col justify-between py-1 flex-1">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-[#ff6200]">{item.source}</span>
                    <h3 className="text-[13px] font-bold text-white/90 leading-tight line-clamp-2 uppercase italic">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-white/20 font-bold">
                    <Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* LISTA SECUNDÁRIA (SEM FOTO OU FOTOS RUINS) */}
          {others.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[9px] font-black uppercase text-white/20 px-2 tracking-[0.2em]">
                Mais Manchetes
              </span>
              {others.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 p-3 rounded-[18px] hover:bg-white/[0.03] group transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black uppercase text-white/30">{item.source}</span>
                    <h4 className="text-[11px] font-bold text-white/60 group-hover:text-white line-clamp-1">
                      {item.title}
                    </h4>
                  </div>
                  <ExternalLink className="w-3 h-3 text-white/10 group-hover:text-[#ff6200]" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
