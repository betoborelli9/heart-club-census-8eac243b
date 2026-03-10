// Path: src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { LogOut, Loader2, Trophy, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { getTeamTheme } from "@/data/teamColors";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import HeatmapSection from "@/components/dashboard/HeatmapSection";
import CensusDuel from "@/components/dashboard/CensusDuel";
import AmbassadorHierarchy from "@/components/dashboard/AmbassadorHierarchy";
import logo from "@/assets/logo.png";

const RIVALS_MAP: Record<string, string> = {
  "Palmeiras": "Corinthians", "Corinthians": "Palmeiras",
  "Flamengo": "Vasco", "Vasco": "Flamengo",
  "São Paulo": "Palmeiras", "Santos": "São Paulo",
  "Grêmio": "Internacional", "Internacional": "Grêmio",
  "Atlético-MG": "Cruzeiro", "Cruzeiro": "Atlético-MG",
  "Goiás": "Vila Nova", "Vila Nova": "Goiás",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, hasVoted, signOut } = useUser();
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const [rivalData, setRivalData] = useState<{ nome: string; logo: string | null } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      // 1. Busca o voto real
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      
      const myTeamName = data?.clube_nome || "Vila Nova"; // Fallback para Vila Nova se não achar
      setActiveTeam(myTeamName);
      
      // 2. Busca Info do meu clube
      const myClub = CLUBS_DATA.find((c) => c.nome === myTeamName);
      if (myClub) setTeamLogo(myClub.logoUrl);

      // 3. Busca Info do Rival
      const rivalName = RIVALS_MAP[myTeamName] || (myTeamName === "Vila Nova" ? "Goiás" : "Flamengo");
      const rivalClub = CLUBS_DATA.find((c) => c.nome === rivalName);
      setRivalData({ nome: rivalName, logo: rivalClub?.logoUrl || null });
    };
    loadData();
  }, [user]);

  const theme = getTeamTheme(activeTeam);
  const teamVars = {
    "--primary-team": theme.primaryHex || "#FF0000",
    "--glow-team": theme.glow || "rgba(255, 0, 0, 0.5)",
  } as React.CSSProperties;

  if (isLoading || !profile) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white" style={teamVars}>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Logo" className="h-8" />
            <span className="text-xl font-black italic tracking-tighter">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-xl">
            <ClubSearch onSelect={(club) => console.log(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:bg-red-500/10"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Profile Card Premium */}
            <Card className="bg-zinc-900/50 border-0 border-l-4" style={{ borderColor: "var(--primary-team)" }}>
              <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 blur-2xl opacity-30 rounded-full" style={{ backgroundColor: "var(--primary-team)" }} />
                    <div className="relative w-24 h-24 rounded-full bg-black border border-white/10 p-4 flex items-center justify-center">
                      <ClubLogo src={teamLogo} alt={activeTeam || ""} size="lg" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tight">{profile.nome_exibicao || "Beto Borelli"}</h1>
                    <div className="flex items-center gap-3 mt-2 text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                      <MapPin className="w-3 h-3" /> {profile.cidade || "Goiânia"} 
                      <span className="opacity-20">|</span>
                      <Trophy className="w-3 h-3 text-yellow-500" /> Embaixador Bronze
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Coração</p>
                  <p className="text-3xl font-black italic uppercase leading-none" style={{ color: "var(--primary-team)" }}>{activeTeam}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="overview" className="space-y-8">
              <TabsList className="bg-zinc-900 border-white/5 h-14 p-1">
                <TabsTrigger value="overview" className="flex-1 font-black italic uppercase">Central</TabsTrigger>
                <TabsTrigger value="map" className="flex-1 font-black italic uppercase">Mapa</TabsTrigger>
                <TabsTrigger value="duel" className="flex-1 font-black italic uppercase">Duelos</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-8 mt-0"><NewsCarousel /><HeatmapSection /></TabsContent>
              <TabsContent value="map" className="mt-0"><HeatmapSection /></TabsContent>
              <TabsContent value="duel" className="space-y-8 mt-0"><CensusDuel /><AmbassadorHierarchy /></TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-4 space-y-8">
            {/* Rivalidade Real */}
            <Card className="bg-zinc-900/80 border-white/5 p-6">
              <h3 className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Termômetro de Rivalidade</h3>
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-black rounded-full mb-2 border border-white/10 p-3 flex items-center justify-center">
                    <ClubLogo src={teamLogo} alt="" size="sm" />
                  </div>
                  <p className="text-[10px] font-black uppercase">{activeTeam?.split(" ")[0]}</p>
                </div>
                <span className="text-2xl font-black italic opacity-10">VS</span>
                <div className="text-center">
                  <div className="w-16 h-16 bg-black rounded-full mb-2 border border-white/10 p-3 flex items-center justify-center">
                    <ClubLogo src={rivalData?.logo} alt="" size="sm" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-zinc-500">{rivalData?.nome?.split(" ")[0]}</p>
                </div>
              </div>
            </Card>

            <Card className="bg-zinc-900/30 border-white/5 p-6">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] font-black uppercase text-zinc-500">Engajamento Semanal</p>
                <span className="text-2xl font-black italic" style={{ color: "var(--primary-team)" }}>64%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: "64%", backgroundColor: "var(--primary-team)" }} />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;