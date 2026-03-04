import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, Map, Trophy, LogOut, Loader2, Swords, 
  Search, Calendar, Target, TrendingUp, Newspaper 
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
  
  // ESTADOS GLOBAIS DA PÁGINA
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // 1. CARREGAMENTO INICIAL: Puxa o time do coração do banco
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

  // 2. LÓGICA DE CORES: O "Camaleão"
  const theme = getTeamTheme(activeTeam);
  const teamCSSVars = {
    "--primary-team": theme.primaryHex || "#FF0000",
    "--glow-team": theme.glow || "rgba(255, 0, 0, 0.5)",
  } as React.CSSProperties;

  // 3. FUNÇÃO DE BUSCA: Muda o dashboard para o time consultado
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    // Aqui simulamos a troca de tema para o time buscado
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
      
      {/* HEADER ULTRA-MODERNO */}
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: CONTEÚDO PRINCIPAL (8 COLUNAS) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* CARD DE IDENTIDADE DINÂMICO */}
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

            {/* ABAS DE NAVEGAÇÃO LADO A LADO */}
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
                {/* NOTÍCIAS REAIS - O COMPONENTE DEVE BUSCAR BASEADO NO activeTeam */}
                <NewsCarousel team={activeTeam} />
                
                {/* TABELAS E CAMPEONATOS (SCROLL HORIZONTAL) */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Tabelas e Competições</h3>
                      <span className="text-[9px] text-[var(--primary-team)] font-bold animate-pulse">DESLIZE PARA VER MAIS ➔</span>
                   </div>
                   <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="min-w-[280px] bg-zinc-900/40 border-white/5 snap-center">
                          <CardHeader className="p-4 border-b border-white/5">
                            <CardTitle className="text-[10px] font-black uppercase opacity-60">Campeonato {i === 1 ? 'Brasileiro' : i === 2 ? 'Copa do Brasil' : 'Libertadores'}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold uppercase italic">{activeTeam}</span>
                              <span className="text-xl font-black text-[var(--primary-team)]">{i + 3}º</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                   </div>
                </div>

                <HeatmapSection />
              </TabsContent>

              <TabsContent value="duel" className="outline-none space-y-8">
                <CensusDuel />
                <AmbassadorHierarchy />
              </TabsContent>
            </Tabs>
          </div>

          {/* COLUNA DIREITA: ESTATÍSTICAS E PRÓXIMO JOGO (4 COLUNAS) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* CARD PRÓXIMO JOGO (API FOOTBALL READY) */}
            <Card className="bg-zinc-900/80 border-0 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary-team)] shadow-[0_0_15px_var(--primary-team)]" />
               <CardHeader className="text-center pb-2">
                 <p className="text-[10px] font-black text-[var(--primary-team)] uppercase tracking-widest">Onde Assistir</p>
               </CardHeader>
               <CardContent className="py-6 space-y-6">
                 <div className="flex justify-around items-center">
                    <div className="text-center space-y-2">
                       <div className="w-14 h-14 bg-black rounded-full mx-auto border border-white/10 p-3 group-hover:scale-110 transition-transform">
                          <img src={logo} alt="Home" className="w-full h-full object-contain" />
                       </div>
                       <p className="text-[10px] font-black uppercase leading-tight">{activeTeam}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-2xl font-black italic opacity-20">VS</p>
                       <p className="text-[8px] font-bold text-white/30 uppercase mt-1">Sáb 16:00</p>
                    </div>
                    <div className="text-center space-y-2">
                       <div className="w-14 h-14 bg-black rounded-full mx-auto border border-white/10 p-3" />
                       <p className="text-[10px] font-black uppercase text-white/30">ADVERSÁRIO</p>
                    </div>
                 </div>
                 <div className="bg-white/5 rounded-xl p-3 flex justify-center gap-3">
                    <span className="bg-red-600 text-[8px] px-2 py-1 rounded font-black shadow-lg">PREMIERE</span>
                    <span className="bg-blue-600 text-[8px] px-2 py-1 rounded font-black shadow-lg">GLOBO</span>
                 </div>
               </CardContent>
            </Card>

            {/* INTELIGÊNCIA UFMG: CAMINHO DA GLÓRIA */}
            <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-4 h-4 text-[var(--primary-team)]" /> Inteligência UFMG
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] mb-3 font-black uppercase italic">
                    <span className="text-white/40">Vaga Libertadores</span>
                    <span className="text-[var(--primary-team)] text-sm">74.8%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '74.8%' }}
                      className="h-full bg-[var(--primary-team)] shadow-[0_0_15px_var(--primary-team)]" 
                    />
                  </div>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 relative group">
                   <p className="text-[11px] leading-relaxed text-center italic text-white/80">
                    "Para garantir a Libertadores, o <strong>{activeTeam}</strong> necessita de <span className="text-[var(--primary-team)] font-black">15 pontos</span> nos 24 restantes."
                   </p>
                </div>
              </CardContent>
            </Card>

            {/* ESTATÍSTICAS DE ENGAJAMENTO (CENSUS) */}
            <Card className="bg-zinc-900/40 border-white/5">
               <CardHeader><CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--primary-team)]" /> Top Redutos</CardTitle></CardHeader>
               <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                     {[
                       { local: "Goiânia, GO", votos: "15.420", p: "68%" },
                       { local: "Brasília, DF", votos: "4.102", p: "12%" },
                       { local: "S. Paulo, SP", votos: "904", p: "3%" }
                     ].map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors group">
                          <span className="text-[11px] font-bold group-hover:text-[var(--primary-team)] transition-colors">{item.local}</span>
                          <span className="text-xs font-black text-[var(--primary-team)]">{item.votos}</span>
                       </div>
                     ))}
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        [data-state="active"] { box-shadow: 0 0 15px var(--glow-team); }
      `}</style>
    </div>
  );
};

export default Dashboard;