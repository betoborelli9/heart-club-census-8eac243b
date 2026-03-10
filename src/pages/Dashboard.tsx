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
    // Força a detecção do objeto ou string
    const name = club?.nome || club;
    if (!name) return;

    const clubInfo = CLUBS_DATA.find(c => c.nome.toLowerCase() === name.toLowerCase()) || 
                    CLUBS_DATA.find(c => c.nome.toLowerCase().includes(name.toLowerCase()));
    
    if (clubInfo) {
      setActiveTeam(clubInfo.nome);
      setTeamLogo(clubInfo.logoUrl);
      
      const n = clubInfo.nome.toLowerCase();
      // Mapeamento de Cores para teste real
      if (n.includes("vila nova") || n.includes("flamengo") || n.includes("são paulo")) {
        setColors({ primary: "#E21A21", secondary: "#FFFFFF" });
      } else if (n.includes("palmeiras") || n.includes("goiás") || n.includes("coritiba")) {
        setColors({ primary: "#006437", secondary: "#FFFFFF" });
      } else if (n.includes("corinthians") || n.includes("santos")) {
        setColors({ primary: "#111111", secondary: "#FFFFFF" });
      } else if (n.includes("cruzeiro") || n.includes("gremio")) {
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
      {/* Header - Logo Heart Club Aumentada */}
      <header className="h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-14 w-auto object-contain transition-transform hover:scale-105" />
            <span className="font-black italic text-2xl tracking-tighter hidden lg:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm">
            {/* O segredo do clique está no onSelect do ClubSearch */}
            <ClubSearch onSelect={(club) => {
                console.log("Clube Selecionado:", club);
                updateDashboardTeam(club);
            }} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Banner com Logo do Clube Gigante */}
        <section 
          className="relative overflow-hidden rounded-t-3xl border-t border-x border-white/10 transition-all duration-700" 
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}CC 100%)` }}
        >
          <div className="absolute top-0 right-0 w-64 h-full pointer-events-none overflow-hidden opacity-25">
            <div className="absolute top-0 right-12 w-14 h-[200%] bg-white/20 rotate-[25deg] transform origin-top" />
            <div className="absolute top-0 right-28 w-3 h-[200%] bg-white/40 rotate-[25deg] transform origin-top" />
          </div>

          <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-10">
              {/* Círculo com Logo quase do mesmo tamanho */}
              <div 
                className="w-28 h-28 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.4)] shrink-0 transition-all duration-500"
                style={{ backgroundColor: colors.secondary }}
              >
                <div className="w-[85%] h-[85%] flex items-center justify-center overflow-hidden">
                  <ClubLogo src={teamLogo} alt={activeTeam} size="lg" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="text-left">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white drop-shadow-lg leading-none mb-2">
                  {profile.nome_exibicao}
                </h1>
                <div className="flex items-center gap-3 text-white/90 font-bold uppercase text-[11px] tracking-[0.2em]">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.cidade}</span>
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                  <span className="flex items-center gap-1 text-yellow-300"><Trophy className="w-4 h-4" /> Embaixador Bronze</span>
                </div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/60 mb-1">Clube do Coração</p>
              <h2 className="text-6xl font-black italic uppercase leading-none text-white drop-shadow-2xl">
                {activeTeam}
              </h2>
            </div>
          </div>
        </section>

        {/* Barra de Navegação Vitrificada Premium */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-3xl overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
          <div className="relative px-12 py-5 flex items-center gap-12 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Mapa Nacional
            </Link>
            <Link to="#" className="flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Users className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Ranking Geral
            </Link>
            <Link to="#" className="flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all group">
              <Gift className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: colors.primary }} /> 
              Benefícios
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
          <div className="lg:col-span-8">
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