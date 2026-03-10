// Path: src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Globe, Users, Gift } from "lucide-react";
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
  
  // Estado de Cores Dinâmico
  const [colors, setColors] = useState({ 
    primary: "#E21A21", 
    secondary: "#FFFFFF", 
    text: "#FFFFFF" 
  });

  const updateDashboardTeam = (teamName: string) => {
    const club = CLUBS_DATA.find(c => c.nome.toLowerCase() === teamName.toLowerCase()) || 
                 CLUBS_DATA.find(c => c.nome.toLowerCase().includes(teamName.toLowerCase()));
    
    if (club) {
      setActiveTeam(club.nome);
      setTeamLogo(club.logoUrl);
      
      // Lógica de Cores por Clube (Primária / Secundária)
      const name = club.nome.toLowerCase();
      if (name.includes("vila nova") || name.includes("flamengo") || name.includes("são paulo")) {
        setColors({ primary: "#E21A21", secondary: "#FFFFFF", text: "#FFFFFF" });
      } else if (name.includes("palmeiras") || name.includes("goiás") || name.includes("coritiba")) {
        setColors({ primary: "#006437", secondary: "#FFFFFF", text: "#FFFFFF" });
      } else if (name.includes("corinthians") || name.includes("botafogo") || name.includes("santos")) {
        setColors({ primary: "#111111", secondary: "#FFFFFF", text: "#FFFFFF" });
      } else if (name.includes("cruzeiro") || name.includes("gremio") || name.includes("bahia")) {
        setColors({ primary: "#005BA3", secondary: "#FFFFFF", text: "#FFFFFF" });
      } else {
        setColors({ primary: club.cor_principal || "#E21A21", secondary: "#FFFFFF", text: "#FFFFFF" });
      }
    }
  };

  useEffect(() => {
    const loadInitialTeam = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      updateDashboardTeam(data?.clube_nome || "Vila Nova");
    };
    loadInitialTeam();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500">
      {/* Header Fixo */}
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
        {/* BANNER PRINCIPAL COM CORES DO CLUBE */}
        <section 
          className="relative overflow-hidden rounded-t-2xl border-t border-x border-white/10" 
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}CC 100%)` }}
        >
          {/* Faixas de Gala Diagonais */}
          <div className="absolute top-0 right-0 w-64 h-full pointer-events-none overflow-hidden opacity-30">
            <div className="absolute top-0 right-10 w-12 h-[200%] bg-white/20 rotate-[25deg] transform origin-top" />
            <div className="absolute top-0 right-20 w-3 h-[200%] bg-white/40 rotate-[25deg] transform origin-top" />
          </div>

          <div className="relative z-10 p-7 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Círculo na Cor Secundária (Ex: Branco para o Vila) */}
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center p-3 shadow-2xl shrink-0 transition-all duration-500"
                style={{ backgroundColor: colors.secondary }}
              >
                <ClubLogo src={teamLogo} alt={activeTeam} size="lg" className="w-full h-full object-contain" />
              </div>
              
              <div className="text-left">
                <h1 className="text-2xl font-black uppercase italic tracking-tighter drop-shadow-md text-white">
                  {profile.nome_exibicao}
                </h1>
                <div className="flex items-center gap-3 text-white/80 font-bold uppercase text-[9px] tracking-[0.2em] mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.cidade}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-400" /> Embaixador Bronze</span>
                </div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-1">Clube do Coração</p>
              <h2 className="text-4xl font-black italic uppercase leading-none text-white drop-shadow-xl">
                {activeTeam}
              </h2>
            </div>
          </div>
        </section>

        {/* BARRA DE LINKS VITRIFICADA (GLASSMORPHISM) */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[#0a0a0a]/60 backdrop-blur-md" />
          <div className="relative px-8 py-3.5 flex items-center gap-8 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Globe className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Mapa Nacional
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Users className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Ranking Geral
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Gift className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Benefícios
            </Link>
          </div>
        </section>

        {/* Grid de Conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-8 space-y-10">
            <NewsCarousel />
          </div>
          <div className="lg:col-span-4 space-y-10">
            <CensusDuel />
            <AmbassadorHierarchy />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;