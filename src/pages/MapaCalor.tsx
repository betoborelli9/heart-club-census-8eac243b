/* =====================================================================
 * MapaCalor.tsx — War Room Compact Heatmap
 * Layout: Sidebar 40% (rankings + breadcrumbs) | Mapa 60% (max 600px)
 * Drill-down: world → country → state → city
 * Choropleth: 5 tons de Laranja/Vermelho baseados em quantis
 * ===================================================================== */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, MapPin, Trophy, Flame, Search, Swords,
  ArrowLeft, Loader2, LogOut, X, Home,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ComposableMap, Geographies, Geography, ZoomableGroup, Marker,
} from "react-simple-maps";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import { CLUBS_DATA } from "@/clubes-data";
import logo from "@/assets/logo.png";

/* ---------- GEO sources ---------- */
const GEO_WORLD = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const GEO_BRAZIL_STATES = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";
/* Municípios por UF (IBGE via tbrugz/geodata-br) — usa código IBGE da UF */
const GEO_BR_MUN = (uf: number) => `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-${uf}-mun.json`;

/* Mapa Nome do Estado → { codigo IBGE, center [lng,lat], scale } */
const BR_STATE_INFO: Record<string, { code: number; center: [number, number]; scale: number }> = {
  "Acre":               { code: 12, center: [-70.0, -9.0],  scale: 2200 },
  "Alagoas":            { code: 27, center: [-36.6, -9.6],  scale: 4500 },
  "Amapá":              { code: 16, center: [-52.0, 1.5],   scale: 2400 },
  "Amazonas":           { code: 13, center: [-65.0, -4.5],  scale: 1400 },
  "Bahia":              { code: 29, center: [-41.5, -12.5], scale: 1900 },
  "Ceará":              { code: 23, center: [-39.5, -5.2],  scale: 2700 },
  "Distrito Federal":   { code: 53, center: [-47.8, -15.8], scale: 9000 },
  "Espírito Santo":     { code: 32, center: [-40.5, -19.8], scale: 3800 },
  "Goiás":              { code: 52, center: [-49.5, -15.8], scale: 2200 },
  "Maranhão":           { code: 21, center: [-45.5, -5.5],  scale: 2000 },
  "Mato Grosso":        { code: 51, center: [-55.5, -12.7], scale: 1500 },
  "Mato Grosso do Sul": { code: 50, center: [-54.5, -20.5], scale: 1900 },
  "Minas Gerais":       { code: 31, center: [-44.5, -18.5], scale: 1900 },
  "Pará":               { code: 15, center: [-52.5, -4.5],  scale: 1400 },
  "Paraíba":            { code: 25, center: [-36.8, -7.2],  scale: 4500 },
  "Paraná":             { code: 41, center: [-51.5, -24.5], scale: 2700 },
  "Pernambuco":         { code: 26, center: [-37.8, -8.4],  scale: 3200 },
  "Piauí":              { code: 22, center: [-43.0, -7.5],  scale: 2100 },
  "Rio de Janeiro":     { code: 33, center: [-42.5, -22.3], scale: 4800 },
  "Rio Grande do Norte":{ code: 24, center: [-36.5, -5.7],  scale: 4200 },
  "Rio Grande do Sul":  { code: 43, center: [-53.5, -29.8], scale: 2200 },
  "Rondônia":           { code: 11, center: [-63.0, -10.8], scale: 2200 },
  "Roraima":            { code: 14, center: [-61.5, 2.0],   scale: 2300 },
  "Santa Catarina":     { code: 42, center: [-50.0, -27.3], scale: 3400 },
  "São Paulo":          { code: 35, center: [-48.5, -22.0], scale: 2700 },
  "Sergipe":            { code: 28, center: [-37.3, -10.6], scale: 5500 },
  "Tocantins":          { code: 17, center: [-48.5, -10.5], scale: 1900 },
};

/* GeoJSON country-name → DB country-name (voto_pais) */
const COUNTRY_NAME_TO_DB: Record<string, string> = {
  "Brazil": "Brazil", "United States of America": "USA", "United States": "USA",
  "United Kingdom": "England", "Germany": "Germany", "Spain": "Spain",
  "Italy": "Italy", "France": "France", "Argentina": "Argentina",
  "South Korea": "South Korea", "Korea": "South Korea", "Australia": "Australia",
  "Mexico": "Mexico", "Japan": "Japan", "South Africa": "South Africa",
  "Egypt": "Egypt", "Canada": "Canada", "Nigeria": "Nigeria",
  "Saudi Arabia": "Saudi Arabia", "Uruguay": "Uruguay", "Chile": "Chile",
  "Portugal": "Portugal",
};

