import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Loader2, Users, Trophy, MapPin } from "lucide-react";
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
  "Palmeiras": "Corinthians",
  "Corinthians": "Palmeiras",
  "Flamengo": "Vasco",
  "Vasco": "Flamengo",
  "São Paulo": "Palmeiras",
  "Santos": "São Paulo",
  "Grêmio": "Internacional",
  "Internacional": "Grêmio",
  "Atlético-MG": "Cruzeiro",
  "Cruzeiro": "Atlético-MG",
  "Goiás": "Vila Nova",
  "Vila Nova": "Goiás",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, hasVoted, signOut } = useUser();
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const [rivalData, setRivalData] = useState<{ nome: string; logo: string | null } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
    else if (!isLoading && isAuthenticated && !hasVoted) navigate("/voting", { replace: true });
  }, [isLoading, isAuthenticated, hasVoted, navigate]);

  useEffect(() => {
    const loadTeamAndRival = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      if (data?.clube_nome) {
        setActiveTeam(data.clube_nome);
        const myClub = CLUBS_DATA.find((c) => c.nome === data.clube_nome);
        if (myClub) setTeamLogo(myClub.logoUrl);
        const rivalName = RIVALS_MAP[data.clube_nome] || "Flamengo";
        const rivalClub = CLUBS_DATA.find((c) => c.nome === rivalName);
        setRivalData({ nome: rivalName, logo: rivalClub?.logoUrl || null });
      }
    };
    loadTeamAndRival();
  }, [user]);

  const theme = getTeamTheme(activeTeam);
  const teamVars = {
    "--primary-team": theme.primaryHex || "#FF0000",
    "--secondary-team": theme.glow || "rgba(255,0,0,0.15)",
    "--glow-team": theme.glow || "rgba(255, 0, 0, 0.5)",
  } as React.CSSProperties;

  if (isLoading || !profile) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500" style={teamVars}>
      <header className="sticky top-0 z-50 border-b border-border/10 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
            <span className="text-xl font-black italic hidden sm:block tracking-tighter">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-xl">
            <ClubSearch onSelect={(club) => console.log("Pesquisou:", club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full hover:bg-destructive/10 hover:text-destructive"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-card to-background">
              <div className="h-1 w-full" style={{ backgroundColor: "var(--primary-team)" }} />
              <CardContent className="p-6">
                <div className="flex flex-wrap justify-between items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full blur-md opacity-50 animate-pulse" style={{ backgroundColor: "var(--primary-team)" }} />
                      <div className="relative w-20 h-20 rounded-full bg-background border-2 border-border/20 p-2 flex items-center justify-center">
                        <ClubLogo src={teamLogo} alt={activeTeam || ""} size="lg" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl font-black uppercase italic tracking-tight">{profile.nome_exibicao}</h1>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3" /> <span className="text-xs font-bold uppercase tracking-wider">{profile.cidade || "Brasil"}</span>
                        <span className="h-1 w-1 rounded-full bg-border" /> <Trophy className="w-3 h-3 text-yellow-500" /> <span className="text-xs font-bold uppercase tracking-wider text-yellow-500">Embaixador Bronze</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right bg-background/40 p-4 rounded-xl border border-border/10">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Time do Coração</p>
                    <p className="text-2xl font-black italic uppercase leading-none" style={{ color: "var(--primary-team)" }}>{activeTeam}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="w-full bg-card border border-border/10 h-14 p-1">
                <TabsTrigger value="overview" className="flex-1 font-bold">CENTRAL</TabsTrigger>
                <TabsTrigger value="map" className="flex-1 font-bold">MAPA NACIONAL</TabsTrigger>
                <TabsTrigger value="duel" className="flex-1 font-bold">DUELOS</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-6 mt-0"><NewsCarousel /><HeatmapSection /></TabsContent>
              <TabsContent value="map" className="mt-0"><HeatmapSection /></TabsContent>
              <TabsContent value="duel" className="space-y-6 mt-0"><CensusDuel /><AmbassadorHierarchy /></TabsContent>
            </Tabs>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-card/40 border-border/10 overflow-hidden relative">
              <CardContent className="p-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 text-center">Termômetro de Rivalidade</h3>
                <div className="flex justify-between items-center px-4">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-background rounded-full mb-3 border-2 border-border/10 p-2 flex items-center justify-center"><ClubLogo src={teamLogo} alt={activeTeam || ""} size="sm" /></div>
                    <p className="text-[10px] font-black uppercase">{activeTeam?.split(" ")[0]}</p>
                  </div>
                  <div className="flex flex-col items-center"><span className="text-2xl font-black italic opacity-10 mb-2">VS</span></div>
                  <div className="text-center">
                    <div className="w-14 h-14 bg-background rounded-full mb-3 border-2 border-border/10 p-2 flex items-center justify-center"><ClubLogo src={rivalData?.logo} alt={rivalData?.nome || ""} size="sm" /></div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">{rivalData?.nome?.split(" ")[0]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/10 p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Engajamento Semanal</p><h4 className="font-bold text-sm">Chance de ultrapassar rival</h4></div>
                  <span className="text-2xl font-black italic" style={{ color: "var(--primary-team)" }}>64%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: "64%", backgroundColor: "var(--primary-team)" }} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
