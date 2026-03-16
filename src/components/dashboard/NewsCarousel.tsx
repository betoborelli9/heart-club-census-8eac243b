// ==========================================
// MÓDULO 1: CONFIGURAÇÕES E UTILITÁRIOS
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
const STOPWORDS = new Set(["fc", "sc", "de", "do", "da", "dos", "das", "club", "clube", "sport"]);

// Funções de Apoio
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

// ==========================================
// MÓDULO 2: LÓGICA DE FILTRAGEM E IMAGENS
// ==========================================
function isPortalLogo(url: string | null): boolean {
  if (!url) return true;
  const val = normalize(url);
  return val.includes("s.glbimg.com") || val.includes("logo") || val.includes("favicon") || val.includes("ge.globo");
}

function isValidNews(title: string, teamName: string, pubDate: string): boolean {
  const isRecent = (Date.now() - new Date(pubDate).getTime()) <= SEVEN_DAYS_MS;
  const titleNorm = normalize(title);
  const teamNorm = normalize(teamName).split(" ")[0]; // Pega o nome principal (ex: "Palmeiras")
  return isRecent && titleNorm.includes(teamNorm);
}

// ==========================================
// MÓDULO 3: COMPONENTE PRINCIPAL
// ==========================================
export default function NewsCarousel({ teamName }: { teamName: string | null }) {
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca o Escudo do Clube para usar como Fallback
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
        if (active) setNoticias(Array.isArray(data) ? data : []);
      } catch {
        if (active) setNoticias([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchNews();
    return () => { active = false; };
  }, [teamName]);

  // --- MÓDULO 4: PROCESSAMENTO DE DADOS (DEDUPLICAÇÃO) ---
  const processedNews = useMemo(() => {
    const seen = new Set();
    return noticias
      .filter(item => isValidNews(item.title, teamName!, item.pubDate))
      .filter(item => {
        const key = normalize(item.title).substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(item => ({
        ...item,
        // Se for logo de portal, anula a imagem para usar o escudo do clube no render
        imageUrl: isPortalLogo(item.imageUrl) ? null : item.imageUrl 
      }));
  }, [noticias, teamName]);

  const headlines = processedNews.slice(0, 4);
  const sidebar = processedNews.slice(4, 12);

  // --- MÓDULO 5: RENDERIZAÇÃO ---
  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-zinc-900/30">
      <Loader2 className="animate-spin text-[#ff6200] mb-2" />
      <span className="text-[10px] uppercase font-black italic opacity-40">Sincronizando Radar...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-2">
        <Zap className="w-4 h-4 text-[#ff6200]" />
        <h2 className="text-[11px] uppercase font-black italic tracking-[0.2em] text-[#ff6200]">
          Radar de Notícias — {teamName}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bloco Principal (Cards com Imagem) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {headlines.map((item, i) => (
            <a key={i} href={item.link} target="_blank" className="group relative h-64 rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 shadow-xl transition-transform hover:scale-[1.02]">
              
              {/* Prioridade: Foto da Notícia. Fallback: Escudo 98% no centro */}
              {item.imageUrl ? (
                <img src={item.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50 p-12">
                   <ClubLogo src={clubLogoUrl} alt="Logo" className="w-full h-full object-contain opacity-20 grayscale group-hover:opacity-40 transition-all" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <span className="text-[9px] font-black text-[#ff6200] uppercase italic mb-1">{item.source}</span>
                <h3 className="text-sm font-black italic text-white leading-tight line-clamp-3 uppercase">{item.title}</h3>
                <div className="mt-3 flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(item.pubDate)}</span>
                  <span className="group-hover:text-white transition-colors">VER NO GE →</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* MÓDULO SIDEBAR: VEJA MAIS */}
        <div className="lg:col-span-1 rounded-2xl border border-white/5 bg-zinc-900/50 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-white/5 text-[10px] font-black uppercase italic tracking-widest text-zinc-400">Veja Mais</div>
          <div className="overflow-y-auto max-h-[510px]">
            {sidebar.map((item, i) => (
              <a key={i} href={item.link} target="_blank" className="block p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                <h4 className="text-[11px] font-bold text-zinc-300 group-hover:text-white italic leading-snug uppercase">{item.title}</h4>
                <div className="flex justify-between mt-2 text-[9px] font-black text-zinc-500">
                  <span>{item.source}</span>
                  <span>{timeAgo(item.pubDate)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}