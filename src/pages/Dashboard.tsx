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
      setColors({ primary: clubInfo?.cor_principal || "#E21A21", secondary: "#FFFFFF" });
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-red-600">
      
      {/* MÓDULO 1: CABEÇALHO */}
      <header className="h-16 md:h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-10 md:h-14 w-auto object-contain" />
          </div>
          <div className="flex-1 max-w-sm relative z-">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        
        {/* MÓDULO 2: BANNER (EMBLEMA 100% E NOME AJUSTADO) */}
        <section className="relative overflow-hidden rounded-t-3xl border border-white/10 h-[220px] md:h-[280px]" style={{ backgroundColor: colors.primary }}>
          <div className="relative z-10 h-full px-6 md:px-12 flex items-center gap-6 md:gap-12">
            
            {/* EMBLEMA SEM RESPIRO (OCUPA O CÍRCULO TODO) */}
            <div className="w-32 h-32 md:w-52 md:h-52 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 border-4 border-black/10">
              <ClubLogo src={heartTeam?.logoUrl} alt={heartTeam?.nome} size="lg" className="w-full h-full object-contain scale-105" />
            </div>

            {/* INFORMAÇÕES (NOME COM TAMANHO CONTROLADO) */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-5xl font-black uppercase italic leading-none truncate drop-shadow-lg">
                {profile.nome_exibicao}
              </h1>
              <p className="text-xs md:text-sm mt-2 opacity-90 font-bold tracking-widest">
                <MapPin className="inline w-4 h-4 mr-1" /> {profile.cidade}, {profile.estado}
              </p>
            </div>
          </div>
        </section>

        {/* MÓDULO 3: LINKS */}
        <section className="bg-zinc-900/90 border border-white/10 rounded-b-3xl p-4 flex justify-around">
            <Link to="#" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2"><Flame className="w-5 h-5 text-red-600" /> MAPA DE CALOR</Link>
            <Link to="#" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-red-600" /> ESTATÍSTICAS</Link>
            <Link to="#" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2"><Medal className="w-5 h-5 text-red-600" /> RANKING</Link>
        </section>

        {/* MÓDULO 4: NOTÍCIAS */}
        <div className="mt-8">
          <NewsCarousel teamName={queriedTeam?.name || heartTeam?.nome || "Vila Nova"} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;