import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  guid: string;
}

const FALLBACK_GRADIENTS = [
  "var(--gradient-orange-dark)",
  "linear-gradient(135deg, hsl(var(--card)), hsl(var(--secondary)))",
  "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--card)))",
  "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--secondary)))",
];

const STOPWORDS = new Set(["fc", "sc", "de", "do", "da", "dos", "das", "club", "clube", "esporte", "futebol", "sport"]);

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function getClubTokens(teamName: string): string[] {
  return normalize(teamName)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function isTitleAboutClub(title: string, teamName: string): boolean {
  const titleNorm = normalize(title);
  const tokens = getClubTokens(teamName);
  if (tokens.length === 0) return false;

  const matches = tokens.filter((token) => titleNorm.includes(token));
  if (tokens.length === 1) return matches.length === 1;

  return matches.length >= Math.min(tokens.length, 2);
}

function isPortalLogoImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const value = normalize(url);

  return (
    (value.includes("s.glbimg.com") && value.includes("ge") && (value.includes("logo") || value.includes("favicon"))) ||
    value.includes("logo-ge") ||
    value.includes("ge.globo") && value.includes("favicon")
  );
}

export default function NewsCarousel({ teamName }: { teamName: string }) {
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const clubLogoUrl = useMemo(
    () => CLUBS_DATA.find((club) => normalize(club.nome) === normalize(teamName))?.logoUrl ?? null,
    [teamName],
  );

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
        if (cancelled) return;

        const rawData = Array.isArray(data) ? (data as NewsItem[]) : [];

        const filtered = rawData.filter((item) => isTitleAboutClub(item.title, teamName));

        const sorted = filtered.sort((a, b) => {
          const aOk = a.imageUrl && !isPortalLogoImage(a.imageUrl);
          const bOk = b.imageUrl && !isPortalLogoImage(b.imageUrl);

          if (aOk && !bOk) return -1;
          if (!aOk && bOk) return 1;
          return 0;
        });

        setNoticias(sorted);
      } catch {
        if (!cancelled) setNoticias([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    getNews();
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  const cleanedNews = useMemo(
    () =>
      noticias.map((item) => ({
        ...item,
        imageUrl: isPortalLogoImage(item.imageUrl) ? null : item.imageUrl,
      })),
    [noticias],
  );

  const { headlines, sidebar } = useMemo(() => {
    const seen = new Set<string>();

    const unique = cleanedNews.filter((item) => {
      const key = `${normalize(item.guid || "")}-${normalize(item.title)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const cards = unique.slice(0, Math.min(4, unique.length));
    const used = new Set(cards.map((c) => `${normalize(c.guid || "")}-${normalize(c.title)}`));

    const rest = unique.filter((item) => !used.has(`${normalize(item.guid || "")}-${normalize(item.title)}`));

    return { headlines: cards, sidebar: rest };
  }, [cleanedNews]);

  if (loading) {
    return (
      <div className="h-72 flex flex-col items-center justify-center rounded-3xl border border-border bg-card">
        <Loader2 className="animate-spin text-primary mb-3 w-8 h-8" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground italic font-bold" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
          Sincronizando Radar...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-primary italic font-bold">
          Radar de Notícias — {teamName}
        </h2>
      </div>

      {cleanedNews.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-3xl">
          <p className="text-muted-foreground text-sm italic" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
            Radar em monitoramento: nenhuma atualização oficial recente encontrada para o {teamName}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div
            className={`lg:col-span-2 grid gap-4 ${
              headlines.length === 1 ? "grid-cols-1" : headlines.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {headlines.map((item, i) => (
              <a
                key={item.guid || `${item.title}-${i}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block rounded-2xl overflow-hidden border border-border shadow-lg transition-all duration-300 hover:scale-[1.01]"
                style={{ height: "260px" }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={`Imagem da notícia: ${item.title}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    loading="lazy"
                  />
                )}

                <div
                  className="absolute inset-0"
                  style={{
                    background: item.imageUrl
                      ? "linear-gradient(to top, hsl(0 0% 0% / 0.95) 0%, hsl(0 0% 0% / 0.4) 50%, transparent 100%)"
                      : FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length],
                  }}
                />

                {!item.imageUrl && clubLogoUrl && (
                  <div className="absolute top-3 right-3 w-12 h-12 rounded-full bg-background/80 border border-border p-1.5 z-20">
                    <ClubLogo src={clubLogoUrl} alt={`Escudo ${teamName}`} size="sm" className="w-full h-full" />
                  </div>
                )}

                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <span className="text-[9px] uppercase tracking-widest text-primary font-bold mb-2 italic">{item.source}</span>
                  <h3 className="text-foreground font-bold italic mb-3 line-clamp-3 leading-tight" style={{ fontSize: "1rem" }}>
                    {item.title}
                  </h3>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}
                    </span>
                    <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                      Ler <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {sidebar.length > 0 && (
            <div className="lg:col-span-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/20">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold italic">Veja Mais</span>
              </div>
              <div className="overflow-y-auto max-h-[500px]">
                {sidebar.map((item, i) => (
                  <a
                    key={item.guid || `${item.title}-${i}`}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-4 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors group"
                  >
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors italic leading-normal mb-2 line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                      <span className="font-bold text-primary/70">{item.source}</span>
                      <span>{timeAgo(item.pubDate)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
