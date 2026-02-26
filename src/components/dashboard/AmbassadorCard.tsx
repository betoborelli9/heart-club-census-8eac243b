import { motion } from "framer-motion";
import { Trophy, Share2, Copy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockAmbassadors } from "@/data/mockDashboard";
import { useToast } from "@/hooks/use-toast";

const medals = ["🥇", "🥈", "🥉"];

const AmbassadorSection = () => {
  const { toast } = useToast();

  const copyReferral = () => {
    navigator.clipboard.writeText("https://heartclubglobal.com/convite");
    toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
  };

  return (
    <div className="space-y-4">
      {/* Referral Card */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <Card className="glass-card border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--gradient-orange)" }}>
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Programa de Embaixadores</h3>
                <p className="text-xs text-muted-foreground">
                  Convide torcedores para o censo global
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">Link de convite</p>
                <p className="font-mono font-bold text-foreground text-sm truncate">heartclubglobal.com/convite</p>
              </div>
              <Button size="sm" variant="outline" onClick={copyReferral} className="shrink-0 glass-card border-border/50">
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ranking */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="glass-card border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 font-display">
              <Trophy className="w-4 h-4 text-primary" /> Ranking de Embaixadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAmbassadors.map((amb, i) => (
                <motion.div
                  key={amb.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  className="group flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold">
                    {i < 3 ? (
                      <span className="text-lg">{medals[i]}</span>
                    ) : (
                      <span className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-foreground">{amb.name}</span>
                      <span className="text-[10px] text-muted-foreground">{amb.city}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={(amb.count / amb.goal) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <Target className="w-2.5 h-2.5" />
                        {amb.count}/{amb.goal}
                      </span>
                    </div>
                  </div>
                  <span className="text-lg font-black text-primary group-hover:scale-110 transition-transform">
                    {amb.count}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AmbassadorSection;
