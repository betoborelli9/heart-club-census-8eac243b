/**
 * [CAMINHO]: src/components/dashboard/NewsFeedCards.tsx
 * [MÓDULO]: Feed de notícias visuais (com imagem, fonte, drawer interno)
 */
import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
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

  // Separa itens com imagem (cards) dos sem imagem (lista limpa)
  const withImg = items.filter((n) => !!n.imageUrl);
  const noImg = items.filter((n) => !n.imageUrl);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Newspaper className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tight">Notícias</h2>
        {teamName && <span className="text-[10px] font-mono text-white/30 ml-auto">{teamName.toUpperCase()}</span>}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[260px] w-full bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm italic text-white/40 py-6">
          {teamName ? "Nenhuma notícia recente nas últimas 48h." : "Selecione um clube para ver as notícias."}
        </p>
      ) : (
        <div className="space-y-4">
          {/* CARDS COM IMAGEM */}
          {withImg.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {withImg.slice(0, 6).map((item, i) => (
                <article
                  key={`${item.guid}-${i}`}
                  className="group relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all duration-300 flex flex-col"
                >
                  <div
                    className="h-[160px] overflow-hidden relative"
                    style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #000 100%)" }}
                  >
                    <img
                      src={item.imageUrl!}
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
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black uppercase italic tracking-wider px-3 py-1.5 rounded-full hover:scale-105 transition-transform inline-flex items-center gap-1"
                        style={{ background: primaryColor, color: "#000" }}
                      >
                        Saiba Mais <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* LISTA LIMPA — SEM IMAGEM */}
          {noImg.length > 0 && (
            <ul className="divide-y divide-white/5 border border-white/5 rounded-xl bg-white/[0.02]">
              {noImg.slice(0, 8).map((item, i) => (
                <li key={`np-${item.guid}-${i}`} className="p-4 hover:bg-white/[0.04] transition">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1.5 group"
                  >
                    <span
                      className="text-[9px] font-black uppercase italic tracking-widest"
                      style={{ color: primaryColor }}
                    >
                      {item.source}
                    </span>
                    <h3 className="text-sm font-black italic uppercase leading-snug text-white group-hover:text-[#ff6200] transition-colors line-clamp-3">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] font-mono text-white/40">{timeAgo(item.pubDate)}</span>
                      <span className="text-[10px] font-bold uppercase italic text-white/40 group-hover:text-[#ff6200] inline-flex items-center gap-1">
                        Abrir <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
