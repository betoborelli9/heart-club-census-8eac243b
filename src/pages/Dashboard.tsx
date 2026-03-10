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
  const [heartTeam, setHeartTeam] = useState<any>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);

  // Cores dinâmicas para a barra do coração (Respeitando Vila ou rivais)
  const [heartColors, setHeartColors] = useState({ primary: "#E21A21", secondary: "#FFFFFF" });

  useEffect(() => {
    const loadInitial = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      const teamName = data?.clube_nome || "Vila Nova";
      const clubInfo = CLUBS_DATA.find(c => c.nome === teamName);
      setHeartTeam(clubInfo);

      // Definição de cores: Vila Nova (Vermelho/Branco), Flamengo (Vermelho/Preto), etc.
      if (teamName.includes("Vila Nova")) setHeartColors({ primary: "#E21A21", secondary: "#FFFFFF" });
      else if (teamName.includes("Flamengo")) setHeartColors({ primary: "#E21A21", secondary: "#000000" });
      else if (teamName.includes("Palmeiras")) setHeartColors({ primary: "#006437", secondary: "#FFFFFF" });
      else setHeartColors({ primary: clubInfo?.cor_principal || "#E21A21", secondary: "#FFFFFF" });
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-red-600">
      <header className="h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0 cursor-pointer h-full py-1" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-full w-auto object-contain scale-125" />
            <span className="font-black italic text-2xl tracking-tighter hidden xl:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm relative z-[70]">
            {/* ClubSearch já corrigido com onMouseDown para clique imediato */}
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* BARRA DO CORAÇÃO - IDENTIDADE VISUAL MÁXIMA (VILA NOVA NO TRONO) */}
        <section 
          className="relative overflow-hidden rounded-t-3xl border-t border-x border-white/10" 
          style={{ backgroundColor: heartColors.primary }}
        >
          {/* FAIXAS DIAGONAIS SÓLIDAS ESTILO CAMISA (Respeitando a imagem 5f96b4) */}
          <div className="absolute top-0 right-0 w-72 h-full pointer-events-none overflow-hidden opacity-30">
            <div className="absolute top-[-20%] right-[15%] w-16 h-[150%] rotate-[25deg] transform origin-top shadow-2xl" style={{ backgroundColor: heartColors.secondary }} />
            <div className="absolute top-[-20%] right-[35%] w-4 h-[150%] rotate-[25deg] transform origin-top shadow-2xl" style={{ backgroundColor: heartColors.secondary }} />
          </div>

          <div className="relative z-10 px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              {/* Círculo do emblema na cor secundária (Branco para o Vila) - Emblema GIGANTE */}
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.3)] shrink-0 border-2 border-white/10"
                style={{ backgroundColor: heartColors.secondary }}
              >
                <div className="w-[96%] h-[96%] flex items-center justify-center">
                  <ClubLogo src={heartTeam?.logoUrl} alt={heartTeam?.nome} size="lg" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="text-left text-white">
                <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-2 drop-shadow-md">{profile.nome_exibicao}</h1>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 drop-shadow-sm">
                    <MapPin className="w-3.5 h-3.5" /> {profile.cidade || "GOIÂNIA"}, GO, BRASIL • 🐾 {heartTeam?.mascote || "TIGRE"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 text-yellow-400 drop-shadow-md">
                    <Trophy className="w-3.5 h-3.5" /> EMBAIXADOR BRONZE
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center md:text-right text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.6em] opacity-70 mb-0 uppercase">Clube do Coração</p>
              <h2 className="text-5xl font-black italic uppercase leading-none drop-shadow-2xl">{heartTeam?.nome || "VILA NOVA"}</h2>
            </div>
          </div>
        </section>

        {/* BARRA DE LINKS VITRIFICADA */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-3xl overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
          <div className="relative px-12 py-4 flex items-center gap-10 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Globe className="w-4.5 h-4.5" style={{ color: heartColors.primary }} /> Mapa Nacional
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Users className="w-4.5 h-4.5" style={{ color: heartColors.primary }} /> Ranking Geral
            </Link>
            <Link to="#" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Gift className="w-4.5 h-4.5" style={{ color: heartColors.primary }} /> Benefícios
            </Link>
          </div>
        </section>

        {/* BARRA DO INTRUSO (Aparece sob consulta e muda as notícias) */}
        {queriedTeam && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 p-5 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-full p-2 flex items-center justify-center shadow-lg">
                 <ClubLogo src={queriedTeam.logo} alt={queriedTeam.name} size="sm" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Consultando Radar:</span>
                <h3 className="text-2xl font-black italic uppercase text-white leading-none">
                  {queriedTeam.name} <span className="text-[10px] text-zinc-600 not-italic ml-2 uppercase">{queriedTeam.location} • {queriedTeam.mascote}</span>
                </h3>
              </div>
            </div>
            <button 
              onClick={() => setQueriedTeam(null)} 
              className="bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black px-4 py-2 rounded-full transition-all uppercase tracking-widest"
            >
              Fechar X
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-10">
          <div className="lg:col-span-8">
            {/* O RADAR RESPONDE AO INTRUSO OU AO CORAÇÃO */}
            <NewsCarousel teamName={queriedTeam?.name || heartTeam?.nome || "Vila Nova"} />
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