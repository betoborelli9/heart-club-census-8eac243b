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
const MAX_RADIUS = 32;

function formatFans(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString("pt-BR")}K`;
  return n.toLocaleString("pt-BR");
}

function getHeatRadius(fans: number): number {
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

  const handleCountryClick = useCallback(
    (name: string, fans: number, continent: string, e: React.MouseEvent) => {
      setTooltip({ x: e.clientX, y: e.clientY, name, fans, continent });
      handleZoomToContinent(continent);
    },
    [handleZoomToContinent]
  );

  const handleGeographyClick = useCallback(
    (geo: any, e: React.MouseEvent) => {
      const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
      const continent = isoToContinent[iso];
      const fans = countryFansMap[iso] || 0;
      const name = geo.properties.NAME || iso;
      if (continent) {
        handleCountryClick(name, fans, continent, e);
      }
    },
    [handleCountryClick]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
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
            style={{ background: "#080808", minHeight: 320 }}
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [0, 20] }}
              style={{ width: "100%", height: "auto" }}
            >
              <defs>
                {/* Heat glow gradients - large soft blur */}
                <radialGradient id="heat-large" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#006437" stopOpacity={0.8} />
                  <stop offset="30%" stopColor="#006437" stopOpacity={0.45} />
                  <stop offset="60%" stopColor="#006437" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#006437" stopOpacity={0} />
                </radialGradient>
                <radialGradient id="heat-medium" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#006437" stopOpacity={0.65} />
                  <stop offset="35%" stopColor="#006437" stopOpacity={0.3} />
                  <stop offset="70%" stopColor="#006437" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#006437" stopOpacity={0} />
                </radialGradient>
                <radialGradient id="heat-small" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#006437" stopOpacity={0.5} />
                  <stop offset="40%" stopColor="#006437" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#006437" stopOpacity={0} />
                </radialGradient>
                {/* SVG blur filter for smoke effect */}
                <filter id="heat-blur">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                </filter>
                <filter id="heat-blur-large">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                </filter>
              </defs>
              <ZoomableGroup center={center} zoom={zoom}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#151515"
                        stroke="#333333"
                        strokeWidth={0.4}
                        className="outline-none cursor-pointer"
                        style={{
                          default: { outline: "none" },
                          hover: {
                            fill: "#1a2a1e",
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: { outline: "none" },
                        }}
                        onClick={(e) => handleGeographyClick(geo, e as any)}
                      />
                    ))
                  }
                </Geographies>

                {/* Static heat spots - sorted smallest first so large ones render on top */}
                {[...countryFansData]
                  .sort((a, b) => a.fans - b.fans)
                  .map((country) => {
                    const r = getHeatRadius(country.fans);
                    const intensity = country.fans / MAX_FANS;
                    const gradientId =
                      intensity > 0.3
                        ? "heat-large"
                        : intensity > 0.05
                          ? "heat-medium"
                          : "heat-small";
                    const blurId =
                      intensity > 0.3 ? "heat-blur-large" : "heat-blur";
                    // Larger visual radius with heavy blur for smoke/heat effect
                    const visualR = r * 2.2;

                    return (
                      <Marker
                        key={country.iso}
                        coordinates={[country.lng, country.lat]}
                      >
                        {/* Outer soft heat cloud */}
                        <circle
                          r={visualR}
                          fill={`url(#${gradientId})`}
                          filter={`url(#${blurId})`}
                          style={{ pointerEvents: "none" }}
                        />
                        {/* Inner brighter core */}
                        <circle
                          r={r * 0.5}
                          fill="#006437"
                          opacity={0.4 + intensity * 0.4}
                          filter="url(#heat-blur)"
                          style={{ pointerEvents: "none" }}
                        />
                        {/* Clickable invisible hit area */}
                        <circle
                          r={Math.max(r, 8)}
                          fill="transparent"
                          style={{ pointerEvents: "all", cursor: "pointer" }}
                          onClick={(e) =>
                            handleCountryClick(
                              country.name,
                              country.fans,
                              country.continent,
                              e as any
                            )
                          }
                        />
                      </Marker>
                    );
                  })}
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed z-50 pointer-events-none px-4 py-2.5 rounded-lg border border-border/40 bg-card/95 backdrop-blur-md shadow-2xl"
                  style={{
                    left: tooltip.x + 14,
                    top: tooltip.y - 48,
                  }}
                >
                  <p className="text-xs font-bold text-foreground">
                    {tooltip.name}
                  </p>
                  <p className="text-[11px] text-primary font-semibold">
                    {formatFans(tooltip.fans)} torcedores
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 z-10">
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                Menos Torcedores
              </span>
              <div
                className="flex-1 h-2 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, #0a1a0a, #003d22, #006437, #00ff6a)",
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
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
                            transition={{ duration: 0.5, delay: i * 0.05 }}
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

export default HeatmapSection;
