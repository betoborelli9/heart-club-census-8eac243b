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
      <header className="h-16 md:h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4 shrink-0 cursor-pointer h-full py-2" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-10 md:h-14 w-auto object-contain" />
            <span className="font-black italic text-sm md:text-2xl tracking-tighter hidden sm:block text-white">HEART CLUB</span>
          </div>
          {/* Z-INDEX MASSIVO NA BUSCA PARA NÃO SUMIR */}
          <div className="flex-1 max-w-[200px] md:max-w-sm relative z- pointer-events-auto">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500 shrink-0"><LogOut className="w-5 h-5 md:w-6 md:h-6 text-white" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4">
        <section className="relative overflow-hidden rounded-t-3xl border border-white/10 h-[220px] sm:h-[250px] md:h-[320px] landscape:h-[200px]" style={{ backgroundColor: colors.primary }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-50%] right-[5%] w-[100px] md:w-[180px] h-[200%] bg-white opacity-40 rotate-[25deg] shadow-2xl transition-all" />
          </div>

          <div className="relative z-10 h-full px-4 md:px-12 flex items-center justify-between">
            <div className="flex items-center gap-5 md:gap-12 min-w-0 flex-1">
              {/* EMBLEMA SOBERANO: Gigante e responsivo */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-64 md:h-64 landscape:w-32 landscape:h-32 rounded-full flex items-center justify-center bg-white shadow-2xl border-4 border-black/10 overflow-hidden shrink-0">
                <div className="w-[98%] h-[98%] flex items-center justify-center">
                  <ClubLogo src={heartTeam?.logoUrl} alt={heartTeam?.nome} size="lg" className="w-full h-full object-contain p-1" />
                </div>
              </div>
              
              <div className="text-white min-w-0 flex-1">
                {/* NOME: Diminui a fonte dinamicamente e permite quebra */}
                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black uppercase italic tracking-tighter leading-none mb-3 drop-shadow-xl break-words">
                  {profile.nome_exibicao}
                </h1>
                <div className="flex flex-col gap-1 font-medium uppercase text-[10px] sm:text-xs md:text-base tracking-widest text-white/90">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 shrink-0" /> {profile.cidade}, {profile.estado}</span>
                  <span className="flex items-center gap-1.5 text-yellow-300 font-bold"><Trophy className="w-4 h-4 shrink-0" /> EMBAIXADOR BRONZE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-20 -mt-px border border-white/10 rounded-b-3xl overflow-hidden shadow-2xl bg-black/95">
          <div className="relative px-4 md:px-12 py-4 md:py-6 flex items-center justify-around md:justify-start gap-4 md:gap-12 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex flex-col md:flex-row items-center gap-2 text-[10px] md:text-[14px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <Flame className="w-6 h-6 text-red-600" /> Mapa de Calor
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-2 text-[10px] md:text-[14px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <BarChart3 className="w-6 h-6 text-red-600" /> ESTATÍSTICAS
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-2 text-[10px] md:text-[14px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <Medal className="w-6 h-6 text-red-600" /> RANKING
            </Link>
          </div>
        </section>

        {/* BARRA DO INTRUSO COM Z-INDEX REFORÇADO */}
        {queriedTeam && (
          <div className="mt-6 relative z- overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 p-5 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white rounded-full p-2 flex items-center justify-center"><ClubLogo src={queriedTeam.logo} alt={queriedTeam.name} size="sm" /></div>
              <div>
                <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500">Consultando:</span>
                <h3 className="text-3xl font-black italic uppercase text-white leading-none">{queriedTeam.name}</h3>
              </div>
            </div>
            <button onClick={() => setQueriedTeam(null)} className="text-red-500 text-[12px] font-black uppercase hover:underline">Fechar X</button>
          </div>
        )}

        <div className="mt-10"><NewsCarousel teamName={queriedTeam?.name || heartTeam?.nome || "Vila Nova"} /></div>
      </main>
    </div>
  );
};

export default Dashboard;