/* Country → projection config for drill-in */
const COUNTRY_PROJECTION: Record<string, { center: [number, number]; scale: number; statesGeo?: string }> = {
  "Brazil": { center: [-55, -14], scale: 700, statesGeo: GEO_BRAZIL_STATES },
  "USA": { center: [-98, 39], scale: 600 },
  "Argentina": { center: [-65, -38], scale: 700 },
  "Spain": { center: [-3, 40], scale: 1500 },
  "England": { center: [-2, 53], scale: 2000 },
  "Italy": { center: [12, 42], scale: 1500 },
  "Germany": { center: [10, 51], scale: 1700 },
  "France": { center: [2, 46], scale: 1700 },
  "Japan": { center: [138, 36], scale: 1100 },
  "Mexico": { center: [-102, 23], scale: 800 },
};

/* ---------- Helpers ---------- */
function normalize(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function formatVotes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

/* 5-tier choropleth scale (orange → deep red).
 * Quantile-based on the visible dataset so distribution scales with data. */
const CHOROPLETH = [
  "hsl(28 95% 60%)",   // tier 1 - light orange
  "hsl(22 95% 52%)",   // tier 2
  "hsl(16 95% 46%)",   // tier 3
  "hsl(10 90% 40%)",   // tier 4
  "hsl(0 85% 32%)",    // tier 5 - deep red
];
const EMPTY_FILL = "hsl(0 0% 14%)"; // dark neutral grey for null/zero

function buildScale(votesArr: number[]) {
  const sorted = votesArr.filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return (_: number) => EMPTY_FILL;
  const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
  const breaks = [q(0.2), q(0.4), q(0.6), q(0.8)];
  return (v: number) => {
    if (!v || v <= 0) return EMPTY_FILL;
    if (v <= breaks[0]) return CHOROPLETH[0];
    if (v <= breaks[1]) return CHOROPLETH[1];
    if (v <= breaks[2]) return CHOROPLETH[2];
    if (v <= breaks[3]) return CHOROPLETH[3];
    return CHOROPLETH[4];
  };
}

/* ---------- Types ---------- */
type ViewLevel = "world" | "country" | "state" | "city";
interface HeatEntry { region: string; votes: number; }
interface ClubVote { club: string; votes: number; }
interface Crumb { label: string; level: ViewLevel; value?: string; }
interface CityHit { city: string; state: string; votes: number; }
interface ClubCompareData {
  name: string;
  info: any;
  totalVotes: number;
  topRegion: { region: string; votes: number } | null;
}

/* ---------- Component ---------- */
const MapaCalor = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useUser();

  /* Active club */
  const [heartClubName, setHeartClubName] = useState("");
  const [activeClubName, setActiveClubName] = useState("");
  const [activeClubInfo, setActiveClubInfo] = useState<any>(null);

  /* Drill-down state */
  const [viewMode, setViewMode] = useState<ViewLevel>("world");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([{ label: "Mundo", level: "world" }]);

  /* Data */
  const [heatData, setHeatData] = useState<HeatEntry[]>([]);
  const [cityClubs, setCityClubs] = useState<ClubVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);

  /* Search clube */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);

  /* Search cidade (heart club) */
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [citySearchResults, setCitySearchResults] = useState<CityHit[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const citySearchDebounce = useRef<ReturnType<typeof setTimeout>>();

  /* Comparação de clubes (lado a lado) */
  const [compareClubName, setCompareClubName] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<ClubCompareData | null>(null);
  const [heartCompareData, setHeartCompareData] = useState<ClubCompareData | null>(null);

  /* Tooltip */
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; votes: number } | null>(null);

  /* City view: bairros (OSM Overpass) */
  const [cityCenter, setCityCenter] = useState<[number, number] | null>(null);
  const [cityBairrosGeo, setCityBairrosGeo] = useState<any | null>(null);
  const [bairrosLoading, setBairrosLoading] = useState(false);

  /* ---------- Load heart club ---------- */
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      const name = data?.clube_nome || "";
      setHeartClubName(name);
      setActiveClubName(name);
      setActiveClubInfo(CLUBS_DATA.find(c => c.nome === name) || null);
    };
    load();
  }, [user]);

  /* ---------- Fetch heatmap data on view change ---------- */
  useEffect(() => {
    if (!activeClubName) return;
    fetchHeat();
  }, [activeClubName, viewMode, activeCountry, activeState]);

  const fetchHeat = async () => {
    setLoading(true);
    let level: string = viewMode;
    let filter: string | null = null;
    if (viewMode === "world") level = "country";
    else if (viewMode === "country") { level = "state"; filter = activeCountry; }
    else if (viewMode === "state") { level = "city"; filter = activeState; }
    else if (viewMode === "city") { level = "city"; filter = activeState; }

    const { data, error } = await supabase.rpc("get_heatmap_data", {
      p_club_name: activeClubName,
      p_level: level,
      p_filter_value: filter,
    });
    if (!error && data) {
      const entries = (Array.isArray(data) ? data : []) as unknown as HeatEntry[];
      setHeatData(entries);
      setTotalVotes(entries.reduce((s, e) => s + Number(e.votes), 0));
    } else {
      setHeatData([]); setTotalVotes(0);
    }
    setLoading(false);
  };

  /* When a city is selected → fetch top clubs in that city */
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

  /* ---------- Maps & scales ---------- */
  const voteMap = useMemo(() => {
    const m: Record<string, number> = {};
    heatData.forEach(e => { m[normalize(e.region)] = Number(e.votes); });
    return m;
  }, [heatData]);

  const colorScale = useMemo(
    () => buildScale(heatData.map(e => Number(e.votes))),
    [heatData],
  );

  const ranking = useMemo(
    () => [...heatData].sort((a, b) => Number(b.votes) - Number(a.votes)).slice(0, 15),
    [heatData],
  );

  /* ---------- Navigation ---------- */
  const goWorld = useCallback(() => {
    setViewMode("world"); setActiveCountry(null); setActiveState(null); setActiveCity(null);
    setBreadcrumbs([{ label: "Mundo", level: "world" }]);
  }, []);

  const goCountry = useCallback((country: string) => {
    setViewMode("country"); setActiveCountry(country); setActiveState(null); setActiveCity(null);
    setBreadcrumbs([{ label: "Mundo", level: "world" }, { label: country, level: "country", value: country }]);
  }, []);

  const goState = useCallback((state: string) => {
    setViewMode("state"); setActiveState(state); setActiveCity(null);
    setBreadcrumbs(prev => [
      ...prev.filter(b => b.level === "world" || b.level === "country"),
      { label: state, level: "state", value: state },
    ]);
  }, []);

  const goCity = useCallback((city: string, stateOverride?: string) => {
    setViewMode("city"); setActiveCity(city);
    if (stateOverride) setActiveState(stateOverride);
    setCityCenter(null); setCityBairrosGeo(null);
    setBreadcrumbs(prev => [
      ...prev.filter(b => b.level !== "city"),
      { label: city, level: "city", value: city },
    ]);
  }, []);

  const handleCrumb = (c: Crumb) => {
    if (c.level === "world") goWorld();
    else if (c.level === "country" && c.value) goCountry(c.value);
    else if (c.level === "state" && c.value) goState(c.value);
  };

  /* ---------- Map click handlers ---------- */
  const handleWorldClick = (geo: any) => {
    const rawName = geo.properties.NAME || geo.properties.name || "";
    const dbName = COUNTRY_NAME_TO_DB[rawName] || rawName;
    goCountry(dbName);
  };
  const handleStateClick = (geo: any) => {
    const stateName = geo.properties.name || geo.properties.NAME || "";
    goState(stateName);
  };

  /* ---------- Search clube ---------- */
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length > 1) setSearchResults(await searchClubsLocal(val, 6));
    else setSearchResults([]);
  };
  /** Se o usuário ja tem clube do coração e busca outro → modo COMPARAÇÃO */
  const selectClub = (club: ClubSearchResult) => {
    setSearchQuery(""); setSearchResults([]);
    if (heartClubName && club.name !== heartClubName && club.name !== activeClubName) {
      setCompareClubName(club.name);
    } else {
      setActiveClubName(club.name);
      setActiveClubInfo(CLUBS_DATA.find(c => c.nome === club.name) || null);
      setCompareClubName(null);
      setCompareData(null);
      goWorld();
    }
  };
  const clearCompare = () => { setCompareClubName(null); setCompareData(null); };

  /* ---------- Search cidade (votos do clube ativo em uma cidade) ---------- */
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

  /* ---------- Fetch resumo (total + top região) p/ heart e compare ---------- */
  useEffect(() => {
    const run = async (clubName: string, setter: (d: ClubCompareData) => void) => {
      const info = CLUBS_DATA.find(c => c.nome === clubName) || null;
      const level = viewMode === "world" ? "country"
                  : viewMode === "country" ? "state"
                  : "city";
      const filter = viewMode === "country" ? activeCountry
                   : viewMode === "state"   ? activeState
                   : viewMode === "city"    ? activeState
                   : null;
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

  /* ---------- Carrega bairros via OSM (Overpass) ao entrar em uma cidade ---------- */
  useEffect(() => {
    if (viewMode !== "city" || !activeCity) {
      setCityBairrosGeo(null); setCityCenter(null); return;
    }
    let cancelled = false;
    const run = async () => {
      setBairrosLoading(true);
      try {
        // 1) Geocode da cidade via Nominatim → bbox + center
        const q = encodeURIComponent(`${activeCity}, ${activeState || ""}, Brasil`);
        const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
          headers: { "Accept-Language": "pt-BR" },
        }).then(r => r.json()).catch(() => []);
        if (cancelled || !geo?.[0]) { setBairrosLoading(false); return; }
        const lat = parseFloat(geo[0].lat); const lon = parseFloat(geo[0].lon);
        const bb = geo[0].boundingbox?.map(parseFloat); // [s,n,w,e]
        setCityCenter([lon, lat]);
        if (!bb) { setBairrosLoading(false); return; }

        // 2) Overpass: bairros (admin_level=10 OU place=suburb/neighbourhood) na bbox
        const overpassQ = `[out:json][timeout:25];
          (
            relation["boundary"="administrative"]["admin_level"="10"](${bb[0]},${bb[2]},${bb[1]},${bb[3]});
            way["place"~"suburb|neighbourhood|quarter"](${bb[0]},${bb[2]},${bb[1]},${bb[3]});
          );
          out geom;`;
        const op = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST", body: overpassQ,
        }).then(r => r.json()).catch(() => null);
        if (cancelled || !op?.elements) { setBairrosLoading(false); return; }

        // 3) Converter para GeoJSON FeatureCollection
        const features: any[] = [];
        for (const el of op.elements) {
          const name = el.tags?.name; if (!name) continue;
          if (el.type === "relation" && el.members) {
            const ways = el.members.filter((m: any) => m.type === "way" && m.geometry && m.geometry.length > 2);
            const polygons = ways.map((w: any) => [w.geometry.map((p: any) => [p.lon, p.lat])]);
            if (polygons.length) features.push({
              type: "Feature", properties: { name },
              geometry: { type: "MultiPolygon", coordinates: polygons },
            });
          } else if (el.type === "way" && el.geometry && el.geometry.length > 2) {
            features.push({
              type: "Feature", properties: { name },
              geometry: { type: "Polygon", coordinates: [el.geometry.map((p: any) => [p.lon, p.lat])] },
            });
          }
        }
        if (!cancelled) setCityBairrosGeo({ type: "FeatureCollection", features });
      } finally {
        if (!cancelled) setBairrosLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [viewMode, activeCity, activeState]);


  /* ---------- Render map by level ---------- */
  const projectionConfig = useMemo(() => {
    if (viewMode === "world") return { scale: 130, center: [0, 20] as [number, number] };
    if (viewMode === "country" && activeCountry) {
      const cfg = COUNTRY_PROJECTION[activeCountry];
      if (cfg) return { scale: cfg.scale, center: cfg.center };
    }
    if (viewMode === "state" && activeCountry === "Brazil" && activeState) {
      const info = BR_STATE_INFO[activeState];
      if (info) return { scale: info.scale, center: info.center };
      return { scale: 1400, center: [-50, -15] as [number, number] };
    }
    if (viewMode === "city" && cityCenter) {
      return { scale: 60000, center: cityCenter };
    }
    return { scale: 130, center: [0, 20] as [number, number] };
  }, [viewMode, activeCountry, activeState, cityCenter]);

  const renderMap = () => {
    /* WORLD: countries colored by total votes */
    if (viewMode === "world") {
      return (
        <Geographies geography={GEO_WORLD}>
          {({ geographies }) => geographies.map(geo => {
            const rawName = geo.properties.NAME || geo.properties.name || "";
            const dbName = COUNTRY_NAME_TO_DB[rawName] || rawName;
            const v = voteMap[normalize(dbName)] || 0;
            return (
              <Geography
                key={geo.rsmKey} geography={geo}
                fill={colorScale(v)}
                stroke="hsl(0 0% 100% / 0.05)" strokeWidth={0.5}
                onClick={() => handleWorldClick(geo)}
                onMouseMove={(e: any) => setTooltip({ x: e.clientX, y: e.clientY, name: dbName, votes: v })}
                onMouseLeave={() => setTooltip(null)}
                style={{
                  default: { outline: "none", cursor: "pointer", transition: "fill 0.25s" },
                  hover: { outline: "none", fill: "hsl(var(--primary))", cursor: "pointer" },
                  pressed: { outline: "none" },
                }}
              />
            );
          })}
        </Geographies>
      );
    }

    /* COUNTRY = BRAZIL: render states geojson */
    if (viewMode === "country" && activeCountry === "Brazil") {
      return (
        <Geographies geography={GEO_BRAZIL_STATES}>
          {({ geographies }) => {
            console.log("[MapaCalor] Brazil geographies loaded:", geographies?.length);
            return geographies.map(geo => {
              const stateName = geo.properties.name || "";
              const v = voteMap[normalize(stateName)] || 0;
              return (
                <Geography
                  key={geo.rsmKey} geography={geo}
                  fill={colorScale(v)}
                  stroke="hsl(0 0% 100% / 0.15)" strokeWidth={0.5}
                  onClick={() => handleStateClick(geo)}
                  onMouseMove={(e: any) => setTooltip({ x: e.clientX, y: e.clientY, name: stateName, votes: v })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none", cursor: "pointer", transition: "fill 0.25s" },
                    hover: { outline: "none", fill: "hsl(var(--primary))", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            });
          }}
        </Geographies>
      );
    }

    /* STATE BRASIL: render municípios geojson */
    if (viewMode === "state" && activeCountry === "Brazil" && activeState && BR_STATE_INFO[activeState]) {
      const ufCode = BR_STATE_INFO[activeState].code;
      return (
        <Geographies geography={GEO_BR_MUN(ufCode)}>
          {({ geographies }) => {
            console.log(`[MapaCalor] Municípios ${activeState} (UF ${ufCode}):`, geographies?.length);
            return geographies.map(geo => {
              const cityName = geo.properties.name || geo.properties.NAME || "";
              const v = voteMap[normalize(cityName)] || 0;
              return (
                <Geography
                  key={geo.rsmKey} geography={geo}
                  fill={colorScale(v)}
                  stroke="hsl(0 0% 100% / 0.12)" strokeWidth={0.3}
                  onClick={() => goCity(cityName, activeState)}
                  onMouseMove={(e: any) => setTooltip({ x: e.clientX, y: e.clientY, name: cityName, votes: v })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none", cursor: "pointer", transition: "fill 0.25s" },
                    hover: { outline: "none", fill: "hsl(var(--primary))", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            });
          }}
        </Geographies>
      );
    }

    /* CITY: bairros via OSM Overpass + marcador central */
    if (viewMode === "city" && activeCity) {
      return (
        <>
          {cityBairrosGeo && (
            <Geographies geography={cityBairrosGeo}>
              {({ geographies }) => geographies.map((geo: any) => {
                const bairroName = geo.properties.name || "";
                const v = voteMap[normalize(bairroName)] || 0; // dados de bairro normalmente 0
                return (
                  <Geography
                    key={geo.rsmKey} geography={geo}
                    fill={v > 0 ? colorScale(v) : "hsl(28 95% 60% / 0.18)"}
                    stroke="hsl(28 95% 60% / 0.55)" strokeWidth={0.4}
                    onMouseMove={(e: any) => setTooltip({ x: e.clientX, y: e.clientY, name: bairroName, votes: v })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: { outline: "none", cursor: "pointer", transition: "fill 0.25s" },
                      hover: { outline: "none", fill: "hsl(var(--primary))", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })}
            </Geographies>
          )}
          {cityCenter && (
            <Marker coordinates={cityCenter}>
              <circle r={6} fill="hsl(var(--primary))" stroke="white" strokeWidth={1.5} />
              <text textAnchor="middle" y={-10} className="fill-white"
                style={{ fontSize: 8, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase" }}>
                {activeCity}
              </text>
            </Marker>
          )}
        </>
      );
    }

    /* COUNTRY (não-Brasil) ou STATE: bubble map sobre o país */
    const countryCfg = activeCountry ? COUNTRY_PROJECTION[activeCountry] : null;
    const maxV = Math.max(...heatData.map(e => Number(e.votes)), 1);
    /* As bubbles não têm coords reais → mostramos a malha do país e
       sobrepomos uma "matriz" simbólica clicável de pontos via ranking. */
    return (
      <>
        <Geographies geography={GEO_WORLD}>
          {({ geographies }) => geographies.map(geo => {
            const rawName = geo.properties.NAME || geo.properties.name || "";
            const dbName = COUNTRY_NAME_TO_DB[rawName] || rawName;
            const isActive = dbName === activeCountry;
            return (
              <Geography
                key={geo.rsmKey} geography={geo}
                fill={isActive ? "hsl(0 0% 18%)" : "hsl(0 0% 8%)"}
                stroke="hsl(0 0% 100% / 0.05)" strokeWidth={0.4}
                style={{ default: { outline: "none" }, hover: { outline: "none", fill: "hsl(0 0% 22%)" }, pressed: { outline: "none" } }}
              />
            );
          })}
        </Geographies>
        {/* Bubbles distribuídas em grid no centro do país */}
        {ranking.slice(0, 20).map((entry, i) => {
          if (!countryCfg) return null;
          const angle = (i / Math.min(20, ranking.length)) * Math.PI * 2;
          const radius = 3 + (i % 3) * 2;
          const lng = countryCfg.center[0] + Math.cos(angle) * radius;
          const lat = countryCfg.center[1] + Math.sin(angle) * radius;
          const v = Number(entry.votes);
          const size = 4 + (v / maxV) * 14;
          return (
            <Marker key={entry.region} coordinates={[lng, lat]}>
              <circle
                r={size} fill={colorScale(v)}
                fillOpacity={0.8}
                stroke="hsl(0 0% 100% / 0.4)" strokeWidth={0.5}
                style={{ cursor: "pointer" }}
                onClick={() => viewMode === "country" ? goState(entry.region) : goCity(entry.region)}
                onMouseMove={(e: any) => setTooltip({ x: e.clientX, y: e.clientY, name: entry.region, votes: v })}
                onMouseLeave={() => setTooltip(null)}
              />
            </Marker>
          );
        })}
      </>
    );
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
      {/* HEADER */}
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

      {/* MAIN GRID — 40/60 */}
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        {/* Breadcrumbs (topo) */}
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
          {/* SIDEBAR — 40% (2 of 5) */}
          <aside className="lg:col-span-2 space-y-4">
            {/* Club search */}
            <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/5 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery} placeholder="Pesquisar clube..."
                  className="pl-10 bg-secondary/50 border-white/5"
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-card border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
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

              {/* CARDS COMPARATIVOS — Heart club (sempre) + Compare (se houver) */}
              {activeClubName && (
                <div className={`mt-3 grid gap-2 ${compareData ? "grid-cols-2" : "grid-cols-1"}`}>
                  {/* Heart card */}
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

                  {/* Compare card */}
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

              {/* BUSCA POR CIDADE — votos do clube ativo em uma cidade específica */}
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

            {/* Ranking lateral */}
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

            {/* Top clubes na cidade selecionada */}
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
                            : isCompare ? "bg-white/10 border border-white/20"
                            : "bg-white/5"
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

          {/* MAP — 60% (3 of 5) */}
          <main className="lg:col-span-3">
            <div className="relative rounded-[32px] bg-black/40 backdrop-blur-xl border border-white/5 overflow-hidden h-[380px] sm:h-[480px] lg:h-[600px]">
            
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-sm">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              )}
              {bairrosLoading && viewMode === "city" && (
                <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-black/70 border border-primary/30 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[9px] font-black italic uppercase text-primary">Carregando bairros...</span>
                </div>
              )}

              <ComposableMap
                projection="geoMercator"
                projectionConfig={projectionConfig}
                width={800}
                height={600}
                style={{ width: "100%", height: "100%", background: "transparent", display: "block" }}
              >
                <ZoomableGroup
                  center={projectionConfig.center}
                  zoom={1}
                  minZoom={1}
                  maxZoom={12}
                >
                  {renderMap()}
                </ZoomableGroup>
              </ComposableMap>

              {/* Legend */}
              <div className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 z-10">
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
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 z-10">
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

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && tooltip.name && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed z-[100] pointer-events-none px-3 py-2 rounded-xl bg-black/90 border border-white/10 shadow-2xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <p className="text-[10px] font-black italic uppercase">{tooltip.name}</p>
            <p className="text-[10px] text-primary font-bold">{formatVotes(tooltip.votes)} votos</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapaCalor;
