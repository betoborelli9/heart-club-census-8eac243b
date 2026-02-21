import { motion } from "framer-motion";
import { Calendar, MapPin, Tv, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mockMatch } from "@/data/mockDashboard";

const MatchCenter = () => {
  const m = mockMatch;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Match Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Teams & Score */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-4xl">{m.homeTeam.emoji}</span>
              <span className="font-black text-foreground text-sm">{m.homeTeam.shortName}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-lg font-bold text-primary">{m.time}</span>
              <span className="text-xs text-muted-foreground">{m.date}</span>
              <span className="text-[10px] text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full">
                {m.competition}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-4xl">{m.awayTeam.emoji}</span>
              <span className="font-black text-foreground text-sm">{m.awayTeam.shortName}</span>
            </div>
          </div>

          {/* Stadium */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{m.stadium} • {m.city}</span>
          </div>

          {/* Probabilities */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Probabilidade</p>
            <div className="flex gap-1 h-6 rounded-full overflow-hidden">
              <motion.div
                className="bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                initial={{ width: 0 }}
                animate={{ width: `${m.probabilities.home}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                {m.probabilities.home}%
              </motion.div>
              <motion.div
                className="bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground"
                initial={{ width: 0 }}
                animate={{ width: `${m.probabilities.draw}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              >
                {m.probabilities.draw}%
              </motion.div>
              <motion.div
                className="bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground"
                initial={{ width: 0 }}
                animate={{ width: `${m.probabilities.away}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
              >
                {m.probabilities.away}%
              </motion.div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{m.homeTeam.shortName}</span>
              <span>Empate</span>
              <span>{m.awayTeam.shortName}</span>
            </div>
          </div>

          {/* Broadcasters */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5" /> Onde Assistir
            </p>
            <div className="flex flex-wrap gap-2">
              {m.broadcasters.map((b) => (
                <span
                  key={b.name}
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: b.bgColor, color: b.color }}
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>

          {/* Lineup */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Escalação Provável ({m.lineup.formation})
            </p>
            <div className="relative bg-gradient-to-b from-primary/10 to-primary/5 rounded-xl p-4 min-h-[220px]">
              {/* GK */}
              <div className="flex justify-center mb-3">
                <PlayerBadge player={m.lineup.players[0]} />
              </div>
              {/* DEF */}
              <div className="flex justify-around mb-3">
                {m.lineup.players.slice(1, 5).map((p) => (
                  <PlayerBadge key={p.number} player={p} />
                ))}
              </div>
              {/* MID */}
              <div className="flex justify-around mb-3 px-6">
                {m.lineup.players.slice(5, 8).map((p) => (
                  <PlayerBadge key={p.number} player={p} />
                ))}
              </div>
              {/* ATK */}
              <div className="flex justify-around px-4">
                {m.lineup.players.slice(8, 11).map((p) => (
                  <PlayerBadge key={p.number} player={p} />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

function PlayerBadge({ player }: { player: { name: string; number: number; position: string } }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
        {player.number}
      </div>
      <span className="text-[9px] text-foreground font-medium text-center leading-tight max-w-[50px] truncate">
        {player.name.split(" ").pop()}
      </span>
    </div>
  );
}

export default MatchCenter;
