/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/EditorialNews.tsx
 * [MÓDULO]: DASHBOARD — RADAR DE NOTÍCIAS (EDITORIAL CLEAN)
 * [DESCRIÇÃO]: Feed tipográfico sem imagens, inspirado em Apple News / The Athletic.
 *   - Quote bar vertical na cor primária do clube
 *   - Títulos font-black italic uppercase
 *   - Tempo em fonte mono diminuta
 *   - Skeletons finos enquanto carrega
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

const stop = new Set([
  "de", "do", "da", "dos", "das", "o", "a", "os", "as", "e",
  "em", "no", "na", "nos", "nas", "um", "uma", "por", "para",
  "com", "que", "se", "ao", "pelo", "pela", "sobre",
]);

const keywords = (t: string) =>
  normalize(t).split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));

const sameContent = (a: NewsItem, b: NewsItem) => {
  const A = keywords(a.title);
  const B = new Set(keywords(b.title));
  if (!A.length || !B.size) return false;
  const hits = A.filter((w) => B.has(w)).length;
  return hits / Math.min(A.length, B.size) >= 0.6;
};

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
};

interface Props {
  teamName: string | null;
  primaryColor?: string;
}

export default function EditorialNews({ teamName, primaryColor = "#ff6200" }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!teamName) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("club-news", {
          body: { clubName: teamName },
        });
        if (!cancelled) setItems(data?.data || data || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  const news = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const recent = items.filter((it) => {
      try {
        return new Date(it.pubDate).getTime() >= cutoff;
      } catch {
        return true;
      }
    });
    const unique: NewsItem[] = [];
    for (const it of recent) {
      if (!unique.some((u) => sameContent(u, it))) unique.push(it);
    }
    return unique.slice(0, 10);
  }, [items]);

  return (
    <section className="space-y-8">
      {/* Cabeçalho editorial */}
      <header className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-black uppercase italic tracking-[0.2em] text-white/50">
          Radar de Notícias
        </h2>
        {teamName && (
          <span className="text-[10px] font-mono text-white/30 tracking-tight">
            {teamName.toUpperCase()}
          </span>
        )}
      </header>

      {/* Estado: carregando */}
      {loading && (
        <ul className="space-y-7">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex gap-5">
              <div className="w-[2px] bg-white/10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20 bg-white/[0.04]" />
                <Skeleton className="h-4 w-[85%] bg-white/[0.05]" />
                <Skeleton className="h-3 w-[60%] bg-white/[0.03]" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Estado: vazio */}
      {!loading && news.length === 0 && (
        <p className="text-sm italic text-white/30 py-8">
          {teamName
            ? "Nenhuma notícia recente encontrada nas últimas 48h."
            : "Selecione um clube para ver o radar de notícias."}
        </p>
      )}

      {/* Lista editorial */}
      {!loading && news.length > 0 && (
        <ul className="divide-y divide-white/[0.04]">
          {news.map((item, i) => (
            <li key={`${item.guid}-${i}`}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-6 py-8 md:py-9 transition-all duration-300 hover:pl-2"
              >
                {/* Borda lateral fina (2px) na cor do clube */}
                <div
                  className="w-[2px] rounded-full shrink-0 transition-all duration-300 group-hover:w-[3px] group-hover:shadow-[0_0_18px_var(--club-primary)]"
                  style={{
                    background: primaryColor,
                    ['--club-primary' as any]: primaryColor,
                    boxShadow: `0 0 10px ${primaryColor}33`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  {/* Fonte + tempo */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[9px] font-black uppercase italic tracking-[0.22em]"
                      style={{ color: primaryColor }}
                    >
                      {item.source}
                    </span>
                    <span className="text-[10px] font-mono text-white/30 tracking-tight">
                      {timeAgo(item.pubDate)}
                    </span>
                  </div>

                  {/* Título editorial */}
                  <h3 className="text-base md:text-lg font-black italic uppercase tracking-tighter text-white leading-snug transition-opacity duration-300 group-hover:opacity-90">
                    {item.title}
                  </h3>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
