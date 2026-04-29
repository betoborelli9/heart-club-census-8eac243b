/* =====================================================================
 * MapaCalor.tsx — War Room Heatmap (Leaflet Engine)
 * Engine: react-leaflet + leaflet.heat
 * Tiles: CartoDB DarkMatter (preto absoluto, fronteiras minimalistas)
 * Drill-down infinito: Mundo → País → Estado → Cidade → Bairro/Rua
 * Heatmap real (intensidade laranja → vermelho) + Circle markers clicáveis
 * Geocoding: Nominatim (OpenStreetMap) com cache em localStorage
 * ===================================================================== */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, MapPin, Trophy, Flame, Search, Loader2, LogOut,
  X, Home, ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import { CLUBS_DATA } from "@/clubes-data";
import logo from "@/assets/logo.png";

/* ---------- Helpers ---------- */
function normalize(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function formatVotes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

/* Paleta War Room */
const CHOROPLETH = [
  "hsl(28 95% 60%)",
  "hsl(22 95% 52%)",
  "hsl(16 95% 46%)",
  "hsl(10 90% 40%)",
  "hsl(0 85% 32%)",
];

/* Mapeamento de nomes de país para o banco (DB usa "USA", "England", etc.) */
const COUNTRY_NAME_TO_DB: Record<string, string> = {
  "Brazil": "Brazil", "United States of America": "USA", "United States": "USA",
  "United Kingdom": "England",
};
const DB_TO_GEOCODE_COUNTRY: Record<string, string> = {
  "USA": "United States", "England": "United Kingdom",
};

/* Zoom alvo por nível */
const ZOOM_BY_LEVEL = { world: 2, country: 5, state: 7, city: 13, bairro: 16 } as const;

/* ---------- Geocoding (Nominatim com cache localStorage) ---------- */
const GEO_CACHE_KEY = "mapacalor_geo_cache_v1";
function loadGeoCache(): Record<string, [number, number]> {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveGeoCache(cache: Record<string, [number, number]>) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); } catch {}
}
const geoCache: Record<string, [number, number]> = loadGeoCache();

async function geocode(query: string): Promise<[number, number] | null> {
  const key = normalize(query);
  if (geoCache[key]) return geoCache[key];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "Accept-Language": "pt-BR" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      const coord: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geoCache[key] = coord;
      saveGeoCache(geoCache);
      return coord;
    }
  } catch {}
  return null;
}

/* ---------- Types ---------- */
type ViewLevel = "world" | "country" | "state" | "city";
interface HeatEntry { region: string; votes: number; }
interface ClubVote { club: string; votes: number; }
interface Crumb { label: string; level: ViewLevel; value?: string; }
interface CityHit { city: string; state: string; votes: number; }
interface ClubCompareData {
  name: string; info: any; totalVotes: number;
  topRegion: { region: string; votes: number } | null;
}
interface GeoPoint { lat: number; lng: number; weight: number; name: string; }

/* ---------- Sub-components ---------- */
/** Heatmap layer usando leaflet.heat */
function HeatLayer({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  useEffect(() => {
    if (!points.length) {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }
    const max = Math.max(...points.map(p => p.weight), 1);
    const data = points.map(p => [p.lat, p.lng, p.weight / max]);
    if (layerRef.current) map.removeLayer(layerRef.current);
    // @ts-ignore
    layerRef.current = L.heatLayer(data, {
      radius: 35, blur: 25, maxZoom: 18, max: 1.0,
      gradient: {
        0.0: "rgba(255,165,0,0)",
        0.2: "#ffb347",
        0.4: "#ff8c1a",
        0.6: "#ff6200",
        0.8: "#e63900",
        1.0: "#a31515",
      },
    }).addTo(map);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [points, map]);
  return null;
}

/** Faz flyTo sempre que center/zoom mudam */
function FlyController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom, map]);
  return null;
}

