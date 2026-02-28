import { useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Map, Trophy, LogOut, Loader2, Swords, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import logo from "@/assets/logo.png";

import MatchCenter from "@/components/dashboard/MatchCenter";
import HeatmapSection from "@/components/dashboard/HeatmapSection";
import CensusStats from "@/components/dashboard/CensusStats";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import Marketplace from "@/components/dashboard/Marketplace";
import AmbassadorSection from "@/components/dashboard/AmbassadorCard";
import ProgressiveProfile from "@/components/dashboard/ProgressiveProfile";
import SocialLock from "@/components/dashboard/SocialLock";
import CensusDuel from "@/components/dashboard/CensusDuel";
import AmbassadorHierarchy from "@/components/dashboard/AmbassadorHierarchy";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, signOut } = useUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile.nome_exibicao || user?.user_metadata?.full_name || "Torcedor";

  return (
    <div className="min-h-screen bg-background">
      {/* Header — Preto Absoluto #000 */}
      <header className="sticky top-0 z-40 border-b border-border/20" style={{ backgroundColor: "#000000" }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Heart Club" className="object-contain max-h-[30px] sm:max-h-[40px]" />
            <span className="text-sm font-display font-bold text-white hidden sm:inline">Heart Club</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60">
              Olá, <strong className="text-white">{displayName}</strong>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { signOut(); navigate("/login"); }}
              className="text-white/50 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Progressive Profile Questions */}
        <div className="mb-6">
          <ProgressiveProfile />
        </div>

        {/* User Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <Card className="glass-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={logo} alt="" className="w-14 h-14 object-contain" />
                  {/* Ambassador Badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: "hsl(30, 60%, 50%)" }}>
                    🥉
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-display font-bold text-foreground">{displayName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {profile.cidade}/{profile.estado} • Embaixador Bronze 🏅
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6 glass-card border border-border/30 p-1">
            <TabsTrigger value="overview" className="gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="duel" className="gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Swords className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Duelo</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MatchCenter />
              <div className="space-y-6">
                <CensusStats />
                <SocialLock />
              </div>
            </div>
            <NewsCarousel />
            <Marketplace />
          </TabsContent>

          <TabsContent value="map">
            <HeatmapSection />
          </TabsContent>

          <TabsContent value="duel" className="space-y-6">
            <CensusDuel />
            <AmbassadorHierarchy />
          </TabsContent>

          <TabsContent value="ranking">
            <AmbassadorSection />
          </TabsContent>
        </Tabs>

        {/* UFMG Credit */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground">
            Fonte: Inteligência Matemática UFMG / Processamento: Heart Club
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
