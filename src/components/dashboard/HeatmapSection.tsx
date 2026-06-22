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
import { isMasterEmail } from "@/lib/master";
import { countryNameToIso3 } from "@/lib/country-iso";
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

const UF_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_UF).map(([k, v]) => [v, k])
);

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

interface RealHeatmapData {
  countries: Array<{ name: string; votes: number }>;
  states: Array<{ name: string; votes: number }>;
  cities: Array<{ state: string; name: string; votes: number }>;
}

const HeatmapSection = () => {
  const { user, profile } = useUser();
  const isMaster = isMasterEmail((user as any)?.email);

  const [selectedClubId, setSelectedClubId] = useState("palmeiras");
  const [selectedClubName, setSelectedClubName] = useState<string | null>(null);
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("country");
  const [activeStateName, setActiveStateName] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([-20, 5]);
  const [zoom, setZoom] = useState(1.15);
  const [tooltip, setTooltip] = useState<{ name: string; votes: number } | null>(null);

  const [userClubName, setUserClubName] = useState<string | null>(null);
  const [hasAddress, setHasAddress] = useState<boolean>(true);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [realData, setRealData] = useState<RealHeatmapData | null>(null);

  // Master sempre tem acesso pleno — sem cadeado.
  const effectiveHasAddress = isMaster ? true : hasAddress;

  useEffect(() => {
    const loadUserVote = async () => {
      if (!user) return;

      // Para master: pega o voto MAIS RECENTE (mesmo se não for original) para
      // garantir que sempre haja um clube selecionado, mesmo em modo de revoto.
      let q = supabase
        .from("votos")
        .select("clube_nome, bairro")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!isMaster) {
        q = supabase
          .from("votos")
          .select("clube_nome, bairro")
          .eq("user_id", user.id)
          .eq("is_original_vote", true)
          .order("created_at", { ascending: false })
          .limit(1);
      }

      const { data } = await q.maybeSingle();

      if (!data?.clube_nome) {
        if (!isMaster) setHasAddress(false);
        return;
      }

      setUserClubName(data.clube_nome);
      setSelectedClubName(data.clube_nome);
      const club = CLUBS_DATA.find((c) => c.nome === data.clube_nome);
      if (club) {
        const slug = club.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        setSelectedClubId(slug);
      }
      const profileCep = (profile as any)?.cep;
      const addressConfirmed = (profile as any)?.address_confirmed === true;
      const profileBairro = (profile as any)?.bairro;
      setHasAddress(addressConfirmed || !!(data.bairro && data.bairro.trim()) || !!profileCep || !!profileBairro);
    };
    loadUserVote();
  }, [user, profile, isMaster]);

  // Busca os dados REAIS de votos para o clube selecionado.
  useEffect(() => {
    const fetchReal = async () => {
      if (!selectedClubName) {
        setRealData(null);
        return;
      }
      const { data, error } = await supabase.rpc("get_club_heatmap_data", {
        p_club_name: selectedClubName,
      });
      if (error) {
        console.error("[Heatmap] get_club_heatmap_data error", error);
        setRealData(null);
        return;
      }
      setRealData(data as unknown as RealHeatmapData);
    };
    fetchReal();
  }, [selectedClubName]);

  const refreshAfterSave = useCallback(() => {
    setHasAddress(true);
  }, []);

  const requireAddress = useCallback(() => {
    if (!effectiveHasAddress) {
      setAddressModalOpen(true);
      return true;
    }
    return false;
  }, [effectiveHasAddress]);

  // Mock como fallback estrutural (mantém UI completa quando não há votos reais).
  const mapData = clubMapData[selectedClubId] || clubMapData.palmeiras;

  // ====== AGREGAÇÃO PAÍSES (real + fallback mock) ======
  const countryVotesMap = useMemo(() => {
    const map: Record<string, number> = {};
    // Mock primeiro (fallback)
    Object.values(mapData.continents).forEach((continent) => {
      Object.entries(continent.countries).forEach(([iso, country]) => {
        if (country.votes > 0) {
          map[iso] = country.votes;
          map[normalize(country.name)] = country.votes;
        }
      });
    });
    // Real por cima
    realData?.countries.forEach(({ name, votes }) => {
      const iso = countryNameToIso3(name);
      if (iso) {
        map[iso] = (map[iso] || 0) + votes;
      }
      map[normalize(name)] = (map[normalize(name)] || 0) + votes;
    });
    return map;
  }, [mapData, realData]);

  const countryEntries = useMemo(() => {
    const merged: Record<string, { iso: string; name: string; votes: number }> = {};
    Object.values(mapData.continents).forEach((continent) => {
      Object.entries(continent.countries).forEach(([iso, country]) => {
        if (country.votes > 0) {
          merged[normalize(country.name)] = { iso, name: country.name, votes: country.votes };
        }
      });
    });
    realData?.countries.forEach(({ name, votes }) => {
      const key = normalize(name);
      const iso = countryNameToIso3(name) || merged[key]?.iso || "???";
      merged[key] = {
        iso,
        name,
        votes: (merged[key]?.votes || 0) + votes,
      };
    });
    return Object.values(merged).sort((a, b) => b.votes - a.votes);
  }, [mapData, realData]);

  // ====== AGREGAÇÃO ESTADOS (real + fallback mock) ======
  const stateEntries = useMemo(() => {
    const mockStates = mapData.continents["south-america"]?.countries.BRA?.states || [];
    const merged: Record<string, { name: string; votes: number; cities: Array<{ name: string; votes: number }> }> = {};

    mockStates.forEach((s: any) => {
      merged[normalize(s.name)] = { name: s.name, votes: s.votes, cities: [...(s.cities || [])] };
    });

    realData?.states.forEach(({ name, votes }) => {
      // Se vier UF (ex: "SP"), converte
      let stateName = name;
      const maybeFull = UF_TO_STATE[name.toUpperCase()];
      if (maybeFull) stateName = maybeFull.replace(/\b\w/g, (c) => c.toUpperCase());
      const key = normalize(stateName);
      if (!merged[key]) merged[key] = { name: stateName, votes: 0, cities: [] };
      merged[key].votes = votes; // Real sobrescreve (mais autoritativo)
    });

    // Cidades reais por estado
    realData?.cities.forEach(({ state, name, votes }) => {
      let stateName = state;
      const maybeFull = UF_TO_STATE[state.toUpperCase()];
      if (maybeFull) stateName = maybeFull.replace(/\b\w/g, (c) => c.toUpperCase());
      const key = normalize(stateName);
      if (!merged[key]) merged[key] = { name: stateName, votes: 0, cities: [] };
      // Remove cidade do mock com mesmo nome para evitar duplicata
      merged[key].cities = merged[key].cities.filter((c) => normalize(c.name) !== normalize(name));
      merged[key].cities.push({ name, votes });
    });

    return Object.values(merged).sort((a, b) => b.votes - a.votes);
  }, [mapData, realData]);

  const cityEntries = useMemo(() => {
    if (!activeStateName) return [];
    const state = stateEntries.find((entry) => normalize(entry.name) === normalize(activeStateName));
    return [...(state?.cities || [])].sort((a, b) => b.votes - a.votes);
  }, [activeStateName, stateEntries]);

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
                            if (requireAddress()) return;
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

            {!effectiveHasAddress && (
              <button
                type="button"
                onClick={() => setAddressModalOpen(true)}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-md cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Lock className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-sm font-black italic uppercase tracking-tighter text-white px-6 text-center">
                  Desbloqueie seu território
                </p>
                <p className="text-[11px] italic text-white/70 px-8 text-center max-w-xs">
                  Informe seu CEP para ver a força da torcida na sua região.
                </p>
                <span className="mt-1 text-[10px] font-black italic uppercase text-orange-500 tracking-widest">
                  Toque para liberar →
                </span>
              </button>
            )}
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

      <AddressModal
        open={addressModalOpen}
        onOpenChange={setAddressModalOpen}
        clubName={userClubName}
        onSuccess={refreshAfterSave}
      />
    </motion.div>
  );
};

export default HeatmapSection;
