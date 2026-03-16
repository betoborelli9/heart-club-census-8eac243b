/**
 * ARQUIVO: src/pages/Dashboard.tsx
 * DESCRIÇÃO: Dashboard principal com Banner de cores dinâmicas e linhas laterais delicadas.
 */

// ==========================================
// MÓDULO 1: IMPORTS E CONFIGURAÇÕES
// ==========================================
import { useEffect, useMemo, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Flame, BarChart3, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import logo from "@/assets/logo.png";

const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeClub, setActiveClub] = useState<any>(null);
  const [clubeName, setClubeName] = useState<string | null>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);

  // ==========================================
  // MÓDULO 2: CARREGAMENTO DE DADOS (SUPABASE)
  // ==========================================
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

  // ==========================================
  // MÓDULO 3: DESIGN DAS LINHAS LATERAIS (DELICADAS)
  // ==========================================
  const teamStyle = useMemo(() => {
    const name = normalize(clubeName || "");
    let config = { bg: "#1a1a1a", lines: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"], text: "text-white" };

    if (name.includes("palmeiras")) {
      config = { bg: "#006437", lines: ["#ffffff", "#ffffff"], text: "text-white" };
    } else if (name.includes("sao paulo")) {
      config = { bg: "#ffffff", lines: ["#C1272D", "#000000"], text: "text-black" };
    } else if (name.includes("flamengo")) {
      config = { bg: "#C1272D", lines: ["#000000", "#000000"], text: "text-white" };
    } else if (name.includes("internacional") || name.includes("colorado")) {
      config = { bg: "#E20E0E", lines: ["#ffffff", "#ffffff"], text: "text-white" };
    }
    return config;
  }, [clubeName]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-[#ff6200] w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
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
        {/* BANNER DINÂMICO - Lógica das Faixas no Canto Direito */}
        <section className="relative overflow-hidden rounded-3xl border border-white/5 h-[220px] md:h-[260px]" style={{ backgroundColor: teamStyle.bg }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-50%] right-[10%] w-[40px] md:w-[60px] h-[200%] rotate-[25deg] opacity-20" style={{ backgroundColor: teamStyle.lines[0] }} />
            <div className="absolute top-[-50%] right-[16%] w-[15px] md:w-[20px] h-[200%] rotate-[25deg] opacity-30" style={{ backgroundColor: teamStyle.lines[1] }} />
            <div className="absolute top-[-50%] right-[21%] w-[4px] md:w-[6px] h-[200%] rotate-[25deg] opacity-40" style={{ backgroundColor: teamStyle.lines[0] }} />
          </div>

          <div className="relative z-10 h-full px-6 md:px-12 flex items-center gap-6">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full bg-white shadow-2xl flex items-center justify-center p-[1%] border-4 border-white/20">
              <ClubLogo src={activeClub?.logoUrl || activeClub?.logo} alt={clubeName || ""} className="w-full h-full object-contain scale-105" />
            </div>
            <div className={teamStyle.text}>
              <h1 className="font-black uppercase italic tracking-tighter leading-none text-2xl md:text-4xl mb-1">{profile.nome_exibicao}</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">{profile.cidade}, {profile.estado} • EMBAIXADOR</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <Link to="/mapa-calor" className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all">
            <Flame className="w-6 h-6 text-[#ff6200]" /><span className="text-[10px] font-black uppercase italic">Mapa</span>
          </Link>
          <Link to="#" className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all">
            <BarChart3 className="w-6 h-6 text-[#ff6200]" /><span className="text-[10px] font-black uppercase italic">Stats</span>
          </Link>
          <Link to="#" className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all">
            <Medal className="w-6 h-6 text-[#ff6200]" /><span className="text-[10px] font-black uppercase italic">Ranking</span>
          </Link>
        </div>

        <div className="mt-6">
          <NewsCarousel teamName={queriedTeam?.name || clubeName || null} />
        </div>
      </main>
    </div>
  );
};
export default Dashboard;