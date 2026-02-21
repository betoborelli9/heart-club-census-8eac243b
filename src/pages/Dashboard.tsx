import { motion } from "framer-motion";
import { Heart, Trophy, Calendar, Newspaper, Share2, Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { clubs, getClubById } from "@/data/clubs";
import { useToast } from "@/hooks/use-toast";

const mockNews = [
  { id: 1, title: "Reforço confirmado para a próxima temporada", time: "2h atrás" },
  { id: 2, title: "Treinador elogia desempenho do elenco", time: "5h atrás" },
  { id: 3, title: "Ingressos para o clássico esgotados", time: "8h atrás" },
];

const mockAmbassadors = [
  { name: "Carlos M.", count: 42 },
  { name: "Ana P.", count: 38 },
  { name: "Roberto S.", count: 31 },
  { name: "Juliana C.", count: 27 },
  { name: "Felipe A.", count: 24 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, heartClub, logout } = useUser();
  const { toast } = useToast();

  if (!user || !user.hasVoted || !heartClub) {
    navigate(user ? "/onboarding" : "/login");
    return null;
  }

  const sympathyClubs = user.sympathyClubIds.map((id) => getClubById(id)).filter(Boolean);

  const copyReferral = () => {
    navigator.clipboard.writeText(`https://heartclubglobal.com/ref/${user.referralCode}`);
    toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{heartClub.emoji}</span>
            <span className="font-bold text-foreground text-sm">{user.fullName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
                  {heartClub.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black text-foreground">{heartClub.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Clube do Coração • {heartClub.state}
                  </p>
                  {user.votedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Voto registrado em {new Date(user.votedAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <Heart className="w-6 h-6 text-primary shrink-0" fill="currentColor" />
              </div>

              {sympathyClubs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
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

        {/* Next Game */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Próximo Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{heartClub.emoji}</span>
                  <span className="font-bold text-foreground text-sm">vs</span>
                  <span className="text-2xl">⚽</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">Domingo, 19:00</p>
                  <p className="text-xs text-muted-foreground">Brasileirão • Rodada 12</p>
                </div>
              </div>
              <div className="mt-3 p-2 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">📺 Onde Assistir: <span className="text-foreground font-medium">Globo, Premiere</span></p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* News */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-primary" /> Últimas Notícias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockNews.map((news) => (
                <div key={news.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p className="text-sm text-foreground font-medium">{news.title}</p>
                    <p className="text-xs text-muted-foreground">{news.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Ambassador */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Programa de Embaixadores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Seu código</p>
                  <p className="font-mono font-bold text-foreground text-sm">{user.referralCode}</p>
                </div>
                <Button size="sm" variant="outline" onClick={copyReferral}>
                  <Copy className="w-3 h-3 mr-1" /> Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Você indicou <strong className="text-foreground">{user.referralCount}</strong> torcedores
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Ranking */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Ranking de Embaixadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockAmbassadors.map((amb, i) => (
                  <div key={amb.name} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      i === 1 ? "bg-gray-400/20 text-gray-300" :
                      i === 2 ? "bg-amber-600/20 text-amber-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-foreground">{amb.name}</span>
                    <span className="text-sm font-bold text-primary">{amb.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
