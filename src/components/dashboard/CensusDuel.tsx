import { useState } from "react";
import { motion } from "framer-motion";
import { Swords, Share2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface DuelClub {
  name: string;
  votes: number;
  emoji: string;
}

const MOCK_CLUBS: Record<string, DuelClub> = {
  palmeiras: { name: "Palmeiras", votes: 5794000, emoji: "🟢" },
  flamengo: { name: "Flamengo", votes: 7200000, emoji: "🔴" },
  corinthians: { name: "Corinthians", votes: 6100000, emoji: "⚫" },
  "são paulo": { name: "São Paulo", votes: 4800000, emoji: "🔴" },
  santos: { name: "Santos", votes: 3200000, emoji: "⚪" },
  grêmio: { name: "Grêmio", votes: 2900000, emoji: "🔵" },
  internacional: { name: "Internacional", votes: 2700000, emoji: "🔴" },
  cruzeiro: { name: "Cruzeiro", votes: 2500000, emoji: "🔵" },
  atlético: { name: "Atlético-MG", votes: 2300000, emoji: "⚫" },
  vasco: { name: "Vasco", votes: 2100000, emoji: "⚫" },
};

const CensusDuel = () => {
  const { toast } = useToast();
  const [club1Input, setClub1Input] = useState("");
  const [club2Input, setClub2Input] = useState("");
  const [duel, setDuel] = useState<{ club1: DuelClub; club2: DuelClub } | null>(null);

  const findClub = (input: string): DuelClub | null => {
    const key = input.toLowerCase().trim();
    return MOCK_CLUBS[key] || Object.values(MOCK_CLUBS).find(
      c => c.name.toLowerCase().includes(key)
    ) || null;
  };

  const handleDuel = () => {
    const c1 = findClub(club1Input);
    const c2 = findClub(club2Input);
    if (!c1 || !c2) {
      toast({ variant: "destructive", title: "Clube não encontrado", description: "Tente nomes como 'Palmeiras', 'Flamengo', etc." });
      return;
    }
    if (c1.name === c2.name) {
      toast({ variant: "destructive", title: "Selecione clubes diferentes" });
      return;
    }
    setDuel({ club1: c1, club2: c2 });
  };

  const handleShare = () => {
    if (!duel) return;
    const text = `⚔️ Duelo de Censo Heart Club!\n${duel.club1.emoji} ${duel.club1.name}: ${(duel.club1.votes / 1e6).toFixed(1)}M\nvs\n${duel.club2.emoji} ${duel.club2.name}: ${(duel.club2.votes / 1e6).toFixed(1)}M\n\n🏆 ${duel.club1.votes > duel.club2.votes ? duel.club1.name : duel.club2.name} lidera!\n\nDescubra em heartclubglobal.com`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado! 📋", description: "Compartilhe no WhatsApp ou redes sociais." });
  };

  const pct1 = duel ? Math.round((duel.club1.votes / (duel.club1.votes + duel.club2.votes)) * 100) : 0;
  const pct2 = duel ? 100 - pct1 : 0;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 font-display">
            <Swords className="w-4 h-4 text-primary" /> Duelo de Censo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Compare a torcida de dois clubes e compartilhe o resultado!
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Clube 1..."
              value={club1Input}
              onChange={(e) => setClub1Input(e.target.value)}
              className="h-10 bg-secondary/30 border-border/30 text-sm"
            />
            <Input
              placeholder="Clube 2..."
              value={club2Input}
              onChange={(e) => setClub2Input(e.target.value)}
              className="h-10 bg-secondary/30 border-border/30 text-sm"
            />
          </div>
          <Button
            className="w-full btn-orange-gradient"
            onClick={handleDuel}
            disabled={!club1Input.trim() || !club2Input.trim()}
          >
            <Swords className="w-4 h-4 mr-2" /> Comparar
          </Button>

          {duel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-2"
            >
              {/* VS Display */}
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <span className="text-2xl">{duel.club1.emoji}</span>
                  <p className="text-sm font-bold text-foreground">{duel.club1.name}</p>
                  <p className="text-xs text-primary font-black">{(duel.club1.votes / 1e6).toFixed(1)}M</p>
                </div>
                <div className="px-3">
                  <span className="text-lg font-black text-muted-foreground">VS</span>
                </div>
                <div className="text-center flex-1">
                  <span className="text-2xl">{duel.club2.emoji}</span>
                  <p className="text-sm font-bold text-foreground">{duel.club2.name}</p>
                  <p className="text-xs text-muted-foreground font-black">{(duel.club2.votes / 1e6).toFixed(1)}M</p>
                </div>
              </div>

              {/* Bar */}
              <div className="flex gap-0.5 h-5 rounded-full overflow-hidden">
                <motion.div
                  className="flex items-center justify-center text-[10px] font-bold text-primary-foreground rounded-l-full"
                  style={{ background: "var(--gradient-orange)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct1}%` }}
                  transition={{ duration: 0.8 }}
                >
                  {pct1}%
                </motion.div>
                <motion.div
                  className="bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground rounded-r-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct2}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  {pct2}%
                </motion.div>
              </div>

              {/* Winner */}
              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-1.5">
                  {duel.club1.votes > duel.club2.votes ? (
                    <TrendingUp className="w-4 h-4 text-primary" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-sm font-bold text-foreground">
                    {duel.club1.votes > duel.club2.votes ? duel.club1.name : duel.club2.name} lidera por{" "}
                    {((Math.abs(duel.club1.votes - duel.club2.votes)) / 1e6).toFixed(1)}M votos
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 border-border/50"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" /> Compartilhar Duelo
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CensusDuel;
