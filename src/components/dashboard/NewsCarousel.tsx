/**
 * ARQUIVO: src/components/dashboard/NewsCarousel.tsx
 * DESCRIÇÃO: Radar de notícias com filtro de 7 dias e lógica de imagem foto/escudo.
 */

// ==========================================
// MÓDULO 1: UTILITÁRIOS E IMPORTS
// ==========================================
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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

// ==========================================
// MÓDULO 2: FILTROS E TRATAMENTO DE IMAGEM
// ==========================================
function isPortalLogo(url: string | null): boolean {
  if (!url) return true;
  const val = normalize(url);
  return val.includes("s.glbimg.com") || val.includes("logo") || val.includes("favicon") || val.includes("ge.globo");
}

// ==========================================
// MÓDULO 3: COMPONENTE E FETCH DE DADOS
// ==========================================
export default function NewsCarousel({ teamName }: { teamName: string | null }) {
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const clubLogoUrl = useMemo(() => 
    teamName ? CLUBS_DATA.find((c) => normalize(c.nome) === normalize(teamName))?.logoUrl : null
  , [teamName]);

  useEffect(() => {
    let active = true;
    async function fetchNews() {
      if (!teamName) return;
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("club-news", { body: { clubName: teamName } });
        if (active) setNoticias(data?.data || data || []);
      } catch (e) {
        if (active) setNoticias([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchNews();
    return () => { active = false; };
  }, [teamName]);

  // --- MÓDULO 4: PROCESSAMENTO (7 DIAS + DEDUPLICAÇÃO) ---
  const processedNews = useMemo(() => {
    const seen = new Set();
    return noticias
      .filter(item => (Date.now() - new Date(item.pubDate).getTime()) <= SEVEN_DAYS_MS)
      .filter(item => {
        const key = normalize(item.title).substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(item => ({
        ...item,
        imageUrl: isPortalLogo(item.imageUrl) ? null : item.imageUrl 
      }));
  }, [noticias]);

  const headlines = processedNews.slice(0, 4);
  const sidebar = processedNews.slice(4, 12);

  if (loading) return (
    <div className="h-40 flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-zinc-900/50">
      <Loader2 className="animate-spin text-[#ff6200] w-6 h-6 mb-2" />
      <span className="text-[10px] font-black uppercase italic opacity-40">Buscando Notícias...</span>
    </div>
  );

  // --- MÓDULO 5: RENDERIZAÇÃO ---
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-2">
        <Zap className="w-4 h-4 text-[#ff6200]" />
        <h2 className="text-[11px] uppercase font-black italic text-[#ff6200]">Radar — {teamName}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {headlines.map((item, i) => (
            <a key={i} href={item.link} target="_blank" className="group relative h-64 rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 shadow-xl transition-transform hover:scale-[1.01]">
              {item.imageUrl ? (
                <img src={item.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50 p-12">
                   <ClubLogo src={clubLogoUrl} alt="Logo" className="w-full h-full object-contain opacity-20 grayscale" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <span className="text-[9px] font-black text-[#ff6200] uppercase italic mb-1">{item.source}</span>
                <h3 className="text-sm font-black italic text-white line-clamp-3 uppercase leading-tight">{item.title}</h3>
                <div className="mt-3 flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}</span>
                  <span className="group-hover:text-white transition-colors">VER NO GE →</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="lg:col-span-1 rounded-2xl border border-white/5 bg-zinc-900/50 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-white/5 text-[10px] font-black uppercase italic text-zinc-400">Veja Mais</div>
          <div className="overflow-y-auto max-h-[510px]">
            {sidebar.map((item, i) => (
              <a key={i} href={item.link} target="_blank" className="block p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                <h4 className="text-[11px] font-bold text-zinc-300 group-hover:text-white italic uppercase">{item.title}</h4>
                <div className="flex justify-between mt-2 text-[9px] font-black text-zinc-500">
                  <span>{item.source}</span><span>{timeAgo(item.pubDate)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}