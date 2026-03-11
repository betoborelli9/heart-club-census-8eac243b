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
          setNoticias(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Erro ao carregar radar de notícias:", e);
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
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
        Sincronizando Radar de Notícias...
      </span>
    </div>
  );

  const headlines = noticias.slice(0, 4);
  const sidebar = noticias.slice(4);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-4 h-4 text-primary" />
        <h2
          className="text-[11px] uppercase tracking-[0.3em] text-primary"
          style={{ fontFamily: "Verdana, Geneva, sans-serif", fontWeight: 700 }}
        >
          Radar de Notícias — {teamName}
        </h2>
      </div>

      {noticias.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-3xl">
          <p className="text-muted-foreground uppercase tracking-widest text-sm" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
            Nenhuma notícia encontrada para {teamName}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT: Headline Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {headlines.map((item, i) => (
              <a
                key={item.guid || i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block rounded-2xl overflow-hidden border border-border shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]"
                style={{ minHeight: i === 0 ? "280px" : "220px" }}
              >
                {/* Background image or gradient */}
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div
                  className="absolute inset-0"
                  style={{
                    background: item.imageUrl
                      ? "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.15) 100%)"
                      : FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length],
                  }}
                />

                {/* Content overlay */}
                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-primary mb-2 opacity-90"
                    style={{ fontFamily: "Verdana, Geneva, sans-serif", fontWeight: 700 }}
                  >
                    <Newspaper className="w-3 h-3" />
                    {item.source}
                  </span>

                  <h3
                    className="text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-3 mb-3"
                    style={{
                      fontFamily: "Verdana, Geneva, sans-serif",
                      fontWeight: 700,
                      fontSize: i === 0 ? "1.1rem" : "0.95rem",
                    }}
                  >
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] text-muted-foreground flex items-center gap-1"
                      style={{ fontFamily: "Verdana, Geneva, sans-serif" }}
                    >
                      <Clock className="w-3 h-3" />
                      {timeAgo(item.pubDate)}
                    </span>
                    <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
                      Ler <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* RIGHT: Sidebar radar list */}
          <div className="lg:col-span-1 flex flex-col gap-0 rounded-2xl border border-border overflow-hidden bg-card">
            <div className="px-4 py-3 border-b border-border">
              <span
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                style={{ fontFamily: "Verdana, Geneva, sans-serif", fontWeight: 700 }}
              >
                Veja Mais
              </span>
            </div>

            {sidebar.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-muted-foreground text-xs" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
                  Sem notícias adicionais
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[500px]">
                {sidebar.map((item, i) => (
                  <a
                    key={item.guid || `side-${i}`}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                  >
                    {/* Small thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = "none";
                          }}
                        />
                      ) : (
                        <Newspaper className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-1"
                        style={{
                          fontFamily: "Verdana, Geneva, sans-serif",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                      >
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] text-primary uppercase tracking-wider"
                          style={{ fontFamily: "Verdana, Geneva, sans-serif", fontWeight: 700 }}
                        >
                          {item.source}
                        </span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
                          <Clock className="w-2.5 h-2.5" /> {timeAgo(item.pubDate)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
