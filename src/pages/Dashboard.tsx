// Path: src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [heartTeam, setHeartTeam] = useState<any>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);
  const [colors, setColors] = useState({ primary: "#E21A21", secondary: "#FFFFFF" });

  useEffect(() => {
    const loadInitial = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      const teamName = data?.clube_nome || "Vila Nova";
      const clubInfo = CLUBS_DATA.find(c => c.nome === teamName);
      setHeartTeam(clubInfo);
      
      if (teamName.includes("Vila Nova")) setColors({ primary: "#E21A21", secondary: "#FFFFFF" });
      else if (teamName.includes("Flamengo")) setColors({ primary: "#E21A21", secondary: "#000000" });
      else if (teamName.includes("Palmeiras")) setColors({ primary: "#006437", secondary: "#FFFFFF" });
      else setColors({ primary: clubInfo?.cor_principal || "#E21A21", secondary: "#FFFFFF" });
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-red-600">
      <header className="h-16 md:h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4 shrink-0 cursor-pointer h-full py-2" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-10 md:h-14 w-auto object-contain" />
            <span className="font-black italic text-sm md:text-2xl tracking-tighter hidden sm:block text-white">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-[200px] md:max-w-sm relative z-">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500 shrink-0"><LogOut className="w-5 h-5 md:w-6 md:h-6 text-white" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4">
        {/* BANNER PRINCIPAL - DESIGN UNIFICADO E BLINDADO */}
        <section className="relative overflow-hidden rounded-t-3xl border border-white/10 h-[200px] sm:h-[220px] md:h-[280px] landscape:h-[180px]" style={{ backgroundColor: colors.primary }}>
          {/* FAIXAS COM OPACIDADE GRADUAL */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-50%] right-[5%] w-[80px] md:w-[150px] h-[200%] bg-white opacity-40 rotate-[25deg] shadow-2xl transition-all" />
            <div className="absolute top-[-50%] right-[15%] w-[20px] md:w-[40px] h-[200%] bg-white opacity-20 rotate-[25deg] transition-all" />
            <div className="absolute top-[-50%] right-[20%] w-[8px] md:w-[15px] h-[200%] bg-white opacity-10 rotate-[25deg] transition-all" />
          </div>

          <div className="relative z-10 h-full px-4 md:px-12 flex items-center justify-between">
            <div className="flex items-center gap-5 md:gap-12 min-w-0 flex-1">
              {/* EMBLEMA GIGANTE - AUMENTADO E PREENCHIMENTO 98% */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-56 md:h-56 landscape:w-28 landscape:h-28 rounded-full flex items-center justify-center bg-white shadow-2xl border-4 border-black/10 overflow-hidden shrink-0 transition-all">
                <div className="w-[98%] h-[98%] flex items-center justify-center">
                  <ClubLogo src={heartTeam?.logoUrl} alt={heartTeam?.nome} size="lg" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="text-white min-w-0 flex-1">
                {/* NOME RESPONSIVO: Sem truncate, com quebra de linha e tamanhos ajustados */}
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-3 drop-shadow-xl text-wrap break-words">
                  {profile.nome_exibicao}
                </h1>
                <div className="flex flex-col gap-1.5 font-medium uppercase text-[10px] sm:text-xs md:text-sm tracking-widest text-white/90">
                  <span className="flex items-center gap-1.5 text-wrap break-words">
                    <MapPin className="w-4 h-4 shrink-0" /> {profile.cidade || "CIDADE"}, {profile.estado || "UF"} • Mascote: {heartTeam?.mascote || "MASCOTE"}
                  </span>
                  <span className="flex items-center gap-1.5 text-yellow-300 font-bold">
                    <Trophy className="w-4 h-4 shrink-0" /> EMBAIXADOR BRONZE
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right hidden lg:block pr-6 shrink-0">
              <p className="text-[14px] font-black uppercase tracking-[0.6em] text-white/60 mb-1">Clube do Coração</p>
              <h2 className="text-6xl md:text-8xl font-black italic uppercase leading-none drop-shadow-2xl">{heartTeam?.nome || "CLUBE"}</h2>
            </div>
          </div>
        </section>

        {/* BARRA DE LINKS ESTRATÉGICOS */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-3xl overflow-hidden shadow-2xl bg-black/95">
          <div className="relative px-4 md:px-12 py-4 md:py-6 flex items-center justify-around md:justify-start gap-4 md:gap-12 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[10px] md:text-[14px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <Flame className="w-6 h-6 text-red-600" /> Mapa de Calor
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[10px] md:text-[14px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <BarChart3 className="w-6 h-6 text-red-600" /> ESTATÍSTICAS
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[10px] md:text-[14px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <Medal className="w-6 h-6 text-red-600" /> RANKING
            </Link>
          </div>
        </section>

        {/* BARRA DO INTRUSO */}
        {queriedTeam && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 p-5 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white rounded-full p-2 flex items-center justify-center">
                 <ClubLogo src={queriedTeam.logo} alt={queriedTeam.name} size="sm" />
              </div>
              <div>
                <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500">Consultando:</span>
                <h3 className="text-3xl font-black italic uppercase text-white leading-none text-wrap break-words">
                  {queriedTeam.name} <span className="text-[12px] text-zinc-600 not-italic ml-2 uppercase font-medium">{queriedTeam.location} • {queriedTeam.mascote}</span>
                </h3>
              </div>
            </div>
            <button onClick={() => setQueriedTeam(null)} className="text-red-500 text-[12px] font-black uppercase hover:underline">Fechar X</button>
          </div>
        )}

        {/* RADAR DE NOTÍCIAS REAL-TIME */}
        <div className="mt-10">
          <NewsCarousel teamName={queriedTeam?.name || heartTeam?.nome || "Vila Nova"} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;