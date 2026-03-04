import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Map, Trophy, LogOut, Loader2, Swords, Calendar, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { getTeamTheme } from "@/data/teamColors";
import logo from "@/assets/logo.png";

// Importação do novo componente de busca global
import { ClubSearch } from "@/components/dashboard/ClubSearch";

import NewsCarousel from "@/components/dashboard/NewsCarousel";
import HeatmapSection from "@/components/dashboard/HeatmapSection";
import CensusDuel from "@/components/dashboard/CensusDuel";
import AmbassadorHierarchy from "@/components/dashboard/AmbassadorHierarchy";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  useEffect(() => {
    const loadTeam = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      if (data?.clube_nome) setActiveTeam(data.clube_nome);
    };
    loadTeam();
  }, [user]);

  const theme = getTeamTheme(activeTeam);
  const teamVars = {
    "--primary-team": theme.primaryHex || "#FF0000",
    "--glow-team": theme.glow || "rgba(255, 0, 0, 0.5)",
  } as React.CSSProperties;

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={teamVars}>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
            <span className="text-lg font-black italic hidden sm:block">HEART CLUB</span>
          </div>
          
          {/* BUSCADOR GLOBAL CONECTADO À API FOOTBALL */}
          <div className="flex-1 max-w-xl">
            <ClubSearch onSelect={(club) => console.log("Clube selecionado:", club)} />
          </div>

          <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full">
            <LogOut className="w-4 h-4 text-white/60" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-zinc-900/40 border-0 border-l-4 border-[var(--primary-team)]">
              <CardContent className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-black border border-white/10 p-2 shadow-[0_0_15px_var(--glow-team)]">
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black uppercase italic leading-none">{profile.nome_exibicao || "Torcedor"}</h1>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{profile.cidade} • Embaixador Bronze</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Foco</p>
                  <p className="text-xl font-black italic text-[var(--primary-team)] uppercase">{activeTeam || "---"}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-zinc-900/60 p-1 mb-8 border border-white/5 h-12 flex">
                <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-[var(--primary-team)]">GERAL</TabsTrigger>
                <TabsTrigger value="map" className="flex-1 data-[state=active]:bg-[var(--primary-team)]">MAPA</TabsTrigger>
                <TabsTrigger value="duel" className="flex-1 data-[state=active]:bg-[var(--primary-team)]">DUELO</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-8">
                <NewsCarousel team={activeTeam} />
                <HeatmapSection />
              </TabsContent>
              <TabsContent value="map">
                <HeatmapSection />
              </TabsContent>
              <TabsContent value="duel" className="space-y-8">
                <CensusDuel />
                <AmbassadorHierarchy />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-zinc-900/80 border-0 shadow-[var(--glow-team)]">
              <CardContent className="py-6 space-y-4">
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black rounded-full mb-1 border border-white/10" />
                    <p className="text-[10px] font-bold uppercase">{activeTeam}</p>
                  </div>
                  <span className="text-xl font-black italic opacity-20">VS</span>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black rounded-full mb-1 border border-white/10" />
                    <p className="text-[10px] font-bold uppercase text-white/40">RIVAL</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/40 border-white/5 p-6">
              <div className="flex justify-between text-[10px] mb-2 font-black uppercase">
                <span>Vaga Libertadores</span>
                <span className="text-[var(--primary-team)]">78%</span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--primary-team)]" style={{ width: '78%' }} />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;