/* ---------- Component principal ---------- */
const MapaCalor = () => {
  const navigate = useNavigate();
  const { user, signOut } = useUser();

  /* Active club */
  const [heartClubName, setHeartClubName] = useState("");
  const [activeClubName, setActiveClubName] = useState("");
  const [activeClubInfo, setActiveClubInfo] = useState<any>(null);

  /* Drill-down */
  const [viewMode, setViewMode] = useState<ViewLevel>("world");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([{ label: "Mundo", level: "world" }]);

  /* Map view */
  const [mapCenter, setMapCenter] = useState<[number, number]>([10, 0]);
  const [mapZoom, setMapZoom] = useState<number>(ZOOM_BY_LEVEL.world);

  /* Data */
  const [heatData, setHeatData] = useState<HeatEntry[]>([]);
  const [cityClubs, setCityClubs] = useState<ClubVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [points, setPoints] = useState<GeoPoint[]>([]);

  /* Search */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [citySearchResults, setCitySearchResults] = useState<CityHit[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const citySearchDebounce = useRef<ReturnType<typeof setTimeout>>();

  /* Compare */
  const [compareClubName, setCompareClubName] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<ClubCompareData | null>(null);
  const [heartCompareData, setHeartCompareData] = useState<ClubCompareData | null>(null);

  /* ---------- Load heart club ---------- */
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos").select("clube_nome")
        .eq("user_id", user.id).eq("is_original_vote", true).maybeSingle();
      const name = data?.clube_nome || "";
      setHeartClubName(name); setActiveClubName(name);
      setActiveClubInfo(CLUBS_DATA.find(c => c.nome === name) || null);
    };
    load();
  }, [user]);

  /* ---------- Fetch heatmap data ---------- */
  useEffect(() => {
    if (!activeClubName) return;
    const fetchHeat = async () => {
      setLoading(true);
      let level: string = viewMode;
      let filter: string | null = null;
      if (viewMode === "world") level = "country";
      else if (viewMode === "country") { level = "state"; filter = activeCountry; }
      else if (viewMode === "state") { level = "city"; filter = activeState; }
      else if (viewMode === "city") { level = "city"; filter = activeState; }

      const { data, error } = await supabase.rpc("get_heatmap_data", {
        p_club_name: activeClubName, p_level: level, p_filter_value: filter,
      });
      if (!error && data) {
        const entries = (Array.isArray(data) ? data : []) as unknown as HeatEntry[];
        setHeatData(entries);
        setTotalVotes(entries.reduce((s, e) => s + Number(e.votes), 0));
      } else { setHeatData([]); setTotalVotes(0); }
      setLoading(false);
    };
    fetchHeat();
  }, [activeClubName, viewMode, activeCountry, activeState]);

  /* ---------- Geocoding em batch ---------- */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!heatData.length) { setPoints([]); return; }
      setGeocoding(true);
      const out: GeoPoint[] = [];
      // limita: primeiros 50 para não estourar Nominatim
      for (const e of heatData.slice(0, 50)) {
        if (cancelled) return;
        let q = e.region;
        // Constrói query mais precisa por nível
        if (viewMode === "world") {
          q = DB_TO_GEOCODE_COUNTRY[e.region] || e.region;
        } else if (viewMode === "country") {
          q = `${e.region}, ${DB_TO_GEOCODE_COUNTRY[activeCountry || ""] || activeCountry}`;
        } else if (viewMode === "state" || viewMode === "city") {
          q = `${e.region}, ${activeState || ""}, ${DB_TO_GEOCODE_COUNTRY[activeCountry || ""] || activeCountry || "Brasil"}`;
        }
        const coord = await geocode(q);
        if (coord) out.push({ lat: coord[0], lng: coord[1], weight: Number(e.votes), name: e.region });
        // throttle leve para Nominatim (1 req/s recomendado, mas como temos cache, vai rápido após 1ª vez)
        if (!geoCache[normalize(q)]) await new Promise(r => setTimeout(r, 250));
      }
      if (!cancelled) { setPoints(out); setGeocoding(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [heatData, viewMode, activeCountry, activeState]);

  /* ---------- City: top clubs ---------- */
  useEffect(() => {
    if (viewMode !== "city" || !activeCity) { setCityClubs([]); return; }
    const run = async () => {
      const { data } = await supabase.rpc("get_top_clubs_by_region", {
        p_level: "city", p_value: activeCity, p_limit: 10,
      });
      if (data) setCityClubs((Array.isArray(data) ? data : []) as unknown as ClubVote[]);
    };
    run();
  }, [viewMode, activeCity]);

  /* ---------- Ranking ---------- */
  const ranking = useMemo(
    () => [...heatData].sort((a, b) => Number(b.votes) - Number(a.votes)).slice(0, 15),
    [heatData],
  );

  /* ---------- Navigation + flyTo ---------- */
  const goWorld = useCallback(() => {
    setViewMode("world"); setActiveCountry(null); setActiveState(null); setActiveCity(null);
    setBreadcrumbs([{ label: "Mundo", level: "world" }]);
    setMapCenter([10, 0]); setMapZoom(ZOOM_BY_LEVEL.world);
  }, []);

  const goCountry = useCallback(async (country: string) => {
    setViewMode("country"); setActiveCountry(country); setActiveState(null); setActiveCity(null);
    setBreadcrumbs([{ label: "Mundo", level: "world" }, { label: country, level: "country", value: country }]);
    const coord = await geocode(DB_TO_GEOCODE_COUNTRY[country] || country);
    if (coord) { setMapCenter(coord); setMapZoom(ZOOM_BY_LEVEL.country); }
  }, []);

  const goState = useCallback(async (state: string) => {
    setViewMode("state"); setActiveState(state); setActiveCity(null);
    setBreadcrumbs(prev => [
      ...prev.filter(b => b.level === "world" || b.level === "country"),
      { label: state, level: "state", value: state },
    ]);
    const coord = await geocode(`${state}, ${DB_TO_GEOCODE_COUNTRY[activeCountry || ""] || activeCountry || "Brasil"}`);
    if (coord) { setMapCenter(coord); setMapZoom(ZOOM_BY_LEVEL.state); }
  }, [activeCountry]);

  const goCity = useCallback(async (city: string, stateOverride?: string) => {
    setViewMode("city"); setActiveCity(city);
    if (stateOverride) setActiveState(stateOverride);
    setBreadcrumbs(prev => [
      ...prev.filter(b => b.level !== "city"),
      { label: city, level: "city", value: city },
    ]);
    const st = stateOverride || activeState || "";
    const coord = await geocode(`${city}, ${st}, ${DB_TO_GEOCODE_COUNTRY[activeCountry || ""] || activeCountry || "Brasil"}`);
    if (coord) { setMapCenter(coord); setMapZoom(ZOOM_BY_LEVEL.city); }
  }, [activeCountry, activeState]);

  const handleCrumb = (c: Crumb) => {
    if (c.level === "world") goWorld();
    else if (c.level === "country" && c.value) goCountry(c.value);
    else if (c.level === "state" && c.value) goState(c.value);
  };

  /* ---------- Search clube ---------- */
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length > 1) setSearchResults(await searchClubsLocal(val, 6));
    else setSearchResults([]);
  };
  const selectClub = (club: ClubSearchResult) => {
    setSearchQuery(""); setSearchResults([]);
    if (heartClubName && club.name !== heartClubName && club.name !== activeClubName) {
      setCompareClubName(club.name);
    } else {
      setActiveClubName(club.name);
      setActiveClubInfo(CLUBS_DATA.find(c => c.nome === club.name) || null);
      setCompareClubName(null); setCompareData(null);
      goWorld();
    }
  };
  const clearCompare = () => { setCompareClubName(null); setCompareData(null); };

  /* ---------- Search cidade ---------- */
  const handleCitySearch = (val: string) => {
    setCitySearchQuery(val);
    if (citySearchDebounce.current) clearTimeout(citySearchDebounce.current);
    if (val.length < 2 || !activeClubName) {
      setCitySearchResults([]); setCitySearchLoading(false); return;
    }
    setCitySearchLoading(true);
    citySearchDebounce.current = setTimeout(async () => {
      const { data } = await supabase.rpc("search_club_city_votes", {
        p_club_name: activeClubName, p_city_query: val, p_limit: 15,
      });
      setCitySearchResults((Array.isArray(data) ? data : []) as unknown as CityHit[]);
      setCitySearchLoading(false);
    }, 300);
  };

  /* ---------- Comparativo (heart + compare) ---------- */
  useEffect(() => {
    const run = async (clubName: string, setter: (d: ClubCompareData) => void) => {
      const info = CLUBS_DATA.find(c => c.nome === clubName) || null;
      const level = viewMode === "world" ? "country"
                  : viewMode === "country" ? "state" : "city";
      const filter = viewMode === "country" ? activeCountry
                   : viewMode === "state" || viewMode === "city" ? activeState : null;
      const { data } = await supabase.rpc("get_heatmap_data", {
        p_club_name: clubName, p_level: level, p_filter_value: filter,
      });
      const arr = (Array.isArray(data) ? data : []) as unknown as HeatEntry[];
      const total = arr.reduce((s, e) => s + Number(e.votes), 0);
      const top = arr.length ? { region: arr[0].region, votes: Number(arr[0].votes) } : null;
      setter({ name: clubName, info, totalVotes: total, topRegion: top });
    };
    if (compareClubName) run(compareClubName, setCompareData);
    else setCompareData(null);
    if (activeClubName) run(activeClubName, setHeartCompareData);
  }, [compareClubName, activeClubName, viewMode, activeCountry, activeState]);

  /* ---------- Click no marker (drill-down) ---------- */
  const handleMarkerClick = (regionName: string) => {
    if (viewMode === "world") goCountry(COUNTRY_NAME_TO_DB[regionName] || regionName);
    else if (viewMode === "country") goState(regionName);
    else if (viewMode === "state") goCity(regionName);
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
      <header className="h-14 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            <img src={logo} alt="Heart Club" className="h-8 w-auto" />
            <span className="font-black italic text-sm tracking-tighter hidden sm:block">WAR ROOM</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          <button onClick={goWorld} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-3 h-3" /> Início
          </button>
          {breadcrumbs.slice(1).map((bc, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button onClick={() => handleCrumb(bc)} className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                {bc.label}
              </button>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* SIDEBAR */}
          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/5 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery} placeholder="Pesquisar clube..."
                  className="pl-10 bg-secondary/50 border-white/5"
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-card border border-white/10 rounded-xl overflow-hidden z-[1000] shadow-2xl max-h-60 overflow-y-auto">
                    {searchResults.map(club => (
                      <button key={club.id} onMouseDown={(e) => { e.preventDefault(); selectClub(club); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary text-left">
                        <div className="w-7 h-7 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
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

              {activeClubName && (
                <div className={`mt-3 grid gap-2 ${compareData ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="p-3 rounded-xl bg-white/5 border border-primary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
                        <ClubLogo src={(heartCompareData?.info || activeClubInfo)?.logoUrl} alt={activeClubName} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] text-primary font-black uppercase tracking-widest">❤️ Coração</p>
                        <h3 className="text-[10px] font-black italic uppercase truncate leading-tight">{activeClubName}</h3>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-black uppercase">Total visível</p>
                    <p className="text-sm text-primary font-black italic">{formatVotes(heartCompareData?.totalVotes ?? totalVotes)}</p>
                    {heartCompareData?.topRegion && (
                      <p className="text-[8px] text-muted-foreground mt-1 truncate">
                        Top: <span className="font-black uppercase">{heartCompareData.topRegion.region}</span> ({formatVotes(heartCompareData.topRegion.votes)})
                      </p>
                    )}
                  </div>

                  {compareData && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 relative">
                      <button onClick={clearCompare} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center hover:bg-primary/30">
                        <X className="w-3 h-3" />
                      </button>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
                          <ClubLogo src={compareData.info?.logoUrl} alt={compareData.name} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest">⚔️ vs</p>
                          <h3 className="text-[10px] font-black italic uppercase truncate leading-tight">{compareData.name}</h3>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-black uppercase">Total visível</p>
                      <p className="text-sm font-black italic" style={{ color: CHOROPLETH[2] }}>{formatVotes(compareData.totalVotes)}</p>
                      {compareData.topRegion && (
                        <p className="text-[8px] text-muted-foreground mt-1 truncate">
                          Top: <span className="font-black uppercase">{compareData.topRegion.region}</span> ({formatVotes(compareData.topRegion.votes)})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeClubName && (
                <div className="mt-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={citySearchQuery}
                      placeholder={`Votos de ${activeClubName} em uma cidade...`}
                      className="pl-10 bg-secondary/50 border-white/5 text-xs"
                      onChange={(e) => handleCitySearch(e.target.value)}
                    />
                    {citySearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
                    )}
                  </div>
                  {citySearchResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                      {citySearchResults.map((c, i) => (
                        <button
                          key={`${c.city}-${c.state}-${i}`}
                          onClick={() => goCity(c.city, c.state)}
                          className="w-full flex justify-between items-center text-[10px] p-2 rounded-lg bg-white/5 hover:bg-primary/20 transition-colors"
                        >
                          <span className="font-black italic uppercase truncate text-left">
                            {c.city} <span className="text-muted-foreground font-normal">/ {c.state}</span>
                          </span>
                          <span className="font-black text-primary shrink-0">{formatVotes(Number(c.votes))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {citySearchQuery.length >= 2 && !citySearchLoading && citySearchResults.length === 0 && (
                    <p className="text-[10px] italic text-muted-foreground text-center py-2">
                      Nenhum voto encontrado para "{citySearchQuery}".
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Ranking */}
            <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/5 p-4">
              <h3 className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-3 h-3" />
                {viewMode === "world" && "Top Países"}
                {viewMode === "country" && `Top em ${activeCountry}`}
                {viewMode === "state" && `Top em ${activeState}`}
                {viewMode === "city" && `Cidades de ${activeState}`}
              </h3>
              {ranking.length === 0 ? (
                <p className="text-[11px] italic text-muted-foreground text-center py-4">
                  Nenhum voto registrado ainda.
                </p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {ranking.map((entry, i) => {
                    const v = Number(entry.votes);
                    const max = Number(ranking[0].votes);
                    const pct = (v / max) * 100;
                    return (
                      <button
                        key={entry.region}
                        onClick={() => {
                          if (viewMode === "world") goCountry(entry.region);
                          else if (viewMode === "country") goState(entry.region);
                          else if (viewMode === "state") goCity(entry.region);
                        }}
                        className="w-full text-left group"
                      >
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="font-black italic uppercase flex items-center gap-1.5 truncate">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0"
                              style={{ backgroundColor: i < 3 ? CHOROPLETH[4] : "hsl(0 0% 18%)", color: "white" }}>
                              {i + 1}
                            </span>
                            <span className="truncate group-hover:text-primary transition-colors">{entry.region}</span>
                          </span>
                          <span className="font-black text-primary shrink-0">{formatVotes(v)}</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.04 }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${CHOROPLETH[1]}, ${CHOROPLETH[4]})` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top clubes na cidade */}
            {viewMode === "city" && activeCity && (
              <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-primary/20 p-4">
                <h3 className="text-[10px] font-black italic uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <Flame className="w-3 h-3" /> Clubes mais votados em {activeCity}
                </h3>
                {cityClubs.length === 0 ? (
                  <p className="text-[11px] italic text-muted-foreground text-center py-3">Carregando...</p>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {cityClubs.map((c, i) => {
                      const info = CLUBS_DATA.find(cd => cd.nome === c.club);
                      const isHeart = c.club === heartClubName;
                      const isCompare = c.club === compareClubName;
                      return (
                        <div key={c.club}
                          className={`flex justify-between items-center text-[10px] p-2 rounded-lg ${
                            isHeart ? "bg-primary/15 border border-primary/40"
                            : isCompare ? "bg-white/10 border border-white/20" : "bg-white/5"
                          }`}>
                          <span className="font-black italic uppercase truncate flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                            <span className="w-6 h-6 bg-white rounded-full p-0.5 flex items-center justify-center shrink-0">
                              <ClubLogo src={info?.logoUrl} alt={c.club} size="sm" />
                            </span>
                            <span className="truncate">{c.club}</span>
                            {isHeart && <span className="text-primary text-[8px] shrink-0">❤️</span>}
                            {isCompare && <span className="text-[8px] shrink-0">⚔️</span>}
                          </span>
                          <span className="font-black text-primary shrink-0">{formatVotes(Number(c.votes))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* MAP */}
          <main className="lg:col-span-3">
            <div className="relative rounded-[32px] bg-black border border-white/5 overflow-hidden h-[380px] sm:h-[480px] lg:h-[600px]">
              {(loading || geocoding) && (
                <div className="absolute top-3 right-3 z-[500] px-3 py-1.5 rounded-xl bg-black/70 border border-primary/30 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[9px] font-black italic uppercase text-primary">
                    {loading ? "Carregando..." : "Geocoding..."}
                  </span>
                </div>
              )}

              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                minZoom={2}
                maxZoom={19}
                worldCopyJump={true}
                style={{ width: "100%", height: "100%", background: "#000" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
                  url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                  subdomains="abcd"
                />
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                  subdomains="abcd"
                  opacity={0.7}
                />
                <FlyController center={mapCenter} zoom={mapZoom} />
                <HeatLayer points={points} />
                {points.map((p, i) => (
                  <CircleMarker
                    key={`${p.name}-${i}`}
                    center={[p.lat, p.lng]}
                    radius={Math.max(4, Math.min(14, 4 + Math.log2(p.weight + 1) * 2))}
                    pathOptions={{
                      color: "#ff6200",
                      fillColor: "#ff6200",
                      fillOpacity: 0.6,
                      weight: 1.2,
                    }}
                    eventHandlers={{ click: () => handleMarkerClick(p.name) }}
                  >
                    <LTooltip direction="top" offset={[0, -4]} opacity={0.95}>
                      <div style={{ fontFamily: "Verdana, sans-serif" }}>
                        <div style={{ fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", fontSize: 10 }}>
                          {p.name}
                        </div>
                        <div style={{ color: "#ff6200", fontWeight: 700, fontSize: 10 }}>
                          {formatVotes(p.weight)} votos
                        </div>
                      </div>
                    </LTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 z-[500]">
                <p className="text-[8px] font-black italic uppercase tracking-widest text-muted-foreground mb-1.5">Densidade de votos</p>
                <div className="flex items-center gap-0.5">
                  {CHOROPLETH.map((c, i) => (
                    <div key={i} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex justify-between text-[7px] text-muted-foreground mt-1">
                  <span>Baixa</span><span>Alta</span>
                </div>
              </div>

              {/* Level badge */}
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 z-[500]">
                <p className="text-[9px] font-black italic uppercase tracking-widest text-primary">
                  {viewMode === "world" && "🌍 Mundial"}
                  {viewMode === "country" && `🏳️ ${activeCountry}`}
                  {viewMode === "state" && `📍 ${activeState}`}
                  {viewMode === "city" && `🎯 ${activeCity}`}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MapaCalor;
