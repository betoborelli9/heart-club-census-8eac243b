// BUILD: 16/03/2026 - DASHBOARD PREMIUM MODULAR
import { useEffect, useMemo, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Flame, BarChart3, Medal, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import logo from "@/assets/logo.png";

// --- MÓDULO 1: LÓGICA DE NORMALIZAÇÃO E ESTILO ---
const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeClub, setActiveClub] = useState<any>(null);
  const [clubeName, setClubeName] = useState<string | null>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);

  // --- MÓDULO 2: CARREGAMENTO DE DADOS ---
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).eq("is_original_vote", true).maybeSingle();
      const teamName = data?.clube_nome || null;
      setClubeName(teamName);
      if (teamName) {
        const clubInfo = CLUBS_DATA.find(c => normalize(c.nome) === normalize(teamName));
        setActiveClub(clubInfo || { nome: teamName });
      }
    };
    loadData();
  }, [user]);

  // --- MÓDULO 3: CORES DINÂMICAS (SÃO PAULO, PALMEIRAS, FLAMENGO) ---
  const teamStyle = useMemo(() => {
    const name = normalize(clubeName || "");
    if (name.includes("palmeiras")) return { 
        bg: "bg-[#006437]", 
        lines: "rgba(255, 255, 255, 0.15)", 
        text: "text-white" 
    };
    if (name.includes("flamengo")) return { 
        bg: "bg-[#C1272D]", 
        lines: "rgba(0, 0, 0, 0.3)", 
        text: "text-white" 
    };
    if (name.includes("sao paulo")) return { 
        bg: "bg-white", 
        lines: "repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(0,0,0,0.05) 30px, rgba(0,0,0,0.05) 60px, rgba(193,39,45,0.05) 60px, rgba(193,39,45,0.05) 90px)", 
        text: "text-black" 
    };
    return { bg: "bg-zinc-900", lines: "rgba(255, 255, 255, 0.05)", text: "text-white" };
  }, [clubeName]);

  if (isLoading || !profile) {
    return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-[#ff6200] w-10 h-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#ff6200]">
      
      {/* --- MÓDULO 4: HEADER ESTRUTURADO --- */}
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter hidden sm:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm"><ClubSearch onSelect={(club) => setQueriedTeam(club)} /></div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/50 hover:text-white"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4 space-y-4">
        
        {/* --- MÓDULO 5: BANNER DINÂMICO (ESCUDO 98%) --- */}
        <section className={`relative overflow-hidden rounded-3xl border border-white/5 h-[280px] md:h-[320px] ${teamStyle.bg}`}>
          {/* Linhas Diagonais Inteligentes */}
          <div className="absolute inset-0 opacity-100" style={{ 
              backgroundImage: teamStyle.lines.includes('gradient') ? teamStyle.lines : `repeating-linear-gradient(45deg, transparent, transparent 35px, ${teamStyle.lines} 35px, ${teamStyle.lines} 70px)` 
          }} />

          <div className="relative z-10 h-full px-6 md:px-12 flex items-center gap-6 md:gap-10">
            {/* O Círculo do Escudo 98% */}
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white shadow-2xl border-4 border-white/20 overflow-hidden shrink-0 flex items-center justify-center p-[1%]">
              <ClubLogo src={activeClub?.logoUrl || activeClub?.logo} alt={clubeName || ""} className="w-full h-full object-contain scale-110" />
            </div>

            <div className={`${teamStyle.text} flex-1`}>
              <h1 className="font-black uppercase italic tracking-tighter leading-none text-3xl md:text-5xl drop-shadow-2xl mb-2">
                {profile.nome_exibicao || "Torcedor"}
              </h1>
              <div className="flex flex-col gap-1 font-bold uppercase text-[10px] md:text-xs tracking-widest opacity-80">
                <span className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {profile.cidade}, {profile.estado}</span>
                <span className="flex items-center gap-2 text-[#ff6200]"><Trophy className="w-3 h-3" /> EMBAIXADOR BRONZE</span>
              </div>
            </div>

            <div className={`hidden lg:block text-right ${teamStyle.text} opacity-20`}>
                <h2 className="text-6xl font-black italic uppercase leading-none">{clubeName || "CENSO"}</h2>
            </div>
          </div>
        </section>

        {/* --- MÓDULO 6: NAVEGAÇÃO RÁPIDA --- */}
        <div className="grid grid-cols-3 gap-2">
          <Link to="/mapa-calor" className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all group">
            <Flame className="w-6 h-6 text-[#ff6200] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase italic">Mapa</span>
          </Link>
          <Link to="#" className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all group">
            <BarChart3 className="w-6 h-6 text-[#ff6200] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase italic">Stats</span>
          </Link>
          <Link to="#" className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all group">
            <Medal className="w-6 h-6 text-[#ff6200] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase italic">Ranking</span>
          </Link>
        </div>

        {/* --- MÓDULO 7: RADAR DE NOTÍCIAS (7 DIAS / FOTO OU LOGO) --- */}
        <div className="mt-6">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black italic uppercase text-sm flex items-center gap-2">
                    <div className="w-1 h-4 bg-[#ff6200]" /> RADAR {queriedTeam?.name || clubeName}
                </h3>
                <span className="text-[10px] text-zinc-500 font-bold uppercase"><Clock className="w-3 h-3 inline mr-1" /> Últimos 7 dias</span>
            </div>
            <NewsCarousel 
                clubName={queriedTeam?.name || clubeName || null} 
                clubLogo={activeClub?.logoUrl || activeClub?.logo}
            />
        </div>

      </main>
    </div>
  );
};

export default Dashboard;