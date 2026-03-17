/**
 * ARQUIVO: src/components/dashboard/NewsCarousel.tsx
 * LÓGICA: Cards principais com imagens da notícia ou emblema do clube.
 * Barra lateral elegante com mais notícias sem repetição.
 */

//////////////////////////////
// MÓDULO 1 — Imports e Setup
//////////////////////////////
import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Zap, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  guid: string;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`;
};

// BLOQUEADOR DE LOGOS LIXO
function isBadImage(url: string | null): boolean {
  if (!url) return true;
  const val = normalize(url);
  return (
    val.includes("logo") ||
    val.includes("favicon") ||
    val.includes("s.glbimg.com") ||
    val.includes("placeholder")
  );
}

// Função para detectar notícias duplicadas (mesmo assunto em fontes diferentes)
function isDuplicate(a: NewsItem, b: NewsItem): boolean {
  const titleA = normalize(a.title).split(" ").slice(0, 8).join(" ");
  const titleB = normalize(b.title).split(" ").slice(0, 8).join(" ");
  return titleA === titleB;
}

//////////////////////////////
// MÓDULO 2 — Componente Principal
//////////////////////////////
export default function NewsCarousel({
  teamName,
  clubLogo,
}: {
  teamName: string | null;
  clubLogo?: string | null;
}) {
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      if (!teamName) return;
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("club-news", {
          body: { clubName: teamName },
        });
        setNoticias(data?.data || data || []);
      } catch (e) {
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [teamName]);

//////////////////////////////
// MÓDULO 3 — Processamento de Notícias
//////////////////////////////
  const news = useMemo(() => {
    const unique: NewsItem[] = [];
    for (const item of noticias) {
      if (!unique.some((n) => isDuplicate(n, item))) {
        unique.push(item);
      }
    }
    return unique
      .map((item) => ({ ...item, isRealImage: !isBadImage(item.imageUrl) }))
      .slice(0, 12);
  }, [noticias]);

  if (loading)
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff6200]" />
      </div>
    );

  const mainNews = news.slice(0, 4);
  const sideNews = news.slice(4);

//////////////////////////////
// MÓDULO 4 — Renderização
//////////////////////////////
  return (
    <div className="space-y-6">
      {/* Título da seção */}
      <div className="flex items-center gap-2 opacity-50">
        <Zap className="w-4 h-4 text-[#ff6200]" />
        <h2 className="text-[11px] font-black uppercase italic tracking-widest">
          Radar de Notícias
        </h2>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainNews.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            className="group relative h-64 rounded-[1.5rem] overflow-hidden border border-white/5 bg-[#111] transition-all hover:border-[#ff6200]/40"
          >
            {item.isRealImage ? (
              <img
                src={item.imageUrl!}
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-gradient-to-b from-zinc-800 to-black">
                <ClubLogo
                  src={clubLogo}
                  alt="Logo"
                  className="w-20 h-20 opacity-20 grayscale"
                />
                <Newspaper className="w-6 h-6 mt-4 opacity-10 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
              <span className="text-[9px] font-black text-[#ff6200] uppercase italic mb-1">
                {item.source}
              </span>
              <h3 className="text-sm font-bold italic text-white leading-tight line-clamp-3 group-hover:text-[#ff6200] transition-colors uppercase">
                {item.title}
              </h3>
              <div className="mt-4 text-[9px] font-bold text-zinc-500 flex items-center gap-2">
                <Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Barra lateral elegante */}
      {sideNews.length > 0 && (
        <aside className="mt-6 space-y-3 border-t border-white/10 pt-4">
          {sideNews.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              className="flex items-center gap-3 text-sm text-white/80 hover:text-[#ff6200] transition-colors"
            >
              <Newspaper className="w-4 h-4 text-[#ff6200]" />
              <span className="line-clamp-1">{item.title}</span>
            </a>
          ))}
        </aside>
      )}
    </div>
  );
}
