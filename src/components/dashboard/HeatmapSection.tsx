import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, MapPin, Users, ChevronRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { clubMapData } from "@/data/mockDashboard";
import { CLUBS_DATA } from "@/clubes-data";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import AddressModal from "@/components/AddressModal";

const WORLD_GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BRAZIL_STATES_GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

type DrillLevel = "country" | "state" | "city";

const STATE_UF: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
  "espirito santo": "ES", "goias": "GO", "maranhao": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
  "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE", "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
  "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR", "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO",
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function getBrasaColor(votes: number): string {
  if (votes === 0) return "hsl(var(--heat-empty))";
  if (votes <= 10) return "hsl(var(--heat-low))";
  if (votes <= 100) return "hsl(var(--heat-mid))";
  return "hsl(var(--heat-high))";
}

function formatVotes(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString("pt-BR")}K`;
  return n.toLocaleString("pt-BR");
}

const HeatmapSection = () => {
  const { user, profile } = useUser();
  const [selectedClubId, setSelectedClubId] = useState("palmeiras");
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("country");
  const [activeStateName, setActiveStateName] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([-20, 5]);
  const [zoom, setZoom] = useState(1.15);
  const [tooltip, setTooltip] = useState<{ name: string; votes: number } | null>(null);

  // Bloqueio do mapa: usuário precisa ter bairro registrado para interagir
  const [userClubName, setUserClubName] = useState<string | null>(null);
  const [hasAddress, setHasAddress] = useState<boolean>(true); // assume true até verificar
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  useEffect(() => {
    const loadUserVote = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos")
        .select("clube_nome, bairro")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      if (!data?.clube_nome) {
        setHasAddress(false);
        return;
      }
      setUserClubName(data.clube_nome);
      const club = CLUBS_DATA.find((c) => c.nome === data.clube_nome);
      if (club) {
        const slug = club.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        setSelectedClubId(slug);
      }
      const profileCep = (profile as any)?.cep;
      setHasAddress(!!(data.bairro && data.bairro.trim()) || !!profileCep);
    };
    loadUserVote();
  }, [user, profile]);

  const refreshAfterSave = useCallback(() => {
    setHasAddress(true);
  }, []);

  const requireAddress = useCallback(() => {
    if (!hasAddress) {
      setAddressModalOpen(true);
      return true;
    }
    return false;
  }, [hasAddress]);


  const mapData = clubMapData[selectedClubId] || clubMapData.palmeiras;

  const countryEntries = useMemo(() => {
    const entries: Array<{ iso: string; name: string; votes: number }> = [];
    Object.values(mapData.continents).forEach((continent) => {
      Object.entries(continent.countries).forEach(([iso, country]) => {
        entries.push({ iso, name: country.name, votes: country.votes });
      });
    });
    return entries.sort((a, b) => b.votes - a.votes);
  }, [mapData]);

  const stateEntries = useMemo(() => {
    return [...(mapData.continents["south-america"]?.countries.BRA?.states || [])].sort((a, b) => b.votes - a.votes);
  }, [mapData]);

  const cityEntries = useMemo(() => {
    if (!activeStateName) return [];
    const state = stateEntries.find((entry) => normalize(entry.name) === normalize(activeStateName));
    return [...(state?.cities || [])].sort((a, b) => b.votes - a.votes);
  }, [activeStateName, stateEntries]);

  const countryVotesMap = useMemo(() => {
    const map: Record<string, number> = {};
    countryEntries.forEach((entry) => {
      map[entry.iso] = entry.votes;
      map[normalize(entry.name)] = entry.votes;
    });
    return map;
  }, [countryEntries]);

  const stateVotesMap = useMemo(() => {
    const map: Record<string, number> = {};
    stateEntries.forEach((entry) => {
      const key = normalize(entry.name);
      map[key] = entry.votes;
      const uf = STATE_UF[key];
      if (uf) map[uf] = entry.votes;
    });
    return map;
  }, [stateEntries]);

  const rankingData = useMemo(() => {
    if (drillLevel === "country") return countryEntries.map((e) => ({ label: e.name, votes: e.votes }));
    if (drillLevel === "state") return stateEntries.map((e) => ({ label: e.name, votes: e.votes }));
    return cityEntries.map((e) => ({ label: e.name, votes: e.votes }));
  }, [drillLevel, countryEntries, stateEntries, cityEntries]);

  const handleWorldClick = useCallback((geo: any) => {
    const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
    if (iso !== "BRA") return;
    setDrillLevel("state");
    setActiveStateName(null);
    setCenter([-53, -15]);
    setZoom(3.2);
  }, []);

  const handleBrazilStateClick = useCallback((geo: any) => {
    const rawName = geo.properties.name || geo.properties.NAME || geo.properties.nome || "";
    const normalized = normalize(rawName);

    const matched =
      stateEntries.find((entry) => normalize(entry.name) === normalized) ||
      stateEntries.find((entry) => STATE_UF[normalize(entry.name)] === rawName?.toUpperCase()) ||
      stateEntries.find((entry) => STATE_UF[normalize(entry.name)] === geo.properties.sigla);

    if (!matched) return;
    setActiveStateName(matched.name);
    setDrillLevel("city");
  }, [stateEntries]);

  const resetToWorld = useCallback(() => {
    setDrillLevel("country");
    setActiveStateName(null);
    setCenter([-20, 5]);
    setZoom(1.15);
  }, []);

  const resetToStates = useCallback(() => {
    setDrillLevel("state");
    setActiveStateName(null);
    setCenter([-53, -15]);
    setZoom(3.2);
  }, []);

  const mapTitle = drillLevel === "country" ? "Países" : drillLevel === "state" ? "Estados do Brasil" : `Cidades — ${activeStateName}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="overflow-hidden border-border/10 bg-card/30 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border/5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-black italic flex items-center gap-2 uppercase tracking-tighter">
              <Globe className="w-4 h-4 text-primary" /> Heatmap Brasa
            </CardTitle>
            <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest">
              <button onClick={resetToWorld} className="text-muted-foreground hover:text-foreground transition-colors">Mundo</button>
              {drillLevel !== "country" && (
                <>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <button onClick={resetToStates} className="text-muted-foreground hover:text-foreground transition-colors">Brasil</button>
                </>
              )}
              {drillLevel === "city" && activeStateName && (
                <>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-primary">{activeStateName}</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative w-full overflow-hidden border-b border-border/5" style={{ background: "hsl(var(--card))", height: 350 }}>
            <ComposableMap projection="geoMercator" style={{ width: "100%", height: "100%" }}>
              <ZoomableGroup center={center} zoom={zoom}>
                <Geographies geography={drillLevel === "country" ? WORLD_GEO_URL : BRAZIL_STATES_GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const countryIso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
                      const stateName = geo.properties.name || geo.properties.NAME || geo.properties.nome || "";
                      const stateUF = geo.properties.sigla || "";

                      const votes =
                        drillLevel === "country"
                          ? countryVotesMap[countryIso] || 0
                          : stateVotesMap[normalize(stateName)] || stateVotesMap[stateUF] || 0;

                      const isActiveState = activeStateName && normalize(activeStateName) === normalize(stateName);
                      const fillColor = drillLevel === "city" ? (isActiveState ? getBrasaColor(votes) : "hsl(var(--heat-empty))") : getBrasaColor(votes);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke="hsl(var(--border))"
                          strokeWidth={0.5}
                          onClick={() => {
                            if (drillLevel === "country") handleWorldClick(geo);
                            else if (drillLevel === "state") handleBrazilStateClick(geo);
                          }}
                          onMouseEnter={() => setTooltip({ name: drillLevel === "country" ? (geo.properties.NAME || geo.properties.name || countryIso) : (stateName || stateUF), votes })}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            default: { outline: "none", cursor: "pointer" },
                            hover: { outline: "none", fill: "hsl(var(--heat-high))" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {tooltip && (
              <div className="absolute top-3 left-3 glass-card rounded-xl px-3 py-2 border border-border/30">
                <p className="text-[10px] font-black uppercase italic">{tooltip.name}</p>
                <p className="text-[10px] font-bold text-primary">{formatVotes(tooltip.votes)} votos</p>
              </div>
            )}

            <div className="absolute right-3 bottom-3 glass-card rounded-xl px-3 py-2 border border-border/30">
              <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-2">Escala Brasa</p>
              <div className="flex gap-1">
                {["hsl(var(--heat-empty))", "hsl(var(--heat-low))", "hsl(var(--heat-mid))", "hsl(var(--heat-high))"].map((color) => (
                  <div key={color} className="w-5 h-3 rounded-sm" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
                <span>0</span>
                <span>1-10</span>
                <span>11-100</span>
                <span>100+</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="w-3 h-3" /> Top 10 — {mapTitle}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {rankingData.slice(0, 10).map((entry, i) => (
                <div key={entry.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="truncate pr-2">{i + 1}. {entry.label}</span>
                    <span className="text-primary">{formatVotes(entry.votes)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${rankingData[0]?.votes ? (entry.votes / rankingData[0].votes) * 100 : 0}%` }}
                      className="h-full"
                      style={{ backgroundColor: getBrasaColor(entry.votes) }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {drillLevel === "city" && cityEntries.length === 0 && (
              <p className="mt-3 text-[11px] italic text-muted-foreground">
                Sem cidades registradas para este estado no momento.
              </p>
            )}

            <div className="mt-4 text-[10px] text-muted-foreground italic">
              Clique em <strong className="text-foreground">Brasil</strong> para abrir os estados e clique em um estado para abrir as cidades.
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default HeatmapSection;
