import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, MapPin, RotateCcw, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import {
  countryFansData,
  countryFansMap,
  continentZoomTargets,
  isoToContinent,
} from "@/data/mockDashboard";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const TOP_HUBS = countryFansData
  .filter((c) => c.isTopHub)
  .map((c) => c.iso);

const MAX_FANS = Math.max(...countryFansData.map((c) => c.fans));

function formatFans(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function getCountryFill(iso: string): string {
  const fans = countryFansMap[iso];
  if (!fans) return "hsl(var(--primary) / 0.04)";
  const t = Math.max(0.12, fans / MAX_FANS);
  return `hsl(var(--primary) / ${t.toFixed(2)})`;
}

function getCountryStroke(iso: string): string {
  const fans = countryFansMap[iso];
  if (!fans) return "hsl(var(--border) / 0.3)";
  return "hsl(var(--border) / 0.5)";
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  fans: number;
}

const HeatmapSection = () => {
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeContinent, setActiveContinent] = useState<string | null>(null);

  // Detail panel data
  const detailCountries = useMemo(() => {
    if (!activeContinent) return [];
    return countryFansData
      .filter((c) => c.continent === activeContinent)
      .sort((a, b) => b.fans - a.fans);
  }, [activeContinent]);

  const handleZoomToContinent = useCallback((continentId: string) => {
    const target = continentZoomTargets[continentId];
    if (target) {
      setCenter(target.center);
      setZoom(target.zoom);
      setActiveContinent(continentId);
    }
  }, []);

  const handleReset = useCallback(() => {
    setCenter([0, 20]);
    setZoom(1);
    setActiveContinent(null);
  }, []);

  const handleZoomBrazil = useCallback(() => {
    setCenter([-50, -14]);
    setZoom(4);
    setActiveContinent("south-america");
  }, []);

  const handleGeographyClick = useCallback(
    (geo: any) => {
      const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
      const continent = isoToContinent[iso];
      if (continent) {
        handleZoomToContinent(continent);
      }
    },
    [handleZoomToContinent]
  );

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden relative">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Onde sua torcida está
              pulsando
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          {/* Floating Controls */}
          <div className="absolute top-2 right-3 z-20 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-[10px] backdrop-blur-md bg-secondary/70 border border-border/50"
              onClick={handleReset}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Visão Global
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-[10px] backdrop-blur-md bg-secondary/70 border border-border/50"
              onClick={handleZoomBrazil}
            >
              <MapPin className="w-3 h-3 mr-1" />
              Meu País
            </Button>
          </div>

          {/* Map Container */}
          <div
            className="relative w-full"
            style={{ background: "#0a0a0a", minHeight: 320 }}
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [0, 20] }}
              style={{ width: "100%", height: "auto" }}
            >
              <ZoomableGroup center={center} zoom={zoom}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const iso =
                        geo.properties.ISO_A3 || geo.properties.ADM0_A3;
                      const fans = countryFansMap[iso] || 0;
                      const isHub = TOP_HUBS.includes(iso);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getCountryFill(iso)}
                          stroke={getCountryStroke(iso)}
                          strokeWidth={0.4}
                          className={`outline-none cursor-pointer ${isHub ? "heatmap-pulse" : ""}`}
                          style={{
                            default: {
                              outline: "none",
                              filter: fans > MAX_FANS * 0.5
                                ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.6))"
                                : "none",
                              transition: "fill 300ms, filter 300ms",
                            },
                            hover: {
                              fill: fans
                                ? "hsl(var(--primary) / 0.85)"
                                : "hsl(var(--primary) / 0.15)",
                              outline: "none",
                              filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.7))",
                              cursor: "pointer",
                            },
                            pressed: { outline: "none" },
                          }}
                          onMouseEnter={(e) => {
                            if (fans > 0) {
                              const name =
                                countryFansData.find((c) => c.iso === iso)
                                  ?.name || geo.properties.NAME;
                              setTooltip({
                                x: e.clientX,
                                y: e.clientY,
                                name,
                                fans,
                              });
                            }
                          }}
                          onMouseMove={(e) => {
                            if (tooltip) {
                              setTooltip((prev) =>
                                prev
                                  ? { ...prev, x: e.clientX, y: e.clientY }
                                  : null
                              );
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => handleGeographyClick(geo)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm shadow-xl"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y - 40,
                }}
              >
                <p className="text-xs font-semibold text-foreground">
                  {tooltip.name}
                </p>
                <p className="text-[10px] text-primary font-medium">
                  {formatFans(tooltip.fans)} torcedores
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 z-10">
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                Menos Torcedores
              </span>
              <div
                className="flex-1 h-2 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, hsl(var(--primary) / 0.08), hsl(var(--primary) / 1))",
                }}
              />
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                Mais Torcedores
              </span>
            </div>
          </div>

          {/* Continent Detail Panel */}
          <AnimatePresence>
            {activeContinent && detailCountries.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-border/50"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground">
                      {continentZoomTargets[activeContinent]?.name}
                    </h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatFans(
                        detailCountries.reduce((s, c) => s + c.fans, 0)
                      )}{" "}
                      torcedores
                    </span>
                  </div>
                  {detailCountries.slice(0, 6).map((country, i) => {
                    const maxInContinent = detailCountries[0].fans;
                    return (
                      <motion.div
                        key={country.iso}
                        initial={{ x: -15, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="space-y-1"
                      >
                        <div className="flex justify-between text-[11px]">
                          <span className="text-foreground font-medium">
                            {country.name}
                          </span>
                          <span className="text-muted-foreground">
                            {formatFans(country.fans)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(country.fans / maxInContinent) * 100}%`,
                            }}
                            transition={{
                              duration: 0.6,
                              delay: i * 0.04,
                            }}
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

      {/* Pulse animation for top hubs */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.4)); }
          50% { filter: drop-shadow(0 0 12px hsl(var(--primary) / 0.8)); }
        }
        .heatmap-pulse {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }
      `}</style>
    </motion.div>
  );
};

export default HeatmapSection;
