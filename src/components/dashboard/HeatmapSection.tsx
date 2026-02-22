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
  Marker,
} from "react-simple-maps";
import {
  countryFansData,
  countryFansMap,
  continentZoomTargets,
  isoToContinent,
} from "@/data/mockDashboard";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MAX_FANS = Math.max(...countryFansData.map((c) => c.fans));
const MAX_RADIUS = 28;

function formatFans(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function getCircleRadius(fans: number): number {
  return Math.sqrt(fans / MAX_FANS) * MAX_RADIUS;
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  fans: number;
  continent?: string;
}

const HeatmapSection = () => {
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeContinent, setActiveContinent] = useState<string | null>(null);

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
              <defs>
                <radialGradient id="glow-green" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#006437" stopOpacity={0.9} />
                  <stop offset="40%" stopColor="#006437" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#006437" stopOpacity={0} />
                </radialGradient>
                <radialGradient id="glow-green-bright" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00ff6a" stopOpacity={0.95} />
                  <stop offset="25%" stopColor="#006437" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#006437" stopOpacity={0} />
                </radialGradient>
              </defs>
              <ZoomableGroup center={center} zoom={zoom}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const iso =
                        geo.properties.ISO_A3 || geo.properties.ADM0_A3;
                      const fans = countryFansMap[iso] || 0;
                      const continent = isoToContinent[iso];
                      const isHoveredContinent =
                        activeContinent && continent === activeContinent;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={
                            isHoveredContinent
                              ? "hsl(var(--primary) / 0.08)"
                              : fans > 0
                                ? "hsl(var(--primary) / 0.03)"
                                : "hsl(var(--primary) / 0.015)"
                          }
                          stroke="hsl(var(--border) / 0.2)"
                          strokeWidth={0.3}
                          className="outline-none cursor-pointer"
                          style={{
                            default: {
                              outline: "none",
                              transition: "fill 300ms",
                            },
                            hover: {
                              fill: "hsl(var(--primary) / 0.12)",
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: { outline: "none" },
                          }}
                          onMouseEnter={(e) => {
                            if (continent) {
                              const cName =
                                continentZoomTargets[continent]?.name || continent;
                              const totalFans = countryFansData
                                .filter((c) => c.continent === continent)
                                .reduce((s, c) => s + c.fans, 0);
                              setTooltip({
                                x: e.clientX,
                                y: e.clientY,
                                name: cName,
                                fans: totalFans,
                                continent,
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

                {/* Glow Circles */}
                {countryFansData.map((country) => {
                  const r = getCircleRadius(country.fans);
                  const isTop = country.isTopHub;
                  return (
                    <Marker
                      key={country.iso}
                      coordinates={[country.lng, country.lat]}
                    >
                      <circle
                        r={r}
                        fill={isTop ? "url(#glow-green-bright)" : "url(#glow-green)"}
                        className={isTop ? "heatmap-circle-pulse" : ""}
                        style={{
                          pointerEvents: "all",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          setTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            name: country.name,
                            fans: country.fans,
                            continent: country.continent,
                          });
                        }}
                        onMouseMove={(e) => {
                          setTooltip((prev) =>
                            prev
                              ? { ...prev, x: e.clientX, y: e.clientY }
                              : null
                          );
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() =>
                          handleZoomToContinent(country.continent)
                        }
                      />
                      {/* Inner bright core for top hubs */}
                      {isTop && (
                        <circle
                          r={r * 0.2}
                          fill="#00ff6a"
                          opacity={0.8}
                          className="heatmap-core-pulse"
                          style={{ pointerEvents: "none" }}
                        />
                      )}
                    </Marker>
                  );
                })}
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
                  {tooltip.continent
                    ? `Continente: ${continentZoomTargets[tooltip.continent]?.name || tooltip.continent}`
                    : tooltip.name}
                </p>
                <p className="text-[10px] text-primary font-medium">
                  {tooltip.name} | {formatFans(tooltip.fans)} torcedores
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
                    "linear-gradient(to right, #0a1a0a, #006437, #00ff6a)",
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

      {/* Pulse animations for glow circles */}
      <style>{`
        @keyframes circle-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }
        }
        @keyframes core-pulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }
        .heatmap-circle-pulse {
          transform-origin: center;
          animation: circle-pulse 2.5s ease-in-out infinite;
        }
        .heatmap-core-pulse {
          transform-origin: center;
          animation: core-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </motion.div>
  );
};

export default HeatmapSection;
