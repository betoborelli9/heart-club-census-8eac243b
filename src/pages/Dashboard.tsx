import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Eye, Map, Trophy, LogOut, Loader2, Swords, 
  Search, Target, TrendingUp 
} from "lucide-react";
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
  const [isSearching, setIsSearching] = useState(false);

  // Carrega o time do coração do banco
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

  // Lógica de cores
  const theme = getTeamTheme(activeTeam);
  const teamCSSVars = {
    "--primary-team": theme.primaryHex,
    "--glow-team": theme.glow,
  } as React.CSSProperties;

  // Função de busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setActiveTeam(searchQuery);
      setIsSearching(false);
      setSearchQuery("");
    }, 800);
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  const displayName = profile.nome_exibicao || "Torcedor";

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[var(--primary-team)] transition-colors duration-700" style={teamCSSVars}>
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(0)}>
            <img src={logo} alt="Heart Club" className="h-10 w-10 object-contain shadow-[0_0_15px_var(--glow-team)]" />
            <span className="text-xl font-black italic tracking-tighter hidden lg:block">HEART CLUB</span>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[var(--primary-team)] transition-colors" />
            <Input 
              placeholder="Consultar qualquer clube (Ex: Real Madrid, Flamengo, Boca...)" 
              className="bg-white/5 border-white/10 pl-12 rounded-full h-11 focus-visible:ring-[var(--primary-team)] focus-visible:bg-white/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--primary-team)]" />}
          </form>

          <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full hover:bg-red-500/20">
            <LogOut className="w-5 h-5 text-white/40" />
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA */}
          <div className="lg:col-span-8 space-y-8">
            {/* CARD IDENTIDADE */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-zinc-900/40 border-0 border-l-4 border-[var(--primary-team)] overflow-hidden">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-black border-2 border-white/10 p-3 shadow-[0_0_20px_var(--glow-team)]">
                        <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--primary-team)] flex items-center justify-center text-sm shadow-lg">🥉</div>
                    </div>
                    <div>
                      <h1 className="text-3xl font-black italic uppercase tracking-tighter">{displayName}</h1>
                      <div className="flex items-center gap-3 text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                        <span>{profile.cidade || "Global"}</span>
                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[var(--primary-team)]">Embaixador Bronze</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 md:mt-0 text-center md:text-right">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Time em Foco</p>
                    <p className="text-2xl font-black italic text-[var(--primary-team)] uppercase">{activeTeam || "Carregando..."}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ABAS DE NAVEGAÇÃO */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-zinc-900/60 p-1 mb-8 border border-white/5 h-14 flex overflow-x-auto scrollbar-hide">
                <TabsTrigger value="overview" className="flex-1 gap-2 data-[state=active]:bg-[var(--primary-team)] text-[10px] font-black uppercase tracking-tighter">
                  <Eye className="w-4 h-4" /> VISÃO GERAL
                </TabsTrigger>
                <TabsTrigger value="map" className="flex-1 gap-2 data-[state=active]:bg-[var(--primary-team)] text-[10px] font-black uppercase tracking-tighter">
                  <Map className="w-4 h-4" /> MAPA MUNDIAL
                </TabsTrigger>
                <TabsTrigger value="duel" className="flex-1 gap-2 data-[state=active]:bg-[var(--primary-team)] text-[10px] font-black uppercase tracking-tighter">
                  <Swords className="w-4 h-4" /> DUELO CENSUS
                </TabsTrigger>
                <TabsTrigger value="ranking" className="flex-1 gap-2 data-[state=active]:bg-[var(--primary-team)] text-[10px] font-black uppercase tracking-tighter">
                  <Trophy className="w-4 h-4" /> RANKING
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8 outline-none">
                <NewsCarousel team={activeTeam} />
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xs font