/**
 * [CAMINHO]: src/components/dashboard/NewsFeedCards.tsx
 * [MÓDULO]: RADAR DE NOTÍCIAS — LISTA MINIMALISTA (SEM LOGOS + DEDUPLICAÇÃO)
 */
import { useEffect, useState } from "react";
import { Zap, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  time?: string;
}

export default function NewsFeedCards({ teamName, primaryColor = "#ff6200" }: any) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      if (!teamName) return;
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("club-news", { body: { clubName: teamName } });
        const rawNews = Array.isArray(data) ? data : data?.data || [];

        // LÓGICA DE DEDUPLICAÇÃO: Tira títulos repetidos ou muito similares
        const uniqueNews = rawNews.reduce((acc: NewsItem[], current: NewsItem) => {
          const isDuplicate = acc.find(
            (item) => item.title.toLowerCase().substring(0, 30) === current.title.toLowerCase().substring(0, 30),
          );
          if (!isDuplicate) acc.push(current);
          return acc;
        }, []);

        setNews(uniqueNews.slice(0, 8)); // Limita a 8 links para manter o design clean
      } catch (err) {
        setNews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [teamName]);

  if (loading)
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff6200]" />
      </div>
    );

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: primaryColor }} />
          <h2 className="text-[11px] font-black uppercase italic tracking-widest text-white/70">Radar {teamName}</h2>
        </div>
        <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter italic">
          Somente Links Oficiais
        </span>
      </header>

      <div className="flex flex-col">
        {news.length === 0 ? (
          <p className="text-[10px] text-white/30 italic py-4 text-center uppercase">
            Aguardando novas atualizações...
          </p>
        ) : (
          news.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all px-2"
            >
              <div className="mt-1 flex-shrink-0">
                <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-[#ff6200] transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[9px] font-black uppercase italic tracking-wider"
                    style={{ color: primaryColor }}
                  >
                    {item.source}
                  </span>
                  {item.time && <span className="text-[8px] text-white/20 uppercase font-bold">— {item.time}</span>}
                </div>
                <h3 className="text-[12px] font-bold text-white/80 group-hover:text-white leading-tight transition-colors line-clamp-2 uppercase italic">
                  {item.title}
                </h3>
              </div>
            </a>
          ))
        )}
      </div>
      <p className="text-[8px] text-center text-white/10 uppercase font-black italic pt-2">
        Cruzamento de dados: Google, Gemini & Wikipédia
      </p>
    </div>
  );
}
