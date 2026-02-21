import { motion } from "framer-motion";
import { Heart, Eye, Map, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { getClubById } from "@/data/clubs";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import MatchCenter from "@/components/dashboard/MatchCenter";
import HeatmapSection from "@/components/dashboard/HeatmapSection";
import CensusStats from "@/components/dashboard/CensusStats";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import Marketplace from "@/components/dashboard/Marketplace";
import AmbassadorSection from "@/components/dashboard/AmbassadorCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, heartClub } = useUser();

  if (!user || !user.hasVoted || !heartClub) {
    navigate(user ? "/onboarding" : "/login");
    return null;
  }

  const sympathyClubs = user.sympathyClubIds.map((id) => getClubById(id)).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader club={heartClub} userName={user.fullName} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
                  {heartClub.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black text-foreground">{heartClub.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Clube do Coração • {heartClub.state}
                  </p>
                  {user.votedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Voto registrado em {new Date(user.votedAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <Heart className="w-6 h-6 text-primary shrink-0" fill="currentColor" />
              </div>

              {sympathyClubs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Clubes de Simpatia</p>
                  <div className="flex gap-2 flex-wrap">
                    {sympathyClubs.map((c) =>
                      c ? (
                        <span key={c.id} className="inline-flex items-center gap-1 bg-accent/30 text-xs px-2 py-1 rounded-full">
                          {c.emoji} {c.shortName}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <Eye className="w-3.5 h-3.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm">
              <Map className="w-3.5 h-3.5" /> Mapa
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5 text-xs sm:text-sm">
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
