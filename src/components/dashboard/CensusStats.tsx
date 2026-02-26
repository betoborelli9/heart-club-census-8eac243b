import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { mockCensusRanking, totalVotes } from "@/data/mockDashboard";

const CensusStats = () => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const targetNumber = 1450231;

  useEffect(() => {
    const startTime = performance.now();
    const duration = 2000;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * targetNumber));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, []);

  const chartData = mockCensusRanking.map((c) => ({
    name: c.emoji + " " + c.name,
    short: c.name.slice(0, 3).toUpperCase(),
    votes: c.votes,
  }));

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
      <Card className="glass-card border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 font-display">
            <BarChart3 className="w-4 h-4 text-primary" /> Censo Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div ref={ref} className="text-center py-3 rounded-xl glass-card border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Você é o torcedor nº</p>
            <motion.p
              className="text-3xl font-black text-gradient-orange tabular-nums font-display"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {count.toLocaleString("pt-BR")}
            </motion.p>
            <p className="text-[10px] text-muted-foreground mt-1">
              de {totalVotes.toLocaleString("pt-BR")} registrados
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Ranking Global de Votos
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={18}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? "hsl(24 100% 50%)" : "hsl(var(--muted))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CensusStats;
