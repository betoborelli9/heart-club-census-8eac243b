/**
 * ARQUIVO: src/components/dashboard/NewsCarousel.tsx
 * LÓGICA: Deduplicação por similaridade de conteúdo.
 * Fallback: escudo do clube em degradê (NUNCA logo do GE).
 * Filtro: apenas notícias das últimas 48h.
 */

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

const normalizeText = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  return hrs < 1 ? "agora" : hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`;
};

/** Bloqueia logos de portais (GE, UOL, Lance, etc.) */
function isBadImage(url: string | null): boolean {
  if (!url) return true;
  const val = normalizeText(url);
  const blocked = [
    "logo", "favicon", "s.glbimg.com", "placeholder",
    "ge.globo", "brand", "og-image", "default",
    "uol.com.br/esporte/i/espacos", "lance.com.br/geral"
  ];
  return blocked.some((b) => val.includes(b));
}

/** Extrai palavras-chave do título para comparação de similaridade */
function extractKeywords(title: string): string[] {
  const stopwords = new Set([
    "de", "do", "da", "dos", "das", "o", "a", "os", "as", "e",
    "em", "no", "na", "nos", "nas", "um", "uma", "por", "para",
    "com", "que", "se", "ao", "pelo", "pela", "sobre", "pode",
    "vai", "ter", "ser", "esta", "este", "esse", "essa", "mais",
  ]);
  return normalizeText(title)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));
}

/** Verifica se duas notícias tratam do mesmo assunto */
function isSameContent(a: NewsItem, b: NewsItem): boolean {
  const kwA = extractKeywords(a.title);
  const kwB = extractKeywords(b.title);
  if (kwA.length === 0 || kwB.length === 0) return false;
  const setB = new Set(kwB);
  const matches = kwA.filter((w) => setB.has(w)).length;
  const ratio = matches / Math.min(kwA.length, kwB.length);
  return ratio >= 0.6; // 60%+ de palavras em comum = mesma notícia
}

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
      } catch {
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [teamName]);

  // Processamento: filtro 48h + dedup por similaridade de conteúdo
  const news = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;

    // 1. Filtrar últimas 48h
    const recent = noticias.filter((item) => {
      try {
        return new Date(item.pubDate).getTime() >= cutoff;
      } catch {
        return true; // Se não parsear a data, manter
      }
    });

    // 2. Deduplicar por similaridade de conteúdo
    const unique: NewsItem[] = [];
    for (const item of recent) {
      if (!unique.some((n) => isSameContent(n, item))) {
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

  if (news.length === 0)
    return (
      <div className="h-40 flex items-center justify-center text-zinc-500 text-sm italic">
        Nenhuma notícia recente encontrada.
      </div>
    );

  const mainNews = news.slice(0, 4);
  const sideNews = news.slice(4);

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#ff6200]" />
        <h2 className="text-[11px] font-black uppercase italic tracking-widest text-white/50">
          Radar de Notícias — {teamName}
        </h2>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainNews.map((item, i) => (
          <a
            key={`main-${i}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative h-64 rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 transition-all hover:border-[#ff6200]/40"
          >
            {/* Imagem de fundo ou fallback com escudo */}
            {item.isRealImage ? (
              <img
                src={item.imageUrl!}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950">
                <ClubLogo
                  src={clubLogo}
                  alt="Escudo"
                  className="w-24 h-24 opacity-15"
                />
              </div>
            )}

            {/* Gradiente inferior */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

            {/* Texto */}
            <div className="absolute inset-0 p-5 flex flex-col justify-end">
              <span className="text-[9px] font-black text-[#ff6200] uppercase italic mb-1">
                {item.source}
              </span>
              <h3 className="text-sm font-bold italic text-white leading-tight line-clamp-3 group-hover:text-[#ff6200] transition-colors uppercase">
                {item.title}
              </h3>
              <div className="mt-3 text-[9px] font-bold text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Sidebar — jamais repete notícias dos cards */}
      {sideNews.length > 0 && (
        <aside className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30 italic">
            Veja Mais
          </span>
          {sideNews.map((item, i) => (
            <a
              key={`side-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-1 text-sm text-white/70 hover:text-[#ff6200] transition-colors"
            >
              <Newspaper className="w-4 h-4 text-[#ff6200] shrink-0" />
              <span className="line-clamp-1 flex-1">{item.title}</span>
              <span className="text-[9px] text-zinc-600 shrink-0">{timeAgo(item.pubDate)}</span>
            </a>
          ))}
        </aside>
      )}
    </div>
  );
}
