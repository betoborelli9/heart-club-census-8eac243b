import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { mockContinents, ContinentData } from "@/data/mockDashboard";

const HeatmapSection = () => {
  const [selected, setSelected] = useState<ContinentData | null>(null);
  const maxFans = Math.max(...mockContinents.map((c) => c.fans));

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Onde sua torcida está pulsando
            </CardTitle>
            {selected && (
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-xs h-7">
                <ArrowLeft className="w-3 h-3 mr-1" /> Voltar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {/* SVG World Map */}
                <svg viewBox="100 80 750 380" className="w-full h-auto">
                  {mockContinents.map((continent) => {
                    const opacity = 0.3 + (continent.fans / maxFans) * 0.7;
                    return (
                      <g key={continent.id}>
                        <motion.path
                          d={continent.path}
                          fill={`hsl(var(--primary) / ${opacity})`}
                          stroke="hsl(var(--border))"
                          strokeWidth="1"
                          className="cursor-pointer"
                          whileHover={{ scale: 1.03, filter: "brightness(1.3)" }}
                          onClick={() => setSelected(continent)}
                          style={{ transformOrigin: "center" }}
                        />
                        <text
                          x={getCenter(continent.path).x}
                          y={getCenter(continent.path).y}
                          textAnchor="middle"
                          className="fill-foreground text-[8px] font-bold pointer-events-none select-none"
                        >
                          {formatFans(continent.fans)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Clique em um continente para ver detalhes
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{selected.name}</h3>
                    <p className="text-xs text-muted-foreground">{formatFans(selected.fans)} torcedores</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {selected.countries.map((country, i) => {
                    const maxCountry = selected.countries[0].fans;
                    return (
                      <motion.div
                        key={country.name}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="space-y-1"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground font-medium">{country.name}</span>
                          <span className="text-muted-foreground">{formatFans(country.fans)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(country.fans / maxCountry) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

function getCenter(path: string) {
  const coords = path.match(/[\d.]+/g)?.map(Number) || [];
  let sumX = 0, sumY = 0, count = 0;
  for (let i = 0; i < coords.length; i += 2) {
    sumX += coords[i];
    sumY += coords[i + 1];
    count++;
  }
  return { x: sumX / count, y: sumY / count };
}

function formatFans(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export default HeatmapSection;
