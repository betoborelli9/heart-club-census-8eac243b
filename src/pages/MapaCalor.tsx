import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ChevronRight, MapPin, Trophy, Flame, Search, Swords,
  ArrowLeft, Loader2, LogOut, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import { CLUBS_DATA } from "@/clubes-data";
import logo from "@/assets/logo.png";
import {
  continentZoomTargets,
  isoToContinentMap,
} from "@/data/mockDashboard";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BRAZIL_STATES_GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const BR_STATE_ALIASES: Record<string, string[]> = {
  "Acre": ["AC"],
  "Alagoas": ["AL"],
  "Amapá": ["AP"],
  "Amazonas": ["AM"],
  "Bahia": ["BA"],
  "Ceará": ["CE"],
  "Distrito Federal": ["DF", "Brasília"],
  "Espírito Santo": ["ES"],
  "Goiás": ["GO"],
  "Maranhão": ["MA"],
  "Mato Grosso": ["MT"],
  "Mato Grosso do Sul": ["MS"],
  "Minas Gerais": ["MG"],
  "Pará": ["PA"],
  "Paraíba": ["PB"],
  "Paraná": ["PR"],
  "Pernambuco": ["PE"],
  "Piauí": ["PI"],
  "Rio de Janeiro": ["RJ"],
  "Rio Grande do Norte": ["RN"],
  "Rio Grande do Sul": ["RS"],
  "Rondônia": ["RO"],
  "Roraima": ["RR"],
  "Santa Catarina": ["SC"],
  "São Paulo": ["SP"],
  "Sergipe": ["SE"],
  "Tocantins": ["TO"],
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// ===== BRASA COLOR SCALE (ABSOLUTE) =====
function getBrasaColor(votes: number): string {
  if (!votes || votes === 0) return "hsl(var(--heat-empty))";
  if (votes <= 10) return "hsl(var(--heat-low))";
  if (votes <= 100) return "hsl(var(--heat-mid))";
  return "hsl(var(--heat-high))";
}

// Duel palettes
function getDuelColorA(votes: number, maxVotes: number): string {
  if (!votes) return "hsl(var(--heat-empty))";
  const ratio = Math.min(votes / Math.max(maxVotes, 1), 1);
  if (ratio <= 0.3) return "hsl(var(--heat-mid))";
  if (ratio <= 0.6) return "hsl(var(--primary) / 0.85)";
  return "hsl(var(--heat-high))";
}
function getDuelColorB(votes: number, maxVotes: number): string {
  if (!votes) return "hsl(var(--heat-empty))";
  const ratio = Math.min(votes / Math.max(maxVotes, 1), 1);
  if (ratio <= 0.3) return "hsl(var(--duel-blue-low) / 0.75)";
  if (ratio <= 0.6) return "hsl(var(--duel-blue-low))";
  return "hsl(var(--duel-blue-high))";
}

const LEGEND_BRASA = [
  "hsl(var(--heat-empty))",
  "hsl(var(--heat-low))",
  "hsl(var(--heat-mid))",
  "hsl(var(--heat-high))",
];
const LEGEND_BLUE = [
  "hsl(var(--heat-empty))",
  "hsl(var(--duel-blue-low) / 0.75)",
  "hsl(var(--duel-blue-low))",
  "hsl(var(--duel-blue-high))",
];

function formatVotes(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

type DrillLevel = "world" | "continent" | "country" | "state" | "city";

interface HeatmapEntry { region: string; votes: number; }
interface BreadcrumbItem { label: string; level: DrillLevel; value?: string; }

const MapaCalor = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useUser();

  const [heartClubName, setHeartClubName] = useState("");
  const [activeClubName, setActiveClubName] = useState("");
  const [activeClubInfo, setActiveClubInfo] = useState<any>(null);

  const [duelMode, setDuelMode] = useState(false);
  const [duelClubName, setDuelClubName] = useState("");
  const [duelClubInfo, setDuelClubInfo] = useState<any>(null);
  const [duelData, setDuelData] = useState<HeatmapEntry[]>([]);

  const [drillLevel, setDrillLevel] = useState<DrillLevel>("world");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ label: "Mundo", level: "world" }]);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(1);
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const [heatData, setHeatData] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [duelSearchQuery, setDuelSearchQuery] = useState("");
  const [duelSearchResults, setDuelSearchResults] = useState<ClubSearchResult[]>([]);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; votes: number; pct: string } | null>(null);
  const [curiosity, setCuriosity] = useState<string | null>(null);

  // GPS Geolocation
  const [geoCity, setGeoCity] = useState<string | null>(null);
  const [geoConfirmed, setGeoConfirmed] = useState(false);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const geoAttemptedRef = useRef(false);

  // Request GPS on mount
  useEffect(() => {
    if (geoAttemptedRef.current || !navigator.geolocation) return;
    geoAttemptedRef.current = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`,
            { headers: { "User-Agent": "HeartClubApp/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.municipality || addr.village || "";
          if (city) {
            setGeoCity(city);
            setShowGeoModal(true);
          }
        } catch { /* silently fail */ }
      },
      () => { /* permission denied — ok */ },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // Load heart club
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      const name = data?.clube_nome || "Vila Nova";
      setHeartClubName(name);
      setActiveClubName(name);
      setActiveClubInfo(CLUBS_DATA.find(c => c.nome === name) || null);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!activeClubName) return;
    fetchHeatmapData(activeClubName, drillLevel, filterValue);
  }, [activeClubName, drillLevel, filterValue]);

  useEffect(() => {
    if (!duelMode || !duelClubName) return;
    fetchDuelData(duelClubName);
  }, [duelClubName, duelMode, drillLevel, filterValue]);

  const fetchHeatmapData = async (clubName: string, level: DrillLevel, filter: string | null) => {
    setLoading(true);
    const supaLevel = level === "world" || level === "continent" ? "country" : level;
    const { data, error } = await supabase.rpc("get_heatmap_data", {
      p_club_name: clubName, p_level: supaLevel, p_filter_value: filter,
    });
    if (!error && data) {
      const entries = (Array.isArray(data) ? data : []) as unknown as HeatmapEntry[];
      setHeatData(entries);
      setTotalVotes(entries.reduce((s, e) => s + Number(e.votes), 0));
    } else { setHeatData([]); setTotalVotes(0); }
    setLoading(false);
  };

  const fetchDuelData = async (clubName: string) => {
    const supaLevel = drillLevel === "world" || drillLevel === "continent" ? "country" : drillLevel;
    const { data } = await supabase.rpc("get_heatmap_data", {
      p_club_name: clubName, p_level: supaLevel, p_filter_value: filterValue,
    });
    if (data) setDuelData((Array.isArray(data) ? data : []) as unknown as HeatmapEntry[]);
  };

  const voteMap = useMemo(() => {
    const m: Record<string, number> = {};
    heatData.forEach(e => { m[e.region] = Number(e.votes); });
    return m;
  }, [heatData]);

  const duelVoteMap = useMemo(() => {
    const m: Record<string, number> = {};
    duelData.forEach(e => { m[e.region] = Number(e.votes); });
    return m;
  }, [duelData]);

  const maxVotes = useMemo(() => Math.max(...heatData.map(e => Number(e.votes)), 1), [heatData]);
  const duelMaxVotes = useMemo(() => Math.max(...duelData.map(e => Number(e.votes)), 1), [duelData]);

  // Top 10
  const top10 = useMemo(() => {
    return [...heatData].sort((a, b) => Number(b.votes) - Number(a.votes)).slice(0, 10);
  }, [heatData]);

  // Distribution percentages
  const distribution = useMemo(() => {
    if (totalVotes === 0) return [];
    return top10.map(e => ({
      region: e.region,
      pct: ((Number(e.votes) / totalVotes) * 100).toFixed(1),
      votes: Number(e.votes),
    }));
  }, [top10, totalVotes]);

  const navigateTo = useCallback((level: DrillLevel, label: string, value?: string) => {
    setDrillLevel(level);
    if (level === "world") {
      setCenter([0, 20]); setZoom(1); setFilterValue(null);
      setBreadcrumbs([{ label: "Mundo", level: "world" }]);
    } else if (level === "state") {
      setFilterValue(value || null);
      setCenter([-55, -15]); setZoom(3);
      setBreadcrumbs(prev => [...prev.filter(b => b.level === "world"), { label, level: "state", value }]);
    } else if (level === "city") {
      setFilterValue(value || null);
      setZoom(6);
      setBreadcrumbs(prev => [...prev.filter(b => b.level === "world" || b.level === "state"), { label, level: "city", value }]);
    }
  }, []);

  const handleGeoClick = useCallback((geo: any) => {
    const name = geo.properties.NAME || geo.properties.name;
    const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3;
    if (drillLevel === "world") {
      const continent = isoToContinentMap[iso];
      const target = continent ? continentZoomTargets[continent] : null;
      if (target) { setCenter(target.center); setZoom(target.zoom + 1); }
      navigateTo("state", name, name);
    }
  }, [drillLevel, navigateTo]);

  // Curiosity check
  useEffect(() => {
    if (!activeClubName || !profile?.cidade) return;
    const cityVotes = heatData.find(e => e.region === profile.cidade);
    if (cityVotes && Number(cityVotes.votes) === 1) {
      setCuriosity(`Você é o 1º torcedor do ${activeClubName} detectado em ${profile.cidade}!`);
    } else { setCuriosity(null); }
  }, [heatData, activeClubName, profile]);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setSearchResults(val.length > 1 ? searchClubsLocal(val, 6) : []);
  };
  const selectClub = (club: ClubSearchResult) => {
    setActiveClubName(club.name); setActiveClubInfo(CLUBS_DATA.find(c => c.nome === club.name) || null);
    setSearchQuery(""); setSearchResults([]);
    setDrillLevel("world"); setCenter([0, 20]); setZoom(1); setFilterValue(null);
    setBreadcrumbs([{ label: "Mundo", level: "world" }]);
  };
  const handleDuelSearch = (val: string) => {
    setDuelSearchQuery(val);
    setDuelSearchResults(val.length > 1 ? searchClubsLocal(val, 6) : []);
  };
  const selectDuelClub = (club: ClubSearchResult) => {
    setDuelClubName(club.name); setDuelClubInfo(CLUBS_DATA.find(c => c.nome === club.name) || null);
    setDuelSearchQuery(""); setDuelSearchResults([]);
  };

  const duelTotalA = totalVotes;
  const duelTotalB = duelData.reduce((s, e) => s + Number(e.votes), 0);

  const levelLabel = drillLevel === "world" ? "Mundial" : drillLevel === "state" ? "Nacional" : "Estadual";

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
      {/* GPS Confirmation Modal */}
      <AnimatePresence>
        {showGeoModal && geoCity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full border border-primary/20 space-y-4"
            >
              <div className="text-center space-y-2">
                <MapPin className="w-10 h-10 text-primary mx-auto" />
                <h3 className="text-lg font-black italic uppercase">Confirmação de Território</h3>
                <p className="text-sm text-muted-foreground">
                  Detectamos que sua lealdade está em{" "}
                  <span className="text-primary font-bold">{geoCity}</span>.
                  Você confirma que mora aqui?
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => { setGeoConfirmed(true); setShowGeoModal(false); }}
                  className="btn-orange-gradient font-bold"
                >
                  Sim, é aqui!
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setGeoCity(null); setShowGeoModal(false); }}
                >
                  Não, corrigir
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <img src={logo} alt="Heart Club" className="h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter hidden sm:block">MAPA DE CALOR</span>
          </div>
          <div className="flex items-center gap-3">
            {geoConfirmed && geoCity && (
              <span className="text-[9px] text-primary font-bold uppercase tracking-widest hidden md:flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {geoCity}
              </span>
            )}
            <Button variant={duelMode ? "default" : "outline"} size="sm" className="text-xs font-black uppercase" onClick={() => setDuelMode(!duelMode)}>
              <Swords className="w-4 h-4 mr-1" /> Duelo
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-64px)]">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-80 xl:w-96 border-r border-border bg-card/30 p-4 lg:p-6 overflow-y-auto lg:max-h-[calc(100vh-64px)]">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} placeholder="Pesquisar clube..." className="pl-10 bg-secondary border-border" onChange={(e) => handleSearch(e.target.value)} />
            {searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
                {searchResults.map(club => (
                  <button key={club.id} onMouseDown={(e) => { e.preventDefault(); selectClub(club); }} className="w-full flex items-center gap-3 p-3 hover:bg-secondary text-left">
                    <div className="w-8 h-8 bg-white rounded-full p-1 flex items-center justify-center shrink-0"><ClubLogo src={club.logo} alt={club.name} size="sm" /></div>
                    <div><span className="text-xs font-black italic uppercase">{club.name}</span><span className="text-[9px] text-muted-foreground block">{club.location}</span></div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Club */}
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-12 h-12 bg-white rounded-full p-1.5 flex items-center justify-center shrink-0">
              <ClubLogo src={activeClubInfo?.logoUrl} alt={activeClubName} size="sm" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Exibindo</p>
              <h3 className="text-sm font-black italic uppercase leading-tight">{activeClubName}</h3>
              <p className="text-[10px] text-primary font-bold">{formatVotes(totalVotes)} votos registrados</p>
            </div>
          </div>

          {/* Duel */}
          {duelMode && (
            <div className="mb-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2"><Swords className="w-3 h-3 inline mr-1" /> Selecione o Rival</p>
              {duelClubName ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                  <div className="w-10 h-10 bg-background rounded-full p-1 flex items-center justify-center shrink-0"><ClubLogo src={duelClubInfo?.logoUrl} alt={duelClubName} size="sm" /></div>
                  <div className="flex-1">
                    <h3 className="text-xs font-black italic uppercase">{duelClubName}</h3>
                    <p className="text-[10px] font-bold" style={{ color: "hsl(var(--duel-blue-high))" }}>{formatVotes(duelTotalB)} votos</p>
                  </div>
                  <button onClick={() => { setDuelClubName(""); setDuelData([]); }}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              ) : (
...
              {duelClubName && (
                <div className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase text-primary">{activeClubName}</span>
                    <span className="text-[10px] font-black uppercase text-muted-foreground">VS</span>
                    <span className="text-[10px] font-black uppercase" style={{ color: "hsl(var(--duel-blue-high))" }}>{duelClubName}</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full transition-all duration-700" style={{ width: `${duelTotalA + duelTotalB > 0 ? (duelTotalA / (duelTotalA + duelTotalB)) * 100 : 50}%`, background: "linear-gradient(90deg, hsl(var(--heat-mid)), hsl(var(--heat-high)))" }} />
                    <div className="h-full transition-all duration-700" style={{ width: `${duelTotalA + duelTotalB > 0 ? (duelTotalB / (duelTotalA + duelTotalB)) * 100 : 50}%`, background: "linear-gradient(90deg, hsl(var(--duel-blue-low)), hsl(var(--duel-blue-high)))" }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-bold text-primary">{formatVotes(duelTotalA)}</span>
                    <span className="text-[10px] font-bold" style={{ color: "hsl(var(--duel-blue-high))" }}>{formatVotes(duelTotalB)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 mb-4 flex-wrap">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                <button onClick={() => navigateTo(bc.level, bc.label, bc.value)} className="text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors">{bc.label}</button>
              </span>
            ))}
          </div>

          {/* Top 10 */}
          <div className="mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2 italic">
              <Trophy className="w-3 h-3" /> Top 10 — {levelLabel}
            </h3>
            {top10.length === 0 ? (
              <p className="text-[11px] italic text-muted-foreground text-center py-4">Nenhum voto registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {top10.map((entry, i) => (
                  <div key={entry.region} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: i < 3 ? "hsl(var(--heat-high))" : "hsl(var(--muted))", color: i < 3 ? "hsl(var(--background))" : "hsl(var(--foreground))" }}>{i + 1}</span>
                        {entry.region}
                      </span>
                      <span className="font-black text-primary">{formatVotes(Number(entry.votes))}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(Number(entry.votes) / Number(top10[0].votes)) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--heat-mid)), hsl(var(--heat-high)))" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Distribution */}
          {distribution.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 italic">
                📊 Distribuição
              </h3>
              <div className="space-y-1.5">
                {distribution.slice(0, 5).map(d => (
                  <div key={d.region} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground truncate mr-2">{d.region}</span>
                    <span className="font-bold text-primary shrink-0">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curiosidade Sagrada */}
          <AnimatePresence>
            {curiosity && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 italic"><Flame className="w-3 h-3 inline mr-1" /> Curiosidade Sagrada</p>
                <p className="text-xs italic text-primary/80">{curiosity}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* MAP AREA */}
        <main className="flex-1 relative bg-background min-h-[400px] lg:min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/60 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          <div className="w-full h-full min-h-[50vh] lg:min-h-full">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140, center: [0, 20] }} style={{ width: "100%", height: "100%", minHeight: "50vh", background: "hsl(var(--background))" }}>
              <ZoomableGroup center={center} zoom={zoom} onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates as [number, number]); setZoom(z); }}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const name = geo.properties.NAME || geo.properties.name || "";
                      const votesA = voteMap[name] || 0;
                      const votesB = duelVoteMap[name] || 0;

                      let fillColor: string;
                      if (duelMode && duelClubName) {
                        if (votesA > votesB) fillColor = getDuelColorA(votesA, maxVotes);
                        else if (votesB > votesA) fillColor = getDuelColorB(votesB, duelMaxVotes);
                        else if (votesA > 0) fillColor = "hsl(var(--duel-neutral))";
                        else fillColor = "hsl(var(--heat-empty))";
                      } else {
                        fillColor = getBrasaColor(votesA);
                      }

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke="hsl(var(--border))"
                          strokeWidth={0.5}
                          onClick={() => handleGeoClick(geo)}
                          onMouseEnter={(e) => {
                            if (votesA > 0 || votesB > 0) {
                              setTooltip({ x: (e as any).clientX || 0, y: (e as any).clientY || 0, name, votes: votesA, pct: ((votesA / (totalVotes || 1)) * 100).toFixed(1) });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            default: { outline: "none", cursor: "pointer", transition: "fill 0.3s" },
                            hover: { outline: "none", fill: votesA > 0 ? "hsl(var(--heat-high))" : "hsl(var(--heat-empty))", cursor: "pointer" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>

          {/* Tooltip */}
          <AnimatePresence>
            {tooltip && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed z-50 pointer-events-none px-4 py-3 rounded-xl bg-card border border-border shadow-2xl" style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
                <p className="text-xs font-black italic uppercase">{tooltip.name}</p>
                <p className="text-[10px] text-primary font-bold">{formatVotes(tooltip.votes)} votos</p>
                <p className="text-[9px] text-muted-foreground">{tooltip.pct}% do total</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 p-3 rounded-xl bg-card/80 backdrop-blur-md border border-border z-10">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-2 italic">Intensidade</p>
            <div className="flex items-center gap-0.5">
              {LEGEND_BRASA.map((c, i) => (<div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />))}
            </div>
            <div className="flex justify-between text-[7px] text-muted-foreground mt-1">
              <span>0</span><span>10</span><span>100+</span>
            </div>
            {duelMode && duelClubName && (
              <>
                <div className="flex items-center gap-0.5 mt-2">
                  {LEGEND_BLUE.map((c, i) => (<div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />))}
                </div>
                <div className="flex justify-between text-[7px] text-muted-foreground mt-1">
                  <span>0</span><span>{duelClubName}</span>
                </div>
              </>
            )}
          </div>

          {/* Drill-down list overlay */}
          {drillLevel !== "world" && heatData.length > 0 && (
            <div className="absolute top-4 left-4 p-4 rounded-xl bg-card/90 backdrop-blur-md border border-border z-10 max-h-[60%] overflow-y-auto w-64">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 italic">
                <MapPin className="w-3 h-3 inline mr-1" />
                {drillLevel === "state" ? "Estados" : "Cidades"}
              </h3>
              <div className="space-y-2">
                {[...heatData].sort((a, b) => Number(b.votes) - Number(a.votes)).slice(0, 15).map((entry, i) => (
                  <button key={entry.region} onClick={() => { if (drillLevel === "state") navigateTo("city", entry.region, entry.region); }}
                    className="w-full flex justify-between text-[10px] p-2 rounded-lg hover:bg-secondary transition-colors text-left">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="text-[8px] text-muted-foreground w-4">{i + 1}.</span>{entry.region}
                    </span>
                    <span className="font-black text-primary">{formatVotes(Number(entry.votes))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MapaCalor;
