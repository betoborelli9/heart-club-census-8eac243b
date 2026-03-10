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
      else setColors({ primary: clubInfo?.cor_principal || "#E21A21", secondary: "#FFFFFF" });
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-red-600">
      <header className="h-16 md:h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4 shrink-0 cursor-pointer h-full py-2" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-10 md:h-14 w-auto object-contain" />
            <span className="font-black italic text-sm md:text-2xl tracking-tighter hidden sm:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-[200px] md:max-w-sm relative z-[70]">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500 shrink-0"><LogOut className="w-5 h-5 md:w-6 md:h-6" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4">
        {/* BANNER PRINCIPAL COM 3 FAIXAS E EMBLEMA GIGANTE */}
        <section className="relative overflow-hidden rounded-t-2xl md:rounded-t-3xl border border-white/10" style={{ backgroundColor: colors.primary }}>
          
          {/* 3 FAIXAS DIAGONAIS - OPACIDADE 30% */}
          <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden opacity-30">
            <div className="absolute top-[-20%] right-[12%] w-14 md:w-24 h-[150%] rotate-[25deg] transform origin-top shadow-2xl" style={{ backgroundColor: colors.secondary }} />
            <div className="absolute top-[-20%] right-[28%] w-3 md:w-6 h-[150%] rotate-[25deg] transform origin-top shadow-2xl" style={{ backgroundColor: colors.secondary }} />
            <div className="absolute top-[-20%] right-[36%] w-1 md:w-2 h-[150%] rotate-[25deg] transform origin-top shadow-2xl" style={{ backgroundColor: colors.secondary }} />
          </div>

          <div className="relative z-10 p-4 md:p-10 flex flex-col md:flex-row items-center md:justify-between gap-4 md:gap-10">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 text-center md:text-left w-full md:w-auto">
              {/* Círculo do emblema GIGANTE (Escudo ocupa quase tudo) */}
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center shadow-2xl shrink-0 border-2 border-black/10 overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                <div className="w-[96%] h-[96%] flex items-center justify-center">
                  <ClubLogo src={heartTeam?.logoUrl} alt={heartTeam?.nome} size="lg" className="w-full h-full object-contain" />
                </div>
              </div>
              
              <div className="text-white">
                <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-3 drop-shadow-xl">{profile.nome_exibicao}</h1>
                <div className="flex flex-col gap-1.5 font-medium uppercase text-[10px] md:text-[11px] tracking-widest text-white/90 drop-shadow-lg">
                  <span className="flex items-center justify-center md:justify-start gap-1.5"><MapPin className="w-4 h-4" /> {profile.cidade || "GOIÂNIA"}, GO, BRASIL • Mascote: {heartTeam?.mascote || "TIGRÃO"}</span>
                  <span className="flex items-center justify-center md:justify-start gap-1.5 text-yellow-300"><Trophy className="w-4 h-4" /> EMBAIXADOR BRONZE</span>
                </div>
              </div>
            </div>

            <div className="text-center md:text-right text-white mt-4 md:mt-0 w-full md:w-auto">
              <p className="text-[12px] md:text-[14px] font-black uppercase tracking-[0.6em] text-white/60 mb-1">Clube do Coração</p>
              <h2 className="text-5xl md:text-7xl font-black italic uppercase leading-none drop-shadow-2xl">{heartTeam?.nome || "VILA NOVA"}</h2>
            </div>
          </div>
        </section>

        {/* BARRA DE LINKS VITRIFICADA */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-2xl md:rounded-b-3xl overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
          <div className="relative px-4 md:px-12 py-4 md:py-6 flex items-center justify-between md:justify-start gap-2 md:gap-12 text-center">
            <Link to="#" className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[9px] md:text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Flame className="w-5 h-5 text-red-600" /> Mapa de Calor
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[9px] md:text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <BarChart3 className="w-5 h-5 text-red-600" /> Estatísticas do seu time
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[9px] md:text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
              <Medal className="w-5 h-5 text-red-600" /> Ranking de Embaixadores
            </Link>
          </div>
        </section>

        {/* BARRA DO INTRUSO (MANTIDA) */}
        {queriedTeam && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 p-5 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-full p-2 flex items-center justify-center shadow-lg">
                 <ClubLogo src={queriedTeam.logo} alt={queriedTeam.name} size="sm" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Consultando:</span>
                <h3 className="text-2xl font-black italic uppercase text-white leading-none">
                  {queriedTeam.name} <span className="text-[10px] text-zinc-600 not-italic ml-2 uppercase">{queriedTeam.location} • {queriedTeam.mascote}</span>
                </h3>
              </div>
            </div>
            <button onClick={() => setQueriedTeam(null)} className="text-red-500 text-[10px] font-black uppercase hover:underline">Fechar X</button>
          </div>
        )}

        {/* CONTAINER DE NOTÍCIAS */}
        <div className="mt-10">
          <NewsCarousel teamName={queriedTeam?.name || heartTeam?.nome || "Vila Nova"} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;