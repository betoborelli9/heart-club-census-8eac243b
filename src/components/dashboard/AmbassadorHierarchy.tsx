// Path: src/components/dashboard/AmbassadorHierarchy.tsx
import { motion } from "framer-motion";
import { Award, Shield, Crown, Star, Zap, Gem } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/contexts/UserContext";

interface LevelConfig {
  key: string;
  label: string;
  scope: string;
  icon: React.ReactNode;
  color: string;
  threshold: number;
  perk: string;
}

const LEVELS: LevelConfig[] = [
  {
    key: "bronze",
    label: "Embaixador da Cidade",
    scope: "Goiânia",
    icon: <Award className="w-5 h-5" />,
    color: "#cd7f32", // Bronze
    threshold: 10,
    perk: "Selo de Torcedor Validado",
  },
  {
    key: "silver",
    label: "Embaixador do Estado",
    scope: "Goiás",
    icon: <Shield className="w-5 h-5" />,
    color: "#c0c0c0", // Prata
    threshold: 50,
    perk: "Voto com Peso 2x no Censo",
  },
  {
    key: "gold",
    label: "Embaixador Nacional",
    scope: "Brasil",
    icon: <Crown className="w-5 h-5" />,
    color: "#ffd700", // Ouro
    threshold: 200,
    perk: "Sugestão de Notícias na Central",
  },
  {
    key: "black",
    label: "Lenda Heart Club",
    scope: "Global",
    icon: <Gem className="w-5 h-5" />,
    color: "#a855f7", // Roxo/Diamond
    threshold: 1000,
    perk: "Acesso ao Conselho do Clube",
  },
];

const AmbassadorHierarchy = () => {
  const { profile } = useUser();
  const currentReferrals = 7; // Mock para visualização

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="bg-card/40 border-border/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Crown className="w-20 h-20" />
        </div>
        
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black italic flex items-center gap-2 uppercase tracking-tighter">
            <Zap className="w-4 h-4 text-yellow-500" /> Carreira de Embaixador
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Loop */}
          <div className="space-y-4">
            {LEVELS.map((level, i) => {
              const isCurrent = currentReferrals < level.threshold && (i === 0 || currentReferrals >= LEVELS[i-1].threshold);
              const isCompleted = currentReferrals >= level.threshold;
              const progress = Math.min((currentReferrals / level.threshold) * 100, 100);

              return (
                <div
                  key={level.key}
                  className={`relative p-3 rounded-xl border transition-all duration-500 ${
                    isCurrent 
                      ? "bg-background/60 border-primary/30 shadow-[0_0_15px_rgba(0,0,0,0.2)]" 
                      : isCompleted 
                        ? "bg-primary/5 border-primary/10 opacity-80" 
                        : "bg-muted/20 border-transparent opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                      style={{ 
                        color: level.color, 
                        borderColor: `${level.color}40`,
                        backgroundColor: `${level.color}10`
                      }}
                    >
                      {level.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Nível {i + 1}</p>
                          <h4 className="text-xs font-black uppercase italic">{level.label}</h4>
                        </div>
                        <span className="text-[10px] font-bold">
                          {isCompleted ? "CONCLUÍDO" : `${currentReferrals}/${level.threshold}`}
                        </span>
                      </div>
                      
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full"
                          style={{ backgroundColor: isCompleted ? '#22c55e' : level.color }}
                        />
                      </div>
                      
                      <p className="text-[9px] mt-2 font-bold text-muted-foreground uppercase">
                        🎁 Bônus: <span className="text-foreground">{level.perk}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-[10px] text-center font-bold leading-tight">
              🚀 Faltam apenas {10 - currentReferrals} convites para você se tornar <span style={{ color: LEVELS[0].color }}>Embaixador de {profile?.cidade || "Goiânia"}</span>!
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AmbassadorHierarchy;