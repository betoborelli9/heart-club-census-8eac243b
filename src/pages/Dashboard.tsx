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
  const [colors, setColors] = useState({ primary: "#E21A21", secondary: "#FFFFFF" });

  const updateDashboardTeam = (clubData: any) => {
    const name = clubData?.nome || clubData;
    if (!name) return;
    const clubInfo = CLUBS_DATA.find(c => c.nome.toLowerCase() === name.toLowerCase()) || 
                    CLUBS_DATA.find(c => c.nome.toLowerCase().includes(name.toLowerCase()));
    if (clubInfo) {
      setActiveTeam(clubInfo.nome);
      setTeamLogo(clubInfo.logoUrl);
      const n = clubInfo.nome.toLowerCase();
      if (n.includes("vila nova") || n.includes("flamengo") || n.includes("são paulo")) {
        setColors({ primary: "#E21A21", secondary: "#FFFFFF" });
      } else if (n.includes("palmeiras") || n.includes("goiás")) {
        setColors({ primary: "#006437", secondary: "#FFFFFF" });
      } else if (n.includes("corinthians") || n.includes("santos")) {
        setColors({ primary: "#111111", secondary: "#FFFFFF" });
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
      {/* Header com Logo HEART CLUB Imponente */}
      <header className="h-20 border-b border-white/5 bg-black/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-12 w-auto object-contain" />
            <span className="font-black italic text-2xl tracking-tighter hidden xl:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm relative z-[70]">
            <ClubSearch onSelect={(club) => updateDashboardTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Banner SLIM - Altura reduzida para elegância */}
        <section 
          className="relative overflow-hidden rounded-t-3xl border-t border-x border-white/10 transition-all duration-700" 
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}EE 100%)` }}
        >
          {/* Faixas Diagonais Sutis */}
          <div className="absolute top-0 right-0 w-64 h-full pointer-events-none overflow-hidden opacity-20">
            <div className="absolute top-0 right-10 w-12 h-[200%] bg-white/20 rotate-[25deg] transform origin-top" />
          </div>

          <div className="relative z-10 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              {/* Círculo Branco com ESCUDO GIGANTE (Quase encostando na borda) */}
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl shrink-0 border border-black/5"
                style={{ backgroundColor: colors.secondary }}
              >
                <div className="w-[96%] h-[96%] flex items-center justify-center p-0.5">
                  <ClubLogo src={teamLogo} alt={activeTeam} size="lg" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="text-left">
                <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{profile.nome_exibicao}</h1>
                <div className="flex items-center gap-2 text-white/80 font-bold uppercase text-[9px] tracking-[0.2em] mt-1">
                  <MapPin className="w-3 h-3" /> {profile.cidade}
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <Trophy className="w-3 h-3 text-yellow-300" /> Bronze
                </div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50 mb-0">Clube do Coração</p>
              <h2 className="text-4xl font-black italic uppercase leading-none text-white drop-shadow-xl">{activeTeam}</h2>
            </div>
          </div>
        </section>

        {/* Barra de Links Vitrificada FINA */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-3xl overflow-hidden">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
          <div className="relative px-10 py-3 flex items-center gap-8 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Globe className="w-4 h-4" style={{ color: colors.primary }} /> Mapa Nacional
            </Link>
            <Link to="#" className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Users className="w-4 h-4" style={{ color: colors.primary }} /> Ranking Geral
            </Link>
            <Link to="#" className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Gift className="w-4 h-4" style={{ color: colors.primary }} /> Benefícios
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-10">
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