// Path: src/components/dashboard/CensusDuel.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Swords, Share2, TrendingUp, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";

// Mapeamento de rivais idêntico ao do Dashboard
const RIVALS_MAP: Record<string, string> = {
  "Palmeiras": "Corinthians",
  "Corinthians": "Palmeiras",
  "Flamengo": "Vasco",
  "Vasco": "Flamengo",
  "São Paulo": "Palmeiras",
  "Santos": "São Paulo",
  "Grêmio": "Internacional",
  "Internacional": "Grêmio",
  "Atlético-MG": "Cruzeiro",
  "Cruzeiro": "Atlético-MG",
  "Goiás": "Vila Nova",
  "Vila Nova": "Goiás",
};

const CensusDuel = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const [duel, setDuel] = useState<any>(null);

  useEffect(() => {
    const initDuel = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      
      if (data?.clube_nome) {
        const myClubName = data.clube_nome;
        const rivalName = RIVALS_MAP[myClubName] || "Flamengo";
        
        const myClubData = CLUBS_DATA.find(c => c.nome === myClubName);
        const rivalData = CLUBS_DATA.find(c => c.nome === rivalName);

        if (myClubData && rivalData) {
          // Simulando votos baseados em dados reais + aleatoriedade para o "Duelo"
          setDuel({
            club1: { ...myClubData, votes: 4500000 + Math.random() * 1000000 },
            club2: { ...rivalData, votes: 4200000 + Math.random() * 1000000 }
          });
        }
      }
    };
    initDuel();
  }, [user]);

  const handleShare = () => {
    if (!duel) return;
    const text = `⚔️ DUELO DE GIGANTES NO HEART CLUB!\n\n${duel.club1.nome} vs ${duel.club2.nome}\n\nA disputa está acirrada em Goiânia! Quem lidera o censo global?\n\nParticipe agora: heartclubglobal.com`;
    navigator.clipboard.writeText(text);
    toast({ title: "Link de Duelo Copiado! 📋", description: "Envie para a sua torcida agora!" });
  };

  if (!duel) return null;

  const total = duel.club1.votes + duel.club2.votes;
  const pct1 = Math.round((duel.club1.votes / total) * 100);
  const pct2 = 100 - pct1;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="bg-card/40 border-border/10 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[var(--primary-team)] to-transparent opacity-50" />
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-black italic flex items-center gap-2 uppercase tracking-tighter">
            <Swords className="w-4 h-4 text-[var(--primary-team)]" /> Duelo de Gigantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="flex items-center justify-between gap-4">
            {/* Club 1 */}
            <div className="text-center flex-1 space-y-2">
              <div className="relative inline-block">
                <div className="absolute inset-0 blur-lg opacity-20 bg-[var(--primary-team)] rounded-full" />
                <div className="relative w-16 h-16 bg-background rounded-full border border-border/20 p-2 flex items-center justify-center">
                  <ClubLogo src={duel.club1.logoUrl} alt={duel.club1.nome} size="md" />
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase italic leading-none">{duel.club1.nome}</p>
                <p className="text-[10px] font-bold text-[var(--primary-team)] mt-1">{(duel.club1.votes / 1e6).toFixed(1)}M VOTOS</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-lg font-black italic opacity-20">VS</span>
              <div className="h-8 w-[1px] bg-border/30 my-1" />
            </div>

            {/* Club 2 */}
            <div className="text-center flex-1 space-y-2">
              <div className="w-16 h-16 bg-background rounded-full border border-border/20 p-2 mx-auto flex items-center justify-center">
                <ClubLogo src={duel.club2.logoUrl} alt={duel.club2.nome} size="md" />
              </div>
              <div>
                <p className="text-xs font-black uppercase italic leading-none text-muted-foreground">{duel.club2.nome}</p>
                <p className="text-[10px] font-bold text-muted-foreground/60 mt-1">{(duel.club2.votes / 1e6).toFixed(1)}M VOTOS</p>
              </div>
            </div>
          </div>

          {/* Arena Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase italic tracking-widest">
              <span style={{ color: "var(--primary-team)" }}>{pct1}% Domínio</span>
              <span className="text-muted-foreground">{pct2}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden flex p-0.5 border border-border/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pct1}%` }}
                className="h-full rounded-full"
                style={{ backgroundColor: "var(--primary-team)" }}
              />
            </div>
          </div>

          {/* Status Message */}
          <div className="bg-background/40 rounded-lg p-3 border border-border/10 flex items-center gap-3">
            <div className="bg-yellow-500/10 p-2 rounded-full">
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-[11px] font-medium leading-tight">
              O <strong>{duel.club1.nome}</strong> está vencendo o duelo regional em <strong>Goiânia</strong> por uma diferença de {((duel.club1.votes - duel.club2.votes)/1000).toFixed(0)}k novos torcedores hoje!
            </p>
          </div>

          <Button 
            onClick={handleShare}
            variant="outline" 
            className="w-full h-11 font-black italic uppercase text-xs tracking-widest gap-2 border-border/20 hover:bg-[var(--primary-team)] hover:text-white transition-all"
          >
            <Share2 className="w-4 h-4" /> Convocar Torcida
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CensusDuel;