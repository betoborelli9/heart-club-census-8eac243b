# 1. Comando para atualizar o arquivo com o texto "Clube do Coração" e design refinado
cat << 'EOF' > src/pages/Dashboard.tsx
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
import AmbassadorHierarchy from "@/components/dashboard/AmbassadorHierarchy";
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
      if (teamName.includes("São Paulo")) setColors({ primary: "#FF0000", secondary: "#000000" });
      else if (teamName.includes("Palmeiras") || teamName.includes("Goiás")) setColors({ primary: "#006437", secondary: "#FFFFFF" });
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500">
      <header className="h-14 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Heart Club" className="h-6" />
            <span className="font-black italic text-lg tracking-tighter">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm">
            <ClubSearch onSelect={(club) => updateDashboardTeam(club.nome)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 mb-8" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, #8b1115 100%)` }}>
          <div className="absolute top-0 right-0 w-48 h-full pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-8 w-10 h-[200%] bg-white/10 rotate-[25deg] transform origin-top" />
            <div className="absolute top-0 right-14 w-2 h-[200%] bg-white/20 rotate-[25deg] transform origin-top" />
          </div>

          <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center p-3 border-2 border-white/20 shadow-2xl shrink-0">
                <ClubLogo src={teamLogo} alt={activeTeam} size="lg" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white drop-shadow-md">
                  {profile.nome_exibicao}
                </h1>
                <div className="flex items-center gap-3 text-white/70 font-bold uppercase text-[9px] tracking-[0.2em] mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.cidade}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-400" /> Embaixador Bronze</span>
                </div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 mb-1">Clube do Coração</p>
              <h2 className="text-4xl font-black italic uppercase leading-none text-white drop-shadow-lg">
                {activeTeam}
              </h2>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 px-6 py-3 flex items-center gap-6 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-all">
              <Globe className="w-3 h-3" /> Mapa Nacional
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-all">
              <Users className="w-3 h-3" /> Ranking Geral
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-all">
              <Gift className="w-3 h-3" /> Benefícios
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <NewsCarousel />
          </div>
          <div className="lg:col-span-4 space-y-8">
            <CensusDuel />
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em]">Engajamento Global</p>
                <span className="text-xl font-black italic" style={{ color: colors.primary }}>64%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: "64%", backgroundColor: colors.primary }} />
              </div>
            </div>
            <AmbassadorHierarchy />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
