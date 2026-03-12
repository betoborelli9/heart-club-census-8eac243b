import { useState, useEffect, useMemo, useCallback } from "react";
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
  Marker,
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

// ===== BRASA COLOR SCALE =====
const BRASA_COLORS = [
  "#3a3a3a", // 0 votes - cinza
  "#B35A00", // low
  "#D46A00", // 
  "#E87800", //
  "#F58A00", //
  "#FF9B00", //
  "#FFAB20", //
  "#FFB830", // mid
  "#FFC94D", //
  "#FFD666", // high
  "#FFE080", // brasa intensa
];

function getBrasaColor(votes: number, maxVotes: number): string {
  if (!votes || !maxVotes) return "#2a2a2a";
  const ratio = Math.min(votes / maxVotes, 1);
  const index = Math.min(Math.floor(ratio * (BRASA_COLORS.length - 1)) + 1, BRASA_COLORS.length - 1);
  return BRASA_COLORS[index];
}

// Duel mode uses contrasting colors
const DUEL_COLORS_A = ["#2a2a2a", "#B35A00", "#D46A00", "#E87800", "#FF9B00", "#FFD666"];
const DUEL_COLORS_B = ["#2a2a2a", "#1a4a8a", "#2060b0", "#3080d0", "#50a0f0", "#80c0ff"];

function getDuelColor(votes: number, maxVotes: number, palette: string[]): string {
  if (!votes || !maxVotes) return "#2a2a2a";
  const ratio = Math.min(votes / maxVotes, 1);
  const index = Math.min(Math.floor(ratio * (palette.length - 1)) + 1, palette.length - 1);
  return palette[index];
}

