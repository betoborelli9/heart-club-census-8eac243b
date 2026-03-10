// Path: src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Globe, Users, Gift, Search } from "lucide-react";
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
  
  // Time do Coração (Fixo no topo)
  const [heartTeam, setHeartTeam] = useState<string>("Vila Nova");
  const [heartLogo, setHeartLogo] = useState<string | null>(null);
  
  // Time de Consulta (O "Intruso")
  const [queriedTeam, setQueriedTeam] = useState<string | null>(null);
  const [queriedColors, setQueriedColors] = useState({ primary: "#E21A21" });

  const updateDashboardTeam = (clubData: any) => {
    const name = clubData?.nome || clubData;
    if (!name) return;
    const clubInfo = CLUBS_DATA.find(c => c.nome.toLowerCase() === name.toLowerCase()) || 
                    CLUBS_DATA.find(c => c.nome.toLowerCase().includes(name.toLowerCase()));
    
    if (clubInfo) {
      setQueriedTeam(clubInfo.nome);
      setQueriedColors({ primary: clubInfo.cor_principal || "#E21A21" });
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      const team = data?.clube_nome || "Vila Nova";
      setHeartTeam(team);
      setHeartLogo(CLUBS_DATA.find(c => c.nome === team)?.logoUrl || null);
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      {/* Header com Logo HEART CLUB GIGANTE */}
      <header className="h-20 border-b border-white/5 bg-black/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0 cursor-pointer h-full py-1" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-full w-auto object-contain scale-125" />
            <span className="font-black italic text-2xl tracking-tighter hidden xl:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm relative z-[70]">
            <ClubSearch onSelect={(club) => updateDashboardTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* BARRA DO TIME DO CORAÇÃO (INTOCÁVEL) */}
        <section className="relative overflow-hidden rounded-t-3xl border-t border-x border-white/10 bg-[#E21A21]">
          <div className="relative z-10 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-white shadow-2xl shrink-0 overflow-hidden">
                <div className="w-[98%] h-[98%] flex items-center justify-center">
                  <ClubLogo src={heartLogo} alt={heartTeam} size="lg" className="w-full h-full object-contain" />
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
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50 mb-0">Time do Coração</p>
              <h2 className="text-4xl font-black italic uppercase leading-none text-white">{heartTeam}</h2>
            </div>
          </div>
        </section>

        {/* BARRA DE LINKS VITRIFICADA */}
        <section className="relative z-20 -mt-px border border-white/10 bg-black/90 backdrop-blur-3xl px-10 py-3 flex items-center gap-8 overflow-x-auto no-scrollbar">
          <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
            <Globe className="w-4 h-4 text-[#E21A21]" /> Mapa Nacional
          </Link>
          <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
            <Users className="w-4 h-4 text-[#E21A21]" /> Ranking Geral
          </Link>
          <Link to="#" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
            <Gift className="w-4 h-4 text-[#E21A21]" /> Benefícios
          </Link>
        </section>

        {/* BARRA DE INTRUSO (CLUBE EM FOCO) - FINA E ELEGANTE */}
        {queriedTeam && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 relative">
            <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: queriedColors.primary }} />
            <div className="px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Consultando:</span>
                <span className="text-xs font-black italic uppercase text-white" style={{ color: queriedColors.primary }}>{queriedTeam}</span>
              </div>
              <div className="h-4 w-px bg-white/5" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Acompanhando Radar em tempo real</span>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-6">
          <div className="lg:col-span-8">
            <NewsCarousel teamName={queriedTeam || heartTeam} />
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