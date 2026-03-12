import { useEffect, useState } from "react";
import { Clock, ExternalLink, Loader2, Zap, Radio } from "lucide-react";
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
          // Edge Function already does strict filtering; use as-is
          setNoticias(Array.isArray(data) ? data : []);
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
      <span style={{ fontFamily: "Verdana, sans-serif" }} className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground italic">
        Sincronizando Radar de Notícias...
      </span>
    </div>
  );

  // Empty state
  if (noticias.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-4 h-4 text-primary" />
          <h2 style={{ fontFamily: "Verdana, sans-serif" }} className="text-[11px] uppercase tracking-[0.3em] text-primary italic">
            Radar de Notícias — {teamName}
          </h2>
        </div>
        <div className="py-16 text-center border border-dashed border-border rounded-3xl">
          <Radio className="w-6 h-6 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p style={{ fontFamily: "Verdana, sans-serif" }} className="text-muted-foreground text-sm italic px-6">
            Radar em monitoramento: nenhuma atualização oficial recente encontrada para o {teamName}.
          </p>
        </div>
      </div>
    );
  }

  // Separate items with valid images vs without
  const withPhoto = noticias.filter(it => it.imageUrl && it.imageUrl.startsWith("http"));
  const withoutPhoto = noticias.filter(it => !it.imageUrl || !it.imageUrl.startsWith("http"));

  // Featured cards: only items WITH photos, up to how many exist (max 4)
  const featured = withPhoto.slice(0, Math.min(withPhoto.length, 4));
  // Sidebar: everything else
  const sidebar = [...withPhoto.slice(featured.length), ...withoutPhoto];

  // Grid columns for featured: adapt to count
  const featuredGridCols =
    featured.length === 1 ? "grid-cols-1" :
    featured.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
    featured.length === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
    "grid-cols-1 sm:grid-cols-2";

  const hasSidebar = sidebar.length > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-4 h-4 text-primary" />
        <h2 style={{ fontFamily: "Verdana, sans-serif" }} className="text-[11px] uppercase tracking-[0.3em] text-primary italic">
          Radar de Notícias — {teamName}
        </h2>
      </div>

      <div className={`grid grid-cols-1 ${hasSidebar ? "lg:grid-cols-3" : ""} gap-5`}>

        {/* FEATURED CARDS */}
        {featured.length > 0 && (
          <div className={`${hasSidebar ? "lg:col-span-2" : "lg:col-span-3"} grid ${featuredGridCols} gap-4`}>
            {featured.map((item, i) => (
              <a
                key={item.guid || i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block rounded-2xl overflow-hidden border border-border shadow-lg transition-all duration-300 hover:scale-[1.01]"
                style={{ height: featured.length === 1 ? "380px" : "250px" }}
              >
                <img
                  src={item.imageUrl!}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <span style={{ fontFamily: "Verdana, sans-serif" }} className="text-[9px] uppercase tracking-widest text-primary mb-2 italic">
                    {item.source}
                  </span>
                  <h3
                    style={{ fontFamily: "Verdana, sans-serif", fontSize: i === 0 && featured.length > 1 ? "1rem" : featured.length === 1 ? "1.1rem" : "0.85rem" }}
                    className="text-white leading-tight italic mb-3 line-clamp-3"
                  >
                    {item.title}
                  </h3>
                  <div style={{ fontFamily: "Verdana, sans-serif" }} className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}</span>
                    <span className="flex items-center gap-1 group-hover:text-primary transition-colors">Ler <ExternalLink className="w-3 h-3" /></span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* If no featured but we have sidebar items, show a small placeholder */}
        {featured.length === 0 && sidebar.length > 0 && (
          <div className="lg:col-span-2 flex items-center justify-center rounded-2xl border border-dashed border-border py-10">
            <p style={{ fontFamily: "Verdana, sans-serif" }} className="text-muted-foreground text-xs italic">
              Galeria visual indisponível no momento.
            </p>
          </div>
        )}

        {/* SIDEBAR */}
        {hasSidebar && (
          <div className="lg:col-span-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/20">
              <span style={{ fontFamily: "Verdana, sans-serif" }} className="text-[10px] uppercase tracking-widest text-muted-foreground italic">
                Radar Extra
              </span>
            </div>
            <div className="overflow-y-auto max-h-[540px]">
              {sidebar.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-4 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors group"
                >
                  <h4
                    style={{ fontFamily: "Verdana, sans-serif" }}
                    className="text-xs text-foreground group-hover:text-primary transition-colors italic leading-normal mb-2"
                  >
                    {item.title}
                  </h4>
                  <div style={{ fontFamily: "Verdana, sans-serif" }} className="flex justify-between items-center text-[9px] text-muted-foreground">
                    <span className="text-primary/70 italic">{item.source}</span>
                    <span>{timeAgo(item.pubDate)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
