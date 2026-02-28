import { motion } from "framer-motion";
import { Award, Shield, Crown, MapPin, Users, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/contexts/UserContext";

interface LevelConfig {
  key: string;
  label: string;
  scope: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  threshold: number;
}

const LEVELS: LevelConfig[] = [
  {
    key: "bronze",
    label: "Embaixador da Cidade",
    scope: "city",
    icon: <Award className="w-5 h-5" />,
    color: "hsl(30, 60%, 50%)",
    bgColor: "hsl(30, 60%, 50% / 0.15)",
    threshold: 10,
  },
  {
    key: "silver",
    label: "Embaixador do Estado",
    scope: "state",
    icon: <Shield className="w-5 h-5" />,
    color: "hsl(0, 0%, 70%)",
    bgColor: "hsl(0, 0%, 70% / 0.15)",
    threshold: 50,
  },
  {
    key: "gold",
    label: "Embaixador do País",
    scope: "country",
    icon: <Crown className="w-5 h-5" />,
    color: "hsl(45, 90%, 55%)",
    bgColor: "hsl(45, 90%, 55% / 0.15)",
    threshold: 200,
  },
];

const AmbassadorHierarchy = () => {
  const { profile } = useUser();
  // Mock data - in production this would come from ambassador_levels table
  const currentReferrals = 7;
  const currentLevel = LEVELS[0]; // Bronze

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 font-display">
            <Star className="w-4 h-4 text-primary" /> Hierarquia de Embaixadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Level Badge */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: currentLevel.bgColor }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ color: currentLevel.color, backgroundColor: `${currentLevel.color}20` }}>
              {currentLevel.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{currentLevel.label}</p>
              <p className="text-xs text-muted-foreground">
                {profile?.cidade || "Sua cidade"} • {currentReferrals} convites
              </p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="space-y-3">
            {LEVELS.map((level, i) => {
              const progress = Math.min((currentReferrals / level.threshold) * 100, 100);
              const isActive = i === 0;
              const isLocked = i > 0;
              return (
                <div
                  key={level.key}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                    isActive ? "border border-primary/30 bg-primary/5" : "opacity-60"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ color: level.color }}
                  >
                    {level.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{level.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {currentReferrals}/{level.threshold}
                      </span>
                    </div>
                    <Progress value={progress} className="h-1.5 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
            🏆 Convide torcedores para subir de nível. Embaixadores Ouro podem validar cores de clubes.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AmbassadorHierarchy;
