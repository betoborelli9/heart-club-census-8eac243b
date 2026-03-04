import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Map, Trophy, LogOut, Loader2, Swords, Search, Calendar, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { getTeamTheme } from "@/data/teamColors";
import logo from "@/assets/logo.png";

// Componentes Dinâmicos
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import HeatmapSection from "@/components/dashboard/HeatmapSection";
import CensusDuel from "@/components/dashboard/CensusDuel";
import AmbassadorHierarchy from "@/components/dashboard/AmbassadorHierarchy";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadInitialTeam = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.clube_nome) setActiveTeam(data.clube_nome);
    };
    loadInitialTeam();
  }, [user]);

  const theme = getTeamTheme(activeTeam);
  const teamCSSVars = {
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

  const displayName = profile.nome_exibicao || "Torcedor";

  return (
    <div className="min-h-screen bg-[#000000] text-white" style={teamCSSVars}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Heart Club" className="h-9 w-9 object-contain" />
            <span className="text-lg font-black tracking-tighter italic hidden sm:block">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Buscar clube..." 
              className="bg-zinc-900/50 border-white/10 pl-11 rounded-full focus:ring-[var(--primary-team)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full">
            <LogOut className="w-4 h-4 text-white/60" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* GRID LADO A LADO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA (8) */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-zinc-900/40 border-0 border-l-4 border-[var(--primary-team)]">
              <CardContent className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-black border border-white/10 p-2 shadow-[0_0_15px_var(--glow-team)]">
                    <img src={logo} alt="Time" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black uppercase italic leading-none">{displayName}</h1>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                      {profile.cidade} • Embaixador Bronze
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Foco Atual</p>
                  <p className="text-xl font-black italic text-[var(--primary-team)] uppercase">{activeTeam || "---"}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-zinc-900/60 p-1 mb-8 border border-white/5 h-12 flex">
                <TabsTrigger value="overview" className="flex-1 gap-2 data-[state=active]:bg-[var(--primary-team)]">GERAL</TabsTrigger>
                <TabsTrigger value="map" className="flex-1 gap-2 data-[state=active]:bg-[var(--primary-team)]">MAPA</TabsTrigger>
                <TabsTrigger value="duel" className="flex-1 gap-2 data-[state=active]:bg-[var(--primary-team)]">DUELO</TabsTrigger>
              </TabsList>

              <TabsContent