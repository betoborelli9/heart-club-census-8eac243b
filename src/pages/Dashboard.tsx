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
  const { user, profile, isLoading, signOut } = useUser();
  const [activeTeam, setActiveTeam] = useState<string>("Vila Nova");
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  
  const [colors, setColors] = useState({ 
    primary: "#E21A21", 
    secondary: "#FFFFFF"
  });

  const updateDashboardTeam = (club: any) => {
    if (!club) return;
    const name = club.nome || club;
    const clubInfo = CLUBS_DATA.find(c => c.nome.toLowerCase() === name.toLowerCase()) || 
                    CLUBS_DATA.find(c => c.nome.toLowerCase().includes(name.toLowerCase()));
    
    if (clubInfo) {
      setActiveTeam(clubInfo.nome);
      setTeamLogo(clubInfo.logoUrl);
      
      const n = clubInfo.nome.toLowerCase();
      if (n.includes("vila nova") || n.includes("flamengo") || n.includes("são paulo")) {
        setColors({ primary: "#E21A21", secondary: "#FFFFFF" });
      } else if (n.includes("palmeiras") || n.includes("goiás") || n.includes("coritiba")) {
        setColors({ primary: "#006437", secondary: "#FFFFFF" });
      } else if (n.includes("corinthians") || n.includes("santos") || n.includes("real madrid")) {
        setColors({ primary: "#111111", secondary: "#FFFFFF" });
      } else if (n.includes("cruzeiro") || n.includes("gremio") || n.includes("manchester city")) {
        setColors({ primary: "#005BA3", secondary: "#FFFFFF" });
      } else {
        setColors({ primary: clubInfo.cor_principal || "#E21A21", secondary: "#FFFFFF" });
      }
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      updateDashboardTeam(data?.clube_nome || "Vila Nova");
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      {/* Header com Logo Maior */}
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-10 w-auto object-contain" />
            <span className="font-black italic text-xl tracking-tighter hidden sm:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm">
            <ClubSearch onSelect={(club) => updateDashboardTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Banner com Identidade Visual Forte */}
        <section 
          className="relative overflow-hidden rounded-t-3xl border-t border-x border-white/10 transition-all duration-700" 
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}CC 100%)` }}
        >
          {/* Faixas Diagonais de Uniforme */}
          <div className="absolute top-0 right-0 w-64 h-full pointer-events-none overflow-hidden opacity-25">
            <div className="absolute top-0 right-12 w-14 h-[200%] bg-white/20 rotate-[25deg] transform origin-top" />
            <div className="absolute top-0 right-28 w-3 h-[200%] bg-white/40 rotate-[25deg] transform origin-top" />
          </div>

          <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              {/* Círculo Secundário com Escudo Centralizado */}
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center p-4 shadow-[0_0_30px_rgba(0,0,0,0.3)] shrink-0 transition-colors duration-500"
                style={{ backgroundColor: colors.secondary }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <ClubLogo src={teamLogo} alt={activeTeam} size="lg" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              
              <div className="text-left">
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-md">
                  {profile.nome_exibicao}
                </h1>
                <div className="flex items-center gap-3 text-white/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.cidade}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  <span className="flex items-center gap-1 text-yellow-300"><Trophy className="w-3.5 h-3.5" /> Embaixador Bronze</span>
                </div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/60 mb-1">Clube do Coração</p>
              <h2 className="text-5xl font-black italic uppercase leading-none text-white drop-shadow-2xl">
                {activeTeam}
              </h2>
            </div>
          </div>
        </section>

        {/* Barra de Navegação Vitrificada */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-3xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[#080808]/85 backdrop-blur-2xl" />
          <div className="relative px-10 py-4 flex items-center gap-10 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Globe className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Mapa Nacional
            </Link>
            <Link to="#" className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Users className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Ranking Geral
            </Link>
            <Link to="#" className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Gift className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Benefícios
            </Link>
          </div>
        </section>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
          <div className="lg:col-span-8 space-y-12">
            <NewsCarousel />
          </div>
          <div className="lg:col-span-4 space-y-12">
            <CensusDuel />
            <AmbassadorHierarchy />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;