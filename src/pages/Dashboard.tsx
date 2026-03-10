// Path: src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Globe, Users, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import CensusDuel from "@/components/dashboard/CensusDuel";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, signOut } = useUser();
  const [activeTeam, setActiveTeam] = useState<string>("Vila Nova");
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const [colors, setColors] = useState({ primary: "#E21A21", secondary: "#FFFFFF" });

  const updateDashboardTeam = (teamName: string) => {
    setActiveTeam(teamName);
    const club = CLUBS_DATA.find(c => c.nome === teamName);
    if (club) {
      setTeamLogo(club.logoUrl);
      // Lógica de cores (ex: SPFC teria vermelho/preto, Vila vermelho/branco)
      if (teamName.includes("São Paulo")) setColors({ primary: "#FF0000", secondary: "#000000" });
      else if (teamName.includes("Palmeiras")) setColors({ primary: "#006437", secondary: "#FFFFFF" });
      else if (teamName.includes("Goiás")) setColors({ primary: "#006437", secondary: "#FFFFFF" });
      else setColors({ primary: club.cor_principal || "#E21A21", secondary: "#FFFFFF" });
    }
  };

  useEffect(() => {
    const loadInitialTeam = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      if (data?.clube_nome) updateDashboardTeam(data.clube_nome);
      else updateDashboardTeam("Vila Nova");
    };
    loadInitialTeam();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      <header className="h-16 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Heart Club" className="h-7" />
            <span className="font-black italic tracking-tighter text-xl hidden md:block">HEART CLUB</span>
          </div>
          
          <div className="flex-1 max-w-md">
            <ClubSearch onSelect={(club) => updateDashboardTeam(club.nome)} />
          </div>

          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Banner com Faixas Diagonais Elegantes */}
        <section className="relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 mb-8">
          {/* FAIXAS DIAGONAIS NO CANTO DIREITO */}
          <div className="absolute top-0 right-0 w-64 h-full overflow-hidden pointer-events-none opacity-20">
             <div className="absolute top-[-50%] right-[-20%] w-16 h-[200%] rotate-[25deg]" style={{ backgroundColor: colors.primary }} />
             <div className="absolute top-[-50%] right-[10%] w-4 h-[200%] rotate-[25deg]" style={{ backgroundColor: colors.secondary }} />
             <div className="absolute top-[-50%] right-[25%] w-2 h-[200%] rotate-[25deg]" style={{ backgroundColor: colors.primary }} />
          </div>

          <CardContent className="p-10 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-8">
                <div className="relative">
                  <div className="absolute inset-0 blur-3xl opacity-30 animate-pulse rounded-full" style={{ backgroundColor: colors.primary }} />
                  <div className="relative w-28 h-28 bg-black rounded-full p-4 border-2 border-white/5 shadow-2xl">
                    <ClubLogo src={teamLogo} alt={activeTeam} size="lg" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">{profile.nome_exibicao}</h1>
                  <div className="flex items-center gap-4 text-zinc-500 font-bold uppercase text-[11px] tracking-[0.2em]">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.cidade || "Goiânia"}</span>
                    <span className="flex items-center gap-1 text-yellow-500"><Trophy className="w-3 h-3" /> Embaixador Bronze</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center md:text-right border-l md:border-l-0 md:border-r border-white/10 md:pr-10 md:mr-4">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-2">Clube de Fé</p>
                <h2 className="text-5xl font-black italic uppercase leading-none" style={{ color: colors.primary }}>{activeTeam}</h2>
              </div>
            </div>
          </CardContent>

          {/* LINHA FINA DE NAVEGAÇÃO INTEGRADA */}
          <div className="border-t border-white/5 px-10 py-4 bg-black/20 flex items-center gap-8 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all hover:translate-x-1">
              <Globe className="w-3 h-3" style={{ color: colors.primary }} /> Mapa Nacional
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all hover:translate-x-1">
              <Users className="w-3 h-3" style={{ color: colors.primary }} /> Ranking Geral
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all hover:translate-x-1">
              <Gift className="w-3 h-3" style={{ color: colors.primary }} /> Benefícios
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <NewsCarousel />
          </div>
          <div className="lg:col-span-4 space-y-8">
            <CensusDuel />
            <div className="p-6 rounded-3xl bg-zinc-900/20 border border-white/5">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Engajamento da Torcida</p>
                <span className="text-2xl font-black italic" style={{ color: colors.primary }}>64%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-1000" style={{ width: "64%", backgroundColor: colors.primary }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;