function formatVotes(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

type DrillLevel = "world" | "continent" | "country" | "state" | "city";

interface HeatmapEntry {
  region: string;
  votes: number;
}

interface BreadcrumbItem {
  label: string;
  level: DrillLevel;
  value?: string;
}

const MapaCalor = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useUser();

  // Club state
  const [heartClubName, setHeartClubName] = useState<string>("");
  const [activeClubName, setActiveClubName] = useState<string>("");
  const [activeClubInfo, setActiveClubInfo] = useState<any>(null);

  // Duel mode
  const [duelMode, setDuelMode] = useState(false);
  const [duelClubName, setDuelClubName] = useState<string>("");
  const [duelClubInfo, setDuelClubInfo] = useState<any>(null);
  const [duelData, setDuelData] = useState<HeatmapEntry[]>([]);

  // Map navigation
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("world");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ label: "Mundo", level: "world" }]);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(1);
  const [filterValue, setFilterValue] = useState<string | null>(null);

  // Data
  const [heatData, setHeatData] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [duelSearchQuery, setDuelSearchQuery] = useState("");
  const [duelSearchResults, setDuelSearchResults] = useState<ClubSearchResult[]>([]);

  // Tooltip
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; votes: number; pct: string } | null>(null);

  // "Curiosidade Sagrada"
  const [curiosity, setCuriosity] = useState<string | null>(null);

  // Load user's heart club
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      const name = data?.clube_nome || "Vila Nova";
      setHeartClubName(name);
      setActiveClubName(name);
      const info = CLUBS_DATA.find(c => c.nome === name);
      setActiveClubInfo(info || null);
    };
    load();
  }, [user]);

  // Fetch heatmap data whenever active club or drill level changes
  useEffect(() => {
    if (!activeClubName) return;
    fetchHeatmapData(activeClubName, drillLevel, filterValue);
  }, [activeClubName, drillLevel, filterValue]);

  // Fetch duel data
  useEffect(() => {
    if (!duelMode || !duelClubName) return;
    fetchDuelData(duelClubName);
  }, [duelClubName, duelMode, drillLevel, filterValue]);

  const fetchHeatmapData = async (clubName: string, level: DrillLevel, filter: string | null) => {
    setLoading(true);
    const supaLevel = level === "world" ? "country" : level === "continent" ? "country" : level;
    const { data, error } = await supabase.rpc("get_heatmap_data", {
      p_club_name: clubName,
      p_level: supaLevel,
      p_filter_value: filter,
    });
    if (!error && data) {
      const entries = (Array.isArray(data) ? data : []) as HeatmapEntry[];
      setHeatData(entries);
      setTotalVotes(entries.reduce((s, e) => s + Number(e.votes), 0));
    } else {
      setHeatData([]);
      setTotalVotes(0);
    }
    setLoading(false);
  };

  const fetchDuelData = async (clubName: string) => {
    const supaLevel = drillLevel === "world" ? "country" : drillLevel === "continent" ? "country" : drillLevel;
    const { data } = await supabase.rpc("get_heatmap_data", {
      p_club_name: clubName,
      p_level: supaLevel,
      p_filter_value: filterValue,
    });
    if (data) {
      setDuelData((Array.isArray(data) ? data : []) as HeatmapEntry[]);
    }
  };

  // Build vote map for quick lookup
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

  // Top 5 regions
  const top5 = useMemo(() => {
    return [...heatData].sort((a, b) => Number(b.votes) - Number(a.votes)).slice(0, 5);
  }, [heatData]);

  // Distribution by continent (only at world level)
  const continentDistribution = useMemo(() => {
    if (drillLevel !== "world") return [];
    const continentVotes: Record<string, number> = {};
    heatData.forEach(entry => {
      // Try to map the region (country name) to a continent
      // For now, just show all as-is
      const key = entry.region;
      continentVotes[key] = (continentVotes[key] || 0) + Number(entry.votes);
    });
    const entries = Object.entries(continentVotes).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return entries.map(([region, votes]) => ({ region, votes, pct: ((votes / total) * 100).toFixed(1) }));
  }, [heatData, drillLevel]);

  // Navigation
  const navigateTo = useCallback((level: DrillLevel, label: string, value?: string) => {
    setDrillLevel(level);
    if (level === "world") {
      setCenter([0, 20]); setZoom(1); setFilterValue(null);
      setBreadcrumbs([{ label: "Mundo", level: "world" }]);
    } else if (level === "state") {
      setFilterValue(value || null);
      // Zoom to country (assume Brazil for now)
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
      // Drill into country → show states
      const continent = isoToContinentMap[iso];
      const target = continent ? continentZoomTargets[continent] : null;
      if (target) {
        setCenter(target.center);
        setZoom(target.zoom + 1);
      }
      navigateTo("state", name, name);
    }
  }, [drillLevel, navigateTo]);

  // Curiosity check
  useEffect(() => {
    if (!activeClubName || !profile?.cidade) return;
    const cityVotes = heatData.find(e => e.region === profile.cidade);
    if (cityVotes && Number(cityVotes.votes) === 1) {
      setCuriosity(`Você é o 1º torcedor do ${activeClubName} detectado em ${profile.cidade}!`);
    } else {
      setCuriosity(null);
    }
  }, [heatData, activeClubName, profile]);

  // Club search handlers
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setSearchResults(val.length > 1 ? searchClubsLocal(val, 6) : []);
  };

  const selectClub = (club: ClubSearchResult) => {
    setActiveClubName(club.name);
    setActiveClubInfo(CLUBS_DATA.find(c => c.nome === club.name) || null);
    setSearchQuery("");
    setSearchResults([]);
    setDrillLevel("world");
    setCenter([0, 20]); setZoom(1); setFilterValue(null);
    setBreadcrumbs([{ label: "Mundo", level: "world" }]);
  };

  const handleDuelSearch = (val: string) => {
    setDuelSearchQuery(val);
    setDuelSearchResults(val.length > 1 ? searchClubsLocal(val, 6) : []);
  };

  const selectDuelClub = (club: ClubSearchResult) => {
    setDuelClubName(club.name);
    setDuelClubInfo(CLUBS_DATA.find(c => c.nome === club.name) || null);
    setDuelSearchQuery("");
    setDuelSearchResults([]);
  };

  // Duel totals
  const duelTotalA = totalVotes;
  const duelTotalB = duelData.reduce((s, e) => s + Number(e.votes), 0);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
      {/* HEADER */}
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <img src={logo} alt="Heart Club" className="h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter hidden sm:block">MAPA DE CALOR</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={duelMode ? "default" : "outline"}
              size="sm"
              className="text-xs font-black uppercase"
              onClick={() => setDuelMode(!duelMode)}
            >
              <Swords className="w-4 h-4 mr-1" /> Duelo
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-64px)]">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-80 xl:w-96 border-r border-border bg-card/30 p-4 lg:p-6 overflow-y-auto lg:max-h-[calc(100vh-64px)]">
          {/* Club Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              placeholder="Pesquisar clube..."
              className="pl-10 bg-secondary border-border"
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
                {searchResults.map(club => (
                  <button key={club.id} onMouseDown={(e) => { e.preventDefault(); selectClub(club); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary text-left">
                    <div className="w-8 h-8 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
                      <ClubLogo src={club.logo} alt={club.name} size="sm" />
                    </div>
                    <div>
                      <span className="text-xs font-black italic uppercase">{club.name}</span>
                      <span className="text-[9px] text-muted-foreground block">{club.location}</span>
                    </div>
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
              <p className="text-[10px] text-orange-400 font-bold">{formatVotes(totalVotes)} votos registrados</p>
            </div>
          </div>

          {/* Duel Search */}
          {duelMode && (
            <div className="mb-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                <Swords className="w-3 h-3 inline mr-1" /> Selecione o Rival
              </p>
              {duelClubName ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-950/30 border border-blue-500/20">
                  <div className="w-10 h-10 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
                    <ClubLogo src={duelClubInfo?.logoUrl} alt={duelClubName} size="sm" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-black italic uppercase">{duelClubName}</h3>
                    <p className="text-[10px] text-blue-400 font-bold">{formatVotes(duelTotalB)} votos</p>
                  </div>
                  <button onClick={() => { setDuelClubName(""); setDuelData([]); }}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={duelSearchQuery}
                    placeholder="Buscar rival..."
                    className="bg-secondary border-border text-sm"
                    onChange={(e) => handleDuelSearch(e.target.value)}
                  />
                  {duelSearchResults.length > 0 && (
                    <div className="absolute top-12 left-0 right-0 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto">
                      {duelSearchResults.map(club => (
                        <button key={club.id} onMouseDown={(e) => { e.preventDefault(); selectDuelClub(club); }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-secondary text-left">
                          <div className="w-7 h-7 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
                            <ClubLogo src={club.logo} alt={club.name} size="sm" />
                          </div>
                          <span className="text-xs font-black italic uppercase">{club.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Duel Comparison Panel */}
              {duelClubName && (
                <div className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase text-orange-400">{activeClubName}</span>
                    <span className="text-[10px] font-black uppercase text-muted-foreground">VS</span>
                    <span className="text-[10px] font-black uppercase text-blue-400">{duelClubName}</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${duelTotalA + duelTotalB > 0 ? (duelTotalA / (duelTotalA + duelTotalB)) * 100 : 50}%`,
                        background: "linear-gradient(90deg, #FF9B00, #FFD666)",
                      }}
                    />
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${duelTotalA + duelTotalB > 0 ? (duelTotalB / (duelTotalA + duelTotalB)) * 100 : 50}%`,
                        background: "linear-gradient(90deg, #3080d0, #80c0ff)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-bold text-orange-400">{formatVotes(duelTotalA)}</span>
                    <span className="text-[10px] font-bold text-blue-400">{formatVotes(duelTotalB)}</span>
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
                <button
                  onClick={() => navigateTo(bc.level, bc.label, bc.value)}
                  className="text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  {bc.label}
                </button>
              </span>
            ))}
          </div>

          {/* Top 5 */}
          <div className="mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-3 h-3" /> Top 5 Regiões
            </h3>
            {top5.length === 0 ? (
              <p className="text-[11px] italic text-muted-foreground text-center py-4">
                Nenhum voto registrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {top5.map((entry, i) => (
                  <div key={entry.region} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: i === 0 ? "#FFD666" : "#3a3a3a", color: i === 0 ? "#000" : "#fff" }}>
                          {i + 1}
                        </span>
                        {entry.region}
                      </span>
                      <span className="font-black text-orange-400">{formatVotes(Number(entry.votes))}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(Number(entry.votes) / Number(top5[0].votes)) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #B35A00, #FFD666)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Distribution */}
          {continentDistribution.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Globe className="w-3 h-3" /> Distribuição
              </h3>
              <div className="space-y-2">
                {continentDistribution.slice(0, 6).map(entry => (
                  <div key={entry.region} className="flex justify-between text-[10px]">
                    <span className="font-medium truncate mr-2">{entry.region}</span>
                    <span className="font-bold text-orange-400 shrink-0">{entry.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curiosidade Sagrada */}
          <AnimatePresence>
            {curiosity && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 rounded-xl border border-orange-500/20 bg-orange-950/20 mb-4"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">
                  <Flame className="w-3 h-3 inline mr-1" /> Curiosidade Sagrada
                </p>
                <p className="text-xs italic text-orange-200">{curiosity}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* MAP AREA */}
        <main className="flex-1 relative bg-background min-h-[400px] lg:min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/60 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            </div>
          )}

          <div className="w-full h-full min-h-[50vh] lg:min-h-full">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 140, center: [0, 20] }}
              style={{ width: "100%", height: "100%", minHeight: "50vh", background: "#0a0a0a" }}
            >
              <ZoomableGroup center={center} zoom={zoom} onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates as [number, number]); setZoom(z); }}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const name = geo.properties.NAME || geo.properties.name || "";
                      const iso = geo.properties.ISO_A3 || geo.properties.ADM0_A3 || "";

                      // Look up votes by country name (our DB stores country names in Portuguese)
                      const votesA = voteMap[name] || 0;
                      const votesB = duelVoteMap[name] || 0;

                      let fillColor: string;
                      if (duelMode && duelClubName) {
                        // In duel: winner takes color
                        if (votesA > votesB) fillColor = getDuelColor(votesA, maxVotes, DUEL_COLORS_A);
                        else if (votesB > votesA) fillColor = getDuelColor(votesB, duelMaxVotes, DUEL_COLORS_B);
                        else if (votesA > 0) fillColor = "#555";
                        else fillColor = "#1a1a1a";
                      } else {
                        fillColor = getBrasaColor(votesA, maxVotes);
                      }

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke="#444"
                          strokeWidth={0.4}
                          onClick={() => handleGeoClick(geo)}
                          onMouseEnter={(e) => {
                            if (votesA > 0 || votesB > 0) {
                              const totalForPct = totalVotes || 1;
                              setTooltip({
                                x: (e as any).clientX || 0,
                                y: (e as any).clientY || 0,
                                name,
                                votes: votesA,
                                pct: ((votesA / totalForPct) * 100).toFixed(1),
                              });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            default: { outline: "none", cursor: "pointer", transition: "fill 0.3s" },
                            hover: { outline: "none", fill: votesA > 0 ? "#FFE080" : "#333", cursor: "pointer" },
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
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fixed z-50 pointer-events-none px-4 py-3 rounded-xl bg-card border border-border shadow-2xl"
                style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
              >
                <p className="text-xs font-black italic uppercase">{tooltip.name}</p>
                <p className="text-[10px] text-orange-400 font-bold">{formatVotes(tooltip.votes)} votos</p>
                <p className="text-[9px] text-muted-foreground">{tooltip.pct}% do total</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 p-3 rounded-xl bg-card/80 backdrop-blur-md border border-border z-10">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-2 italic">Intensidade</p>
            <div className="flex items-center gap-0.5">
              {(duelMode && duelClubName ? DUEL_COLORS_A : BRASA_COLORS).slice(1).map((c, i) => (
                <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex justify-between text-[7px] text-muted-foreground mt-1">
              <span>Poucos</span>
              <span>Brasa 🔥</span>
            </div>
            {duelMode && duelClubName && (
              <>
                <div className="flex items-center gap-0.5 mt-2">
                  {DUEL_COLORS_B.slice(1).map((c, i) => (
                    <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex justify-between text-[7px] text-muted-foreground mt-1">
                  <span>Poucos</span>
                  <span>{duelClubName}</span>
                </div>
              </>
            )}
          </div>

          {/* State/City list overlay (when drilled in) */}
          {drillLevel !== "world" && heatData.length > 0 && (
            <div className="absolute top-4 left-4 p-4 rounded-xl bg-card/90 backdrop-blur-md border border-border z-10 max-h-[60%] overflow-y-auto w-64">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 italic">
                <MapPin className="w-3 h-3 inline mr-1" />
                {drillLevel === "state" ? "Estados" : "Cidades"}
              </h3>
              <div className="space-y-2">
                {[...heatData].sort((a, b) => Number(b.votes) - Number(a.votes)).slice(0, 15).map((entry, i) => (
                  <button
                    key={entry.region}
                    onClick={() => {
                      if (drillLevel === "state") navigateTo("city", entry.region, entry.region);
                    }}
                    className="w-full flex justify-between text-[10px] p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="text-[8px] text-muted-foreground w-4">{i + 1}.</span>
                      {entry.region}
                    </span>
                    <span className="font-black text-orange-400">{formatVotes(Number(entry.votes))}</span>
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
