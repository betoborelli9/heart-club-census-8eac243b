import { useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Eye, Map, Trophy, LogOut, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { clubs, getClubById } from "@/data/clubs";

import MatchCenter from "@/components/dashboard/MatchCenter";
import HeatmapSection from "@/components/dashboard/HeatmapSection";
import CensusStats from "@/components/dashboard/CensusStats";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import Marketplace from "@/components/dashboard/Marketplace";
import AmbassadorSection from "@/components/dashboard/AmbassadorCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, hasVoted, isLoading, isAuthenticated, signOut } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) navigate("/login", { replace: true });
      else if (!hasVoted) navigate("/voting", { replace: true });
    }
  }, [isLoading, isAuthenticated, hasVoted, navigate]);

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
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-orange)" }}>
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-foreground text-lg">HCG</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Olá, <strong className="text-foreground">{displayName}</strong>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { signOut(); navigate("/login"); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <Card className="glass-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--gradient-orange)" }}>
                  <Heart className="w-7 h-7 text-white" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-display font-bold text-foreground">{displayName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {profile.cidade}/{profile.estado} • Membro HCG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6 glass-card border border-border/30 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Eye className="w-3.5 h-3.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map className="w-3.5 h-3.5" /> Mapa
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="w-3.5 h-3.5" /> Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MatchCenter />
              <div className="space-y-6">
                <CensusStats />
                <Marketplace />
              </div>
            </div>
            <NewsCarousel />
          </TabsContent>

          <TabsContent value="map">
            <HeatmapSection />
          </TabsContent>

          <TabsContent value="ranking">
            <AmbassadorSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
