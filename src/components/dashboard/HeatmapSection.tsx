import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, MapPin, RotateCcw, ChevronRight, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import {
  clubMapData,
  continentZoomTargets,
  isoToContinentMap,
  type ClubMapData,
  type StateMapData,
} from "@/data/mockDashboard";
import { clubs } from "@/data/clubs";


const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ===== Color scale: orange gradient =====
function getRegionColor(votes: number, maxVotes: number): string {
  if (!votes || !maxVotes) return "#E5E7EB";
  const ratio = Math.min(votes / maxVotes, 1);
  // Interpolate from #FBB040 (orange medium) to #F36100 (burnt orange)
  const r = Math.round(251 + (243 - 251) * ratio);
  const g = Math.round(176 + (97 - 176) * ratio);
  const b = Math.round(64 + (0 - 64) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatVotes(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString("pt-BR")}K`;
  return n.toLocaleString("pt-BR");
}

type DrillLevel = "world" | "continent" | "country" | "state" | "city";

interface BreadcrumbItem {
  label: string;
  level: DrillLevel;
  continentId?: string;
  countryIso?: string;
  stateName?: string;
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  votes: number;
}

interface HeatmapSectionProps {
  data?: ClubMapData;
}

const HeatmapSection = ({ data: externalData }: HeatmapSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Club selection
  const defaultClubId = "palmeiras";
  const [selectedClubId, setSelectedClubId] = useState(defaultClubId);
  const [searchOpen, setSearchOpen] = useState(false);

  // Map data
  const mapData = externalData || clubMapData[selectedClubId] || clubMapData["palmeiras"];

  // Drill-down state
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("world");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { label: "Mundo", level: "world" },
  ]);
  const [activeContinent, setActiveContinent] = useState<string | null>(null);
  const [activeCountryIso, setActiveCountryIso] = useState<string | null>(null);
  const [activeStateName, setActiveStateName] = useState<string | null>(null);

  // Map zoom
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(1);

  // Tooltip
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Compute max votes at current level for color scaling
  const { countryVotesMap, maxVotes } = useMemo(() => {
    const map: Record<string, number> = {};
    let max = 0;
    for (const [, continent] of Object.entries(mapData.continents)) {
      for (const [iso, country] of Object.entries(continent.countries)) {
        map[iso] = country.votes;
        if (country.votes > max) max = country.votes;
      }
    }
    return { countryVotesMap: map, maxVotes: max };
  }, [mapData]);

  // Get states for a country
  const activeStates = useMemo(() => {
    if (!activeContinent || !activeCountryIso) return [];
    const continent = mapData.continents[activeContinent];
    if (!continent) return [];
    const country = continent.countries[activeCountryIso];
    return country?.states?.sort((a, b) => b.votes - a.votes) || [];
  }, [mapData, activeContinent, activeCountryIso]);

  // Get cities for a state
  const activeCities = useMemo(() => {
    if (!activeStateName) return [];
    const state = activeStates.find((s) => s.name === activeStateName);
    return state?.cities?.sort((a, b) => b.votes - a.votes) || [];
  }, [activeStates, activeStateName]);

  // Navigation handlers
  const navigateTo = useCallback(
    (item: BreadcrumbItem) => {
      setDrillLevel(item.level);
      setTooltip(null);

      if (item.level === "world") {
        setCenter([0, 20]);
        setZoom(1);
        setActiveContinent(null);
        setActiveCountryIso(null);
        setActiveStateName(null);
        setBreadcrumbs([{ label: "Mundo", level: "world" }]);
      } else if (item.level === "continent" && item.continentId) {
        const target = continentZoomTargets[item.continentId];
        if (target) {
          setCenter(target.center);
          setZoom(target.zoom);
        }
        setActiveContinent(item.continentId);
        setActiveCountryIso(null);
        setActiveStateName(null);
        setBreadcrumbs([
          { label: "Mundo", level: "world" },
          { label: continentZoomTargets[item.continentId]?.name || item.continentId, level: "continent", continentId: item.continentId },
        ]);
      } else if (item.level === "country" && item.continentId && item.countryIso) {
        setActiveCountryIso(item.countryIso);
        setActiveStateName(null);
        setBreadcrumbs((prev) => prev.slice(0, 2).concat({
          label: mapData.continents[item.continentId!]?.countries[item.countryIso!]?.name || item.countryIso!,
          level: "country",
          continentId: item.continentId,
          countryIso: item.countryIso,
        }));
      }
    },
    [mapData]
  );

  const handleGeographyClick = useCallback(
    (geo: any) => {
      const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
      const continentId = isoToContinentMap[iso];
      if (!continentId) return;

      if (drillLevel === "world") {
        // Drill to continent
        navigateTo({ label: "", level: "continent", continentId });
      } else if (drillLevel === "continent" && activeContinent === continentId) {
        // Drill to country
        const country = mapData.continents[continentId]?.countries[iso];
        if (country) {
          navigateTo({
            label: country.name,
            level: "country",
            continentId,
            countryIso: iso,
          });
        }
      }
    },
    [drillLevel, activeContinent, navigateTo, mapData]
  );

  const handleGeographyHover = useCallback(
    (geo: any, e: React.MouseEvent) => {
      const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
      const votes = countryVotesMap[iso];
      const name = geo.properties.NAME || iso;
      if (votes) {
        setTooltip({ x: e.clientX, y: e.clientY, name, votes });
      }
    },
    [countryVotesMap]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
    }
  }, [tooltip]);

  const handleReset = useCallback(() => {
    navigateTo({ label: "Mundo", level: "world" });
  }, [navigateTo]);

  const handleZoomBrazil = useCallback(() => {
    navigateTo({ label: "", level: "continent", continentId: "south-america" });
    // Then immediately drill to Brazil
    setTimeout(() => {
      navigateTo({
        label: "Brasil",
        level: "country",
        continentId: "south-america",
        countryIso: "BRA",
      });
    }, 100);
  }, [navigateTo]);

  const handleSelectClub = useCallback(
    (clubId: string) => {
      setSelectedClubId(clubId);
      setSearchOpen(false);
      handleReset();
    },
    [handleReset]
  );

  const handleStateDrill = useCallback(
    (state: StateMapData) => {
      setActiveStateName(state.name);
      setDrillLevel("state");
      setBreadcrumbs((prev) => [
        ...prev.slice(0, 3),
        {
          label: state.name,
          level: "state" as DrillLevel,
          continentId: activeContinent || undefined,
          countryIso: activeCountryIso || undefined,
          stateName: state.name,
        },
      ]);
    },
    [activeContinent, activeCountryIso]
  );

  // Detail panel content based on drill level
  const detailPanel = useMemo(() => {
    if (drillLevel === "continent" && activeContinent) {
      const continent = mapData.continents[activeContinent];
      if (!continent) return null;
      const countries = Object.entries(continent.countries)
        .map(([iso, c]) => ({ iso, ...c }))
        .sort((a, b) => b.votes - a.votes);
      const maxInList = countries[0]?.votes || 1;
      return {
        title: continent.name,
        totalVotes: continent.votes,
        items: countries.map((c) => ({
          key: c.iso,
          name: c.name,
          votes: c.votes,
          pct: c.votes / maxInList,
          onClick: () =>
            navigateTo({
              label: c.name,
              level: "country",
              continentId: activeContinent,
              countryIso: c.iso,
            }),
          hasChildren: !!mapData.continents[activeContinent]?.countries[c.iso]?.states?.length,
        })),
      };
    }
    if (drillLevel === "country" && activeStates.length > 0) {
      const continent = mapData.continents[activeContinent!];
      const country = continent?.countries[activeCountryIso!];
      if (!country) return null;
      const maxInList = activeStates[0]?.votes || 1;
      return {
        title: country.name,
        totalVotes: country.votes,
        items: activeStates.map((s) => ({
          key: s.name,
          name: s.name,
          votes: s.votes,
          pct: s.votes / maxInList,
          onClick: s.cities?.length ? () => handleStateDrill(s) : undefined,
          hasChildren: !!s.cities?.length,
        })),
      };
    }
    if (drillLevel === "state" && activeCities.length > 0) {
      const state = activeStates.find((s) => s.name === activeStateName);
      if (!state) return null;
      const maxInList = activeCities[0]?.votes || 1;
      return {
        title: state.name,
        totalVotes: state.votes,
        items: activeCities.map((c) => ({
          key: c.name,
          name: c.name,
          votes: c.votes,
          pct: c.votes / maxInList,
          hasChildren: false,
          onClick: undefined as (() => void) | undefined,
        })),
      };
    }
    return null;
  }, [drillLevel, activeContinent, activeCountryIso, activeStateName, mapData, activeStates, activeCities, navigateTo, handleStateDrill]);

  const selectedClub = clubs.find((c) => c.id === selectedClubId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="overflow-hidden relative">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Mapa de Torcedores
            </CardTitle>

            {/* Club Search/Autocomplete */}
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1.5 min-w-[120px] justify-start"
                >
                  <Search className="w-3 h-3" />
                  {selectedClub ? (
                    <span>
                      {selectedClub.emoji} {selectedClub.shortName}
                    </span>
                  ) : (
                    "Buscar clube..."
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[220px]" align="end">
                <Command>
                  <CommandInput placeholder="Buscar clube..." className="h-9 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-xs py-3">
                      Nenhum clube encontrado.
                    </CommandEmpty>
                    <CommandGroup>
                      {clubs
                        .filter((c) => clubMapData[c.id])
                        .map((club) => (
                          <CommandItem
                            key={club.id}
                            value={club.name}
                            onSelect={() => handleSelectClub(club.id)}
                            className="text-xs cursor-pointer"
                          >
                            <span className="mr-2">{club.emoji}</span>
                            {club.name}
                            <span className="ml-auto text-muted-foreground text-[10px]">
                              {club.state}
                            </span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 mt-2 overflow-x-auto scrollbar-none">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
                <button
                  onClick={() => navigateTo(bc)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    i === breadcrumbs.length - 1
                      ? "text-foreground font-semibold bg-accent/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {bc.label}
                </button>
              </span>
            ))}
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
            ref={containerRef}
            className="relative w-full"
            style={{ background: "#1a1a1a", minHeight: 320 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [0, 20] }}
              style={{ width: "100%", height: "auto" }}
            >
              <ZoomableGroup
                center={center}
                zoom={zoom}
                maxZoom={8}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const iso =
                        geo.properties.ISO_A3 || geo.properties.ADM0_A3;
                      const votes = countryVotesMap[iso] || 0;
                      const fillColor = getRegionColor(votes, maxVotes);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke="#555"
                          strokeWidth={0.3}
                          className="outline-none cursor-pointer"
                          style={{
                            default: { outline: "none" },
                            hover: {
                              stroke: "#fff",
                              strokeWidth: 1.2,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: { outline: "none" },
                          }}
                          onClick={() => handleGeographyClick(geo)}
                          onMouseEnter={(e) => handleGeographyHover(geo, e as any)}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg border border-border/40 bg-card/95 backdrop-blur-md shadow-xl"
                  style={{
                    left: tooltip.x + 14,
                    top: tooltip.y - 44,
                  }}
                >
                  <p className="text-xs font-bold text-foreground">
                    {tooltip.name}
                  </p>
                  <p className="text-[11px] font-semibold" style={{ color: "#F36100" }}>
                    {formatVotes(tooltip.votes)} votos
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
                    "linear-gradient(to right, #E5E7EB, #FBB040, #F36100)",
                }}
              />
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                Mais Torcedores
              </span>
            </div>
          </div>

          {/* Detail Panel */}
          <AnimatePresence>
            {detailPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-border/50"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4" style={{ color: "#F36100" }} />
                    <h3 className="text-xs font-bold text-foreground">
                      {detailPanel.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatVotes(detailPanel.totalVotes)} votos
                    </span>
                  </div>
                  {detailPanel.items.slice(0, 8).map((item, i) => (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`space-y-1 ${item.onClick ? "cursor-pointer" : ""}`}
                      onClick={item.onClick}
                    >
                      <div className="flex justify-between text-[11px]">
                        <span className="text-foreground font-medium flex items-center gap-1">
                          {item.name}
                          {item.hasChildren && (
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {formatVotes(item.votes)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: "linear-gradient(to right, #FBB040, #F36100)",
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${item.pct * 100}%`,
                          }}
                          transition={{ duration: 0.5, delay: i * 0.04 }}
                        />
                      </div>
                    </motion.div>
                  ))}
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