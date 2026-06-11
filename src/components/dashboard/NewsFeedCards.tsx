/**
 * [CAMINHO]: src/components/dashboard/NewsFeedCards.tsx
 * [MÓDULO]: RADAR DE NOTÍCIAS — LISTA MINIMALISTA (SEM LOGOS EXTERNAS + DEDUPLICAÇÃO POR ASSUNTO)
 *
 * REGRAS RÍGIDAS:
 *  - PROIBIDO renderizar qualquer <img/> de fontes externas (Google, GE, UOL, etc.)
 *  - Deduplicação compara os primeiros 40 caracteres do título — mantém a notícia MAIS RECENTE.
 *  - Layout: Ícone Link + Fonte (destaque) + Título (itálico/negrito) + Tempo atrás.
 */
import { useEffect, useState } from "react";
import { Zap, Loader2, ExternalLink, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate?: string;
  time?: string;
}

interface ClubMeta {
  apiId: string | null;
  cidade: string | null;
  pais: string | null;
  nomeCurto: string | null;
}

interface Props {
  teamName: string | null;
  primaryColor?: string;
  clubMeta?: ClubMeta | null;
}

const timeAgo = (d?: string) => {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

export default function NewsFeedCards({ teamName, primaryColor = "#ff6200", clubMeta }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchNews = async () => {
      if (!teamName) return;
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("club-news", {
          body: {
            clubName: teamName,
            apiId: clubMeta?.apiId ?? null,
            cidade: clubMeta?.cidade ?? null,
            pais: clubMeta?.pais ?? null,
            nomeCurto: clubMeta?.nomeCurto ?? null,
          },
        });
        const raw: NewsItem[] = Array.isArray(data) ? data : data?.data || [];

        // FILTRO DE VALIDADE (anti-zumbi):
        // - descarta tudo publicado há mais de 48h
        // - "onde assistir", "escalação/escalações", "provável", "pré-jogo",
        //   "ao vivo", "tempo real" só valem se publicados nas últimas 24h
        //   (notícias de pré-jogo de partida que já aconteceu são removidas).
        const now = Date.now();
        const MAX_AGE = 48 * 60 * 60 * 1000; // 48 horas (rígido)
        const H24 = 24 * 60 * 60 * 1000;
        const PRE_MATCH_RX = /(onde\s+assistir|escala[cç][aã]o|escala[cç][oõ]es|prov[aá]vel|pr[eé][- ]?jogo|ao\s+vivo|tempo\s+real|minuto\s+a\s+minuto)/i;
        const fresh = raw.filter((item) => {
          const t = item.pubDate ? new Date(item.pubDate).getTime() : NaN;
          if (isNaN(t)) return false; // sem data → descarta
          const age = now - t;
          if (age > MAX_AGE) return false;
          if (PRE_MATCH_RX.test(item.title || "") && age > H24) return false;
          return true;
        });

        // ORDENA por data (mais recente primeiro) — base para a deduplicação
        const sorted = [...fresh].sort((a, b) => {
          const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          return tb - ta;
        });

        // DEDUPLICAÇÃO: compara primeiros 40 caracteres do título normalizado.
        const seen = new Set<string>();
        const unique: NewsItem[] = [];
        for (const item of sorted) {
          const key = (item.title || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9 ]/g, "")
            .trim()
            .slice(0, 40);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          unique.push(item);
        }

        if (!cancelled) setNews(unique.slice(0, 10));
      } catch {
        if (!cancelled) setNews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchNews();
    return () => {
      cancelled = true;
    };
  }, [teamName, clubMeta?.apiId, clubMeta?.cidade, clubMeta?.pais]);

  return (
    <section className="p-4 space-y-4">
      {/* CABEÇALHO HEART CLUB */}
      <header className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: primaryColor }} />
          <h2 className="text-[11px] font-black uppercase italic tracking-widest text-white/70">
            Radar {teamName}
          </h2>
        </div>
        <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter italic">
          Somente Links Oficiais — Monitoramento IA
        </span>
      </header>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : news.length === 0 ? (
        <p className="text-[10px] text-white/30 italic py-6 text-center uppercase font-black">
          Aguardando novas atualizações...
        </p>
      ) : (
        <ul className="flex flex-col">
          {news.map((item, i) => (
            <li key={i}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-all px-2"
              >
                <ExternalLink className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-white/20 group-hover:text-[color:var(--news-accent)] transition-colors"
                  style={{ ['--news-accent' as any]: primaryColor }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[10.5px] font-bold italic text-white/85 group-hover:text-white leading-snug transition-colors line-clamp-2 uppercase">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-[9px] font-black uppercase italic tracking-wider"
                      style={{ color: primaryColor }}
                    >
                      {item.source}
                    </span>
                    {(item.pubDate || item.time) && (
                      <span className="flex items-center gap-1 text-[8px] text-white/30 uppercase font-bold">
                        <Clock className="w-2.5 h-2.5" />
                        {item.time || timeAgo(item.pubDate)}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[8px] text-center text-white/15 uppercase font-black italic pt-1">
        Cruzamento de dados: Google · Gemini · Wikipédia
      </p>
    </section>
  );
}
