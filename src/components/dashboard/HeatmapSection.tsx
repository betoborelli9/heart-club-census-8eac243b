// Path: src/components/dashboard/HeatmapSection.tsx
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ===== Color scale: Dinâmica baseada no time =====
function getRegionColor(votes: number, maxVotes: number, primaryColor: string): string {
  if (!votes || !maxVotes) return "#2A2A2A";
  const ratio = Math.min(votes / maxVotes, 1);
  // Interpolação simples: de cinza escuro para a cor do time
  return ratio > 0.1 ? primaryColor : "#3A3A3A";
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

const HeatmapSection = () => {
  const { user } = useUser();
  const [selectedClubId, setSelectedClubId] = useState("palmeiras");
  const [searchOpen, setSearchOpen] = useState(false);
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("country"); // Começa no país
  const [activeContinent, setActiveContinent] = useState<string | null>("south-america");
  const [activeCountryIso, setActiveCountryIso] = useState<string | null>("BRA");
  const [activeStateName, setActiveStateName] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([-55, -15]); // Foco no Brasil
  const [zoom, setZoom] = useState(3);
  const [tooltip, setTooltip] = useState<any>(null);

  // Carregar o time do usuário para as cores
  useEffect(() => {
    const loadUserVote = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      if (data?.clube_nome) {
        const club = clubs.find(c => c.name === data.clube_nome);
        if (club) setSelectedClubId(club.id);
      }
    };
    loadUserVote();
  }, [user]);

  const mapData = clubMapData[selectedClubId] || clubMapData["palmeiras"];
  const primaryColor = "var(--primary-team)";

  const { countryVotesMap, maxVotes } = useMemo(() => {
    const map: Record<string, number> = {};
    let max = 0;
    Object.values(mapData.continents).forEach(continent => {
      Object.entries(continent.countries).forEach(([iso, country]) => {
        map[iso] = country.votes;
        if (country.votes > max) max = country.votes;
      });
    });
    return { countryVotesMap: map, maxVotes: max };
  }, [mapData]);

  const activeStates = useMemo(() => {
    return mapData.continents["south-america"]?.countries["BRA"]?.states?.sort((a, b) => b.votes - a.votes) || [];
  }, [mapData]);

  const navigateTo = useCallback((item: BreadcrumbItem) => {
    setDrillLevel(item.level);
    if (item.level === "world") {
      setCenter([0, 20]); setZoom(1);
    } else if (item.level === "country") {
      setCenter([-55, -15]); setZoom(3);
    }
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="overflow-hidden border-border/10 bg-card/30 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black italic flex items-center gap-2 uppercase tracking-tighter">
              <Globe className="w-4 h-4" style={{ color: primaryColor }} /> Radar de Engajamento
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => navigateTo({label: "Mundo", level: "world"})}>Global</Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase border-primary/50" style={{ color: primaryColor }} onClick={() => navigateTo({label: "Brasil", level: "country"})}>Brasil</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative w-full overflow-hidden" style={{ background: "#0f0f0f", height: 350 }}>
            <ComposableMap projection="geoMercator" style={{ width: "100%", height: "100%" }}>
              <ZoomableGroup center={center} zoom={zoom}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
                      const votes = countryVotesMap[iso] || 0;
                      const isTarget = iso === "BRA";
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getRegionColor(votes, maxVotes, "var(--primary-team)")}
                          stroke={isTarget ? primaryColor : "#333"}
                          strokeWidth={isTarget ? 0.5 : 0.2}
                          style={{
                            hover: { fill: primaryColor, outline: "none" },
                            default: { outline: "none" }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {/* Overlay de Dados de Goiás/Goiânia se disponível */}
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-4">
               <div className="bg-background/80 backdrop-blur-md p-3 rounded-lg border border-border/10">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Destaque Regional</p>
                  <p className="text-xs font-bold text-foreground">Goiânia, GO</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                       <div className="h-full bg-primary" style={{ width: '85%', backgroundColor: primaryColor }} />
                    </div>
                    <span className="text-[10px] font-black" style={{ color: primaryColor }}>Top 3</span>
                  </div>
               </div>
               <div className="bg-background/80 backdrop-blur-md p-3 rounded-lg border border-border/10">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Total Brasil</p>
                  <p className="text-xs font-bold text-foreground">{formatVotes(mapData.continents["south-america"]?.countries["BRA"]?.votes || 0)} Torcedores</p>
                  <p className="text-[9px] text-green-500 font-bold mt-1">+4.2% esta semana</p>
               </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/5">
            <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="w-3 h-3" /> Ranking por Estado
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {activeStates.slice(0, 6).map((state, i) => (
                <div key={state.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>{state.name}</span>
                    <span style={{ color: primaryColor }}>{formatVotes(state.votes)}</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${(state.votes / activeStates[0].votes) * 100}%` }}
                      className="h-full" 
                      style={{ backgroundColor: primaryColor }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default HeatmapSection;