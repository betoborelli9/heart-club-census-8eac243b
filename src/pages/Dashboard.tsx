import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Map, Trophy, LogOut, Loader2, Swords, Search, Calendar, Target, TrendingUp, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { getTeamTheme } from "@/data/teamColors";
import logo from "@/assets/logo.png";

// Componentes
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import HeatmapSection from "@/components/dashboard/HeatmapSection";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [teamClub, setTeamClub] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Busca o time inicial do usuário
  useEffect(() => {
    if (!user) return;
    supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.clube_nome) setTeamClub(data.clube_nome); });
  }, [user]);

  const theme = getTeamTheme(teamClub);
  const teamCSSVars = {
    "--primary-team": theme.primaryHex || "#FF0000",
    "--glow-team": `0 0 20px ${theme.glow || "rgba(255, 0, 0, 0.4)"}`,
  } as React.CSSProperties;

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-team)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[var(--primary-team)]" style={teamCSSVars}>
      
      {/* HEADER COM BUSCADOR GLOBAL */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <img src={logo} alt="Heart Club" className="h-9 w-9" />
            <span className="text-lg font-black tracking-tighter hidden md:block italic">HEART CLUB</span>
          </div>

          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Buscar qualquer clube do planeta..." 
              className="bg-zinc-900/50 border-white/10 pl-11 rounded-full focus-visible:ring-[var(--primary-team)] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full hover:bg-red-500/20">
            <LogOut className="w-4 h-4 text-white/60" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA (8 COLUNAS) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* CARROSSEL DE CLASSIFICAÇÕES (Série A, Copa do Brasil, etc) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Classificações e Tabelas</h3>
                <span className="text-[10px] text-[var(--primary-team)] animate-pulse">Arrasta para o lado ➔</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {/* Exemplo: Brasileirão */}
                <Card className="min-w-[300px] bg-zinc-900/40 border-white/5 snap-center">
                  <CardHeader className="p-4 border-b border-white/5 bg-white/5">
                    <CardTitle className="text-xs font-bold flex justify-between uppercase">
                      <span>Brasileirão Série A</span>
                      <span className="text-[var(--primary-team)]">4º Lugar</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-[10px] p-4 space-y-2">
                      <div className="flex justify-between border-b border-white/5 pb-1"><span>1. Botafogo</span> <span className="font-bold">68pt</span></div>
                      <div className="flex justify-between border-b border-white/5 pb-1"><span>2. Palmeiras</span> <span className="font-bold">64pt</span></div>
                      <div className="flex justify-between bg-[var(--primary-team)]/20 p-1 rounded font-black italic"><span>4. {teamClub}</span> <span>59pt</span></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Exemplo: Copa do Brasil */}
                <Card className="min-w-[300px] bg-zinc-900/40 border-white/5 snap-center">
                  <CardHeader className="p-4 border-b border-white/5">
                    <CardTitle className="text-xs font-bold uppercase">Copa do Brasil</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 text-center">
                    <p className="text-[10px] text-white/40 mb-2">PRÓXIMA FASE: QUARTAS DE FINAL</p>
                    <p className="text-sm font-black italic uppercase">{teamClub} x Flamengo</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <NewsCarousel team={teamClub} />
            <HeatmapSection />
          </div>

          {/* COLUNA DIREITA (4 COLUNAS) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* CARD PRÓXIMO JOGO */}
            <Card className="bg-zinc-900/80 border-0 shadow-[var(--glow-team)] relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary-team)]" />
               <CardHeader className="text-center pb-2">
                 <p className="text-[9px] font-black text-[var(--primary-team)] uppercase tracking-widest">Onde Assistir</p>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="flex justify-around items-center">
                    <div className="text-center">
                       <div className="w-12 h-12 bg-black rounded-full mb-2 border border-white/10" />
                       <p className="text-[10px] font-bold uppercase">{teamClub}</p>
                    </div>
                    <span className="text-xl font-black italic opacity-20">VS</span>
                    <div className="text-center">
                       <div className="w-12 h-12 bg-black rounded-full mb-2 border border-white/10" />
                       <p className="text-[10px] font-bold uppercase">Rival</p>
                    </div>
                 </div>
                 <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-medium italic">Sábado, 16:00 • Maracanã</p>
                    <div className="flex justify-center gap-2 mt-2">
                       <span className="bg-red-600 text-[8px] px-2 py-0.5 rounded font-bold">PREMIERE</span>
                       <span className="bg-blue-600 text-[8px] px-2 py-0.5 rounded font-bold">GLOBO</span>
                    </div>
                 </div>
               </CardContent>
            </Card>

            {/* INTELIGÊNCIA UFMG */}
            <Card className="bg-zinc-900/40 border-white/5">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Target className="w-4 h-4" /> Inteligência UFMG</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] mb-2 font-bold uppercase italic"><span>Chance de Libertadores</span> <span>78%</span></div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--primary-team)] transition-all duration-1000" style={{ width: '78%', boxShadow: '0 0 10px var(--primary-team)' }} />
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[11px] leading-relaxed text-center italic">
                    "Para atingir a nota de corte da Libertadores, o <strong>{teamClub}</strong> precisa de <span className="text-[var(--primary-team)] font-black">14 pontos</span> nos próximos 21 em disputa."
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ONDE TEM MAIS VOTOS */}
            <Card className="bg-zinc-900/40 border-white/5">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Redutos da Torcida</CardTitle></CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y divide-white/5">
                    {[ {cid: "Goiânia", v: "15.4k"}, {cid: "Aparecida", v: "4.2k"}, {cid: "Brasília", v: "1.1k"} ].map((r, i) => (
                      <div key={i} className="flex justify-between p-4 items-center">
                        <span className="text-xs font-medium">{r.cid}</span>
                        <span className="text-xs font-black text-[var(--primary-team)]">{r.v}</span>
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
        [data-team-tab][data-state="active"] { background-color: var(--primary-team) !important; }
      `}</style>
    </div>
  );
};

export default Dashboard;