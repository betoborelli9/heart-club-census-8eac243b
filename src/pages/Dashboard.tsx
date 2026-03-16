/**
 * ARQUIVO: src/pages/Dashboard.tsx
 * DESIGN: Banner Premium com tipografia flutuante e linhas dinâmicas.
 */

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

  // MÓDULO DE DESIGN: LINHAS E CORES PREMIUM
  const teamStyle = useMemo(() => {
    const name = normalize(clubeName || "");
    let config = { bg: "#1a1a1a", colors: ["#ffffff", "#333333"], text: "text-white" };

    if (name.includes("palmeiras")) config = { bg: "#006437", colors: ["#ffffff", "#ffffff"], text: "text-white" };
    else if (name.includes("sao paulo")) config = { bg: "#ffffff", colors: ["#C1272D", "#000000"], text: "text-black" };
    else if (name.includes("flamengo")) config = { bg: "#C1272D", colors: ["#000000", "#000000"], text: "text-white" };
    else if (name.includes("internacional")) config = { bg: "#E20E0E", colors: ["#ffffff", "#ffffff"], text: "text-white" };
    
    return config;
  }, [clubeName]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-[#ff6200] w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm"><ClubSearch onSelect={(club) => setQueriedTeam(club)} /></div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/50"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4 space-y-4">
        {/* BANNER DESIGNER REFEITO */}
        <section className="relative overflow-hidden rounded-[2.5rem] h-[240px] md:h-[300px] shadow-2xl" style={{ backgroundColor: teamStyle.bg }}>
          {/* Linhas Diagonais Elegantes (Canto Direito) */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[5%] w-[80px] h-[140%] rotate-[22deg] bg-gradient-to-b from-transparent via-current to-transparent opacity-[0.08]" style={{ color: teamStyle.colors[0] }} />
            <div className="absolute top-[-20%] right-[12%] w-[20px] h-[140%] rotate-[22deg] bg-current opacity-[0.15]" style={{ color: teamStyle.colors[1] }} />
            <div className="absolute top-[-20%] right-[18%] w-[2px] h-[140%] rotate-[22deg] bg-current opacity-[0.4]" style={{ color: teamStyle.colors[0] }} />
          </div>

          {/* Nome do Clube como Marca D'água Estilizada */}
          <div className="absolute right-10 top-1/2 -translate-y-1/2 select-none pointer-events-none">
            <h2 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter opacity-[0.07] leading-none" style={{ color: teamStyle.colors[0] }}>
              {clubeName}
            </h2>
          </div>

          <div className="relative z-10 h-full px-8 md:px-16 flex items-center gap-8">
            {/* Escudo 98% (Ajustado para preencher) */}
            <div className="w-36 h-36 md:w-52 md:h-52 rounded-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center p-1 relative overflow-hidden">
                <ClubLogo src={activeClub?.logoUrl || activeClub?.logo} alt={clubeName || ""} className="w-[94%] h-[94%] object-contain" />
            </div>

            <div className={teamStyle.text}>
              <h1 className="font-black uppercase italic tracking-tighter leading-none text-3xl md:text-5xl drop-shadow-lg mb-2">{profile.nome_exibicao}</h1>
              <div className="flex flex-col gap-1 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60 italic">
                <span className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {profile.cidade}, {profile.estado}</span>
                <span className="flex items-center gap-2 text-[#ff6200]"><Trophy className="w-3 h-3" /> Embaixador Bronze</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <NewsCarousel teamName={queriedTeam?.name || clubeName || null} clubLogo={activeClub?.logoUrl || activeClub?.logo} />
        </div>
      </main>
    </div>
  );
};
export default Dashboard;