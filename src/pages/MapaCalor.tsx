/**
 * [CAMINHO]: src/pages/MapaCalor.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 6.0 (AUTONOMIA GLOBAL TOTAL + CHOROPLETH WAR ROOM)
 *
 * [CONTEXTO]:
 *   War Room Coroplético com drill-down Mundo → País → Estado → Cidade → Bairro.
 *   Sem listas manuais de UF/Países. Cruzamento orgânico via normalização
 *   das propriedades nativas do GeoJSON/OSM (name, name_pt, ISO_A2, ref, sigla).
 *
 * [PORTEIRO]:
 *   O AddressModal continua sendo a porta de entrada. A lógica de bloqueio por
 *   CEP no useEffect inicial NÃO foi alterada.
 *
 * [ESTÉTICA]:
 *   Glassmorphism + CartoDB DarkMatter + paleta laranja→vermelho profundo.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  MapPin,
  Trophy,
  Flame,
  Search,
  Loader2,
  LogOut,
  X,
  Home,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import {
  fetchOfficialGoianiaNeighborhoodGeoJson,
  hasPreciseOverride,
} from "@/lib/official-neighborhoods";
import AddressModal from "@/components/AddressModal";
import logo from "@/assets/logo.png";

/* =====================================================================
 * SEÇÃO 1 — TIPOS
 * ===================================================================== */

type ViewLevel = "world" | "country" | "state" | "city";

type GeoBbox = [number, number, number, number]; // [south, north, west, east]

interface HeatRow {
  region: string;
  votes: number;
}

interface Crumb {
  label: string;
  level: ViewLevel;
}

/* =====================================================================
 * SEÇÃO 2 — HELPERS DE NORMALIZAÇÃO UNIVERSAL (ZERO LISTAS MANUAIS)
 * ===================================================================== */

const NF = new Intl.NumberFormat("pt-BR");
const fmt = (n: number) => NF.format(Math.round(n || 0));

/** Remove acentos, baixa caixa, comprime espaços. */
function normalize(v: string): string {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gera variações de chave para casar mapa (OSM/GeoJSON) com banco.
 * Remove sufixos administrativos comuns globalmente — não há lista de UF/país.
 */
function regionLookupKeys(value: string): string[] {
  const base = normalize(value);
  const keys = new Set<string>();
  if (!base) return [];
  keys.add(base);

  const suffixes = [
    " region",
    " province",
    " state",
    " governorate",
    " emirate",
    " prefecture",
    " county",
    " district",
    " municipality",
    " regiao",
    " provincia",
    " estado",
    " municipio",
    " do sul",
    " do norte",
  ];
  for (const s of suffixes) {
    if (base.endsWith(s)) keys.add(base.slice(0, -s.length).trim());
  }

  // remove parênteses (ex: "Goiás (GO)")
  const noParens = base.replace(/\s*\(.*?\)\s*/g, "").trim();
  if (noParens) keys.add(noParens);

  return [...keys].filter(Boolean);
}

/* =====================================================================
 * SEÇÃO 3 — PALETA WAR ROOM (LARANJA → VERMELHO PROFUNDO)
 * ===================================================================== */

const HEAT_PALETTE = [
  "#ffd2a8",
  "#ffb36b",
  "#ff9340",
  "#ff7a1f",
  "#ff6200",
  "#d94f00",
  "#a83a00",
  "#6f2500",
];

function getColorByVotes(value: number, max: number): string {
  if (!value || !max) return "rgba(40,40,40,0.15)";
  if (max <= 1) return HEAT_PALETTE[2];
  const t = Math.min(1, Math.max(0, Math.log(value + 1) / Math.log(max + 1)));
  const idx = Math.min(HEAT_PALETTE.length - 1, Math.floor(t * HEAT_PALETTE.length));
  return HEAT_PALETTE[idx];
}

/* =====================================================================
 * SEÇÃO 4 — FONTES GEOJSON (MUNDO + BR ESTADOS) + CACHE
 * ===================================================================== */

const GEO_URLS = {
  worldGeo:
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
  brStates:
    "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson",
};

const geoCache: Record<string, any> = {};
async function fetchGeo(url: string): Promise<any | null> {
  if (geoCache[url]) return geoCache[url];
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    geoCache[url] = json;
    return json;
  } catch {
    return null;
  }
}

/* =====================================================================
 * SEÇÃO 5 — UTILITÁRIOS DE GEOMETRIA
 * ===================================================================== */

function leafletBoundsToBbox(bounds: L.LatLngBounds): GeoBbox {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return [sw.lat, ne.lat, sw.lng, ne.lng];
}

function getFeatureBounds(feature: any): GeoBbox | null {
  if (!feature?.geometry) return null;
  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;
  const visit = (coords: any) => {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    } else {
      coords.forEach(visit);
    }
  };
  visit(feature.geometry.coordinates);
  if (minLat === 90) return null;
  return [minLat, maxLat, minLng, maxLng];
}

function bboxToLeafletBounds(bbox: GeoBbox): L.LatLngBoundsExpression {
  return [
    [bbox[0], bbox[2]],
    [bbox[1], bbox[3]],
  ];
}

/* =====================================================================
 * SEÇÃO 6 — OVERPASS (OSM) — SUBDIVISÕES ADMINISTRATIVAS UNIVERSAIS
 * ===================================================================== */

function assembleRings(ways: any[]): number[][][] {
  const rings: number[][][] = [];
  const remaining = ways.map((w) => w.geometry.map((p: any) => [p.lon, p.lat]));
  while (remaining.length) {
    let ring = remaining.shift()!;
    let extended = true;
    while (extended) {
      extended = false;
      const head = ring[0];
      const tail = ring[ring.length - 1];
      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        const sH = seg[0];
        const sT = seg[seg.length - 1];
        if (tail[0] === sH[0] && tail[1] === sH[1]) {
          ring = ring.concat(seg.slice(1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (tail[0] === sT[0] && tail[1] === sT[1]) {
          ring = ring.concat(seg.slice().reverse().slice(1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (head[0] === sT[0] && head[1] === sT[1]) {
          ring = seg.concat(ring.slice(1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
        if (head[0] === sH[0] && head[1] === sH[1]) {
          ring = seg.slice().reverse().concat(ring.slice(1));
          remaining.splice(i, 1);
          extended = true;
          break;
        }
      }
    }
    if (ring.length >= 4) rings.push(ring);
  }
  return rings;
}

function relationToFeature(el: any): any | null {
  if (!el.members) return null;
  const tags = el.tags || {};
  const outers = el.members.filter((m: any) => m.role === "outer" && m.geometry);
  if (!outers.length) return null;
  const outerRings = assembleRings(
    outers.map((m: any, i: number) => ({ id: i, geometry: m.geometry }))
  );
  if (!outerRings.length) return null;

  const isoFull: string | undefined = tags["ISO3166-2"];
  const sigla =
    tags.short_name ||
    tags.ref ||
    (isoFull ? isoFull.split("-")[1] : null) ||
    null;

  return {
    type: "Feature",
    properties: {
      name:
        tags["name:pt"] ||
        tags.name ||
        tags.official_name ||
        tags["name:en"] ||
        "—",
      name_pt: tags["name:pt"] || null,
      name_en: tags["name:en"] || null,
      sigla,
      iso: isoFull || null,
      osm_id: el.id,
      admin_level: tags.admin_level,
    },
    geometry:
      outerRings.length === 1
        ? { type: "Polygon", coordinates: outerRings }
        : {
            type: "MultiPolygon",
            coordinates: outerRings.map((r) => [r]),
          },
  };
}

/**
 * Busca subdivisões administrativas via Overpass.
 * Escopos suportados (sem listas manuais):
 *   - { countryIso2: "BR" } → recortes dentro do país
 *   - { cityName: "Goiânia" } → recortes dentro de uma cidade
 *   - bbox puro → fallback genérico
 */
async function fetchAdminSubdivisions(
  bbox: GeoBbox,
  adminLevel: number,
  scope: { countryIso2?: string; cityName?: string }
): Promise<any | null> {
  const [s, n, w, e] = bbox;
  const head = `[out:json][timeout:60];`;
  let selector = "";

  if (scope?.cityName) {
    const safe = scope.cityName.replace(/"/g, '\\"');
    selector = `area["name"="${safe}"]["boundary"="administrative"]->.a;relation(area.a)["boundary"="administrative"]["admin_level"="${adminLevel}"];`;
  } else if (scope?.countryIso2) {
    selector = `area["ISO3166-1"="${scope.countryIso2}"]["boundary"="administrative"]->.a;relation(area.a)["boundary"="administrative"]["admin_level"="${adminLevel}"];`;
  } else {
    selector = `relation["boundary"="administrative"]["admin_level"="${adminLevel}"](${s},${w},${n},${e});`;
  }

  const query = `${head}(${selector});out geom;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const features = data.elements?.map(relationToFeature).filter(Boolean);
    return features?.length ? { type: "FeatureCollection", features } : null;
  } catch {
    return null;
  }
}

/* =====================================================================
 * SEÇÃO 7 — CONTROLADOR DE FLY/BOUNDS (estabilidade do MapContainer)
 * ===================================================================== */

interface FlyControllerProps {
  center: [number, number];
  zoom: number;
  bbox: GeoBbox | null;
  lockBounds: boolean;
}

const FlyController = ({ center, zoom, bbox, lockBounds }: FlyControllerProps) => {
  const map = useMap();

  useEffect(() => {
    if (bbox) {
      try {
        map.fitBounds(bboxToLeafletBounds(bbox), { padding: [20, 20], animate: true });
      } catch {
        map.setView(center, zoom);
      }
    } else {
      map.setView(center, zoom, { animate: true });
    }
    // garante que o tile renderize após o container ganhar tamanho
    setTimeout(() => map.invalidateSize(), 200);
  }, [map, center, zoom, bbox]);

  useEffect(() => {
    if (lockBounds && bbox) {
      try {
        map.setMaxBounds(bboxToLeafletBounds(bbox));
      } catch {
        /* noop */
      }
    } else {
      map.setMaxBounds(undefined as any);
    }
  }, [map, lockBounds, bbox]);

  return null;
};

/* =====================================================================
 * SEÇÃO 8 — RESOLUÇÃO ISO2 DO PAÍS (autônoma via propriedades do GeoJSON)
 * ===================================================================== */

function extractIso2FromCountryFeature(feature: any): string | null {
  if (!feature?.properties) return null;
  const p = feature.properties;
  return (
    p.ISO_A2 ||
    p.iso_a2 ||
    p["ISO3166-1-Alpha-2"] ||
    p.ISO3166_1_Alpha_2 ||
    p.iso ||
    null
  );
}

/* =====================================================================
 * SEÇÃO 9 — COMPONENTE PRINCIPAL
 * ===================================================================== */

const MapaCalor = () => {
  const navigate = useNavigate();
  const { user, signOut } = useUser();

  // Identidade
  const [heartClubName, setHeartClubName] = useState("");
  const [activeClubName, setActiveClubName] = useState("");

  // Drill-down
  const [viewMode, setViewMode] = useState<ViewLevel>("world");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeCountryIso2, setActiveCountryIso2] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([
    { label: "Mundo", level: "world" },
  ]);

  // Mapa
  const [mapCenter, setMapCenter] = useState<[number, number]>([10, 0]);
  const [mapZoom, setMapZoom] = useState<number>(2);
  const [mapBbox, setMapBbox] = useState<GeoBbox | null>(null);
  const [currentGeo, setCurrentGeo] = useState<any | null>(null);
  const [parentFeature, setParentFeature] = useState<any | null>(null);

  // Dados de votos
  const [heatData, setHeatData] = useState<HeatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);

  // Busca de clubes
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);

  // Porteiro CEP
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressReloadKey, setAddressReloadKey] = useState(0);

  /* ---------------------------------------------------------------
   * 9.1 — PORTEIRO CEP (NÃO ALTERAR)
   * --------------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: voto } = await supabase
        .from("votos")
        .select("clube_nome, cep")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      if (voto) {
        setHeartClubName(voto.clube_nome);
        setActiveClubName(voto.clube_nome);
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("cep")
        .eq("id", user.id)
        .maybeSingle();
      if (!voto?.cep && !prof?.cep) setAddressOpen(true);
    };
    load();
  }, [user, addressReloadKey]);

  /* ---------------------------------------------------------------
   * 9.2 — BUSCA DE CLUBES (lateral)
   * --------------------------------------------------------------- */
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchClubsLocal(q, 8);
        setSearchResults(r || []);
      } catch {
        setSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ---------------------------------------------------------------
   * 9.3 — BUSCA DE DADOS DE VOTOS (RPC)
   * --------------------------------------------------------------- */
  useEffect(() => {
    if (!activeClubName) return;
    const run = async () => {
      setLoading(true);
      try {
        const rpc =
          viewMode === "city" ? "get_heatmap_neighborhoods" : "get_heatmap_data";
        const params: any = { p_club_name: activeClubName };
        if (viewMode === "world") params.p_level = "country";
        else if (viewMode === "country") {
          params.p_level = "state";
          params.p_filter_value = activeCountry;
        } else if (viewMode === "state") {
          params.p_level = "city";
          params.p_filter_value = activeState;
        } else {
          params.p_city = activeCity;
        }
        const { data } = await supabase.rpc(rpc as any, params);
        const rows: HeatRow[] = (data || []).map((d: any) => ({
          region: d.region || d.bairro || d.name || "",
          votes: Number(d.votes || 0),
        }));
        setHeatData(rows);
      } catch {
        setHeatData([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [activeClubName, viewMode, activeCountry, activeState, activeCity]);

  /* ---------------------------------------------------------------
   * 9.4 — GEOGRAFIA AUTÔNOMA (sem listas manuais)
   * --------------------------------------------------------------- */
  useEffect(() => {
    const run = async () => {
      setGeoLoading(true);
      try {
        if (viewMode === "world") {
          setCurrentGeo(await fetchGeo(GEO_URLS.worldGeo));
          setParentFeature(null);
        } else if (viewMode === "country") {
          const world = await fetchGeo(GEO_URLS.worldGeo);
          const parent = world?.features?.find(
            (f: any) =>
              normalize(f.properties.name || f.properties.ADMIN || "") ===
              normalize(activeCountry || "")
          );
          setParentFeature(parent || null);
          const iso2 =
            activeCountryIso2 ||
            extractIso2FromCountryFeature(parent) ||
            null;

          // Atalho: se for Brasil, usa GeoJSON oficial dos estados (mais leve)
          if (iso2 === "BR") {
            setCurrentGeo(await fetchGeo(GEO_URLS.brStates));
          } else if (iso2 && mapBbox) {
            setCurrentGeo(
              await fetchAdminSubdivisions(mapBbox, 4, { countryIso2: iso2 })
            );
          }
        } else if (viewMode === "state" && mapBbox) {
          setCurrentGeo(
            await fetchAdminSubdivisions(mapBbox, 8, {
              countryIso2: activeCountryIso2 || undefined,
            })
          );
        } else if (viewMode === "city" && mapBbox) {
          // Override preciso (ex.: Goiânia/ArcGIS) quando disponível
          if (hasPreciseOverride(activeCity, activeState, activeCountry || "")) {
            const precise = await fetchOfficialGoianiaNeighborhoodGeoJson();
            setCurrentGeo(
              precise ||
                (await fetchAdminSubdivisions(mapBbox, 10, {
                  cityName: activeCity || undefined,
                }))
            );
          } else {
            setCurrentGeo(
              await fetchAdminSubdivisions(mapBbox, 10, {
                cityName: activeCity || undefined,
              })
            );
          }
        }
      } finally {
        setGeoLoading(false);
      }
    };
    run();
  }, [viewMode, activeCountry, activeCountryIso2, activeState, activeCity, mapBbox]);

  /* ---------------------------------------------------------------
   * 9.5 — ÍNDICE DE VOTOS POR REGIÃO (lookup orgânico)
   * --------------------------------------------------------------- */
  const votesByRegion = useMemo(() => {
    const m = new Map<string, number>();
    heatData.forEach((d) => {
      regionLookupKeys(d.region).forEach((k) => {
        // se já houver, soma (ex.: variantes do mesmo estado)
        m.set(k, (m.get(k) || 0) + d.votes);
      });
    });
    return m;
  }, [heatData]);

  const maxVotes = useMemo(
    () => Math.max(...heatData.map((d) => d.votes), 1),
    [heatData]
  );

  /**
   * O CÉREBRO: bate qualquer feature do OSM/GeoJSON contra o banco
   * usando todas as propriedades disponíveis (name, name_pt, sigla, iso…).
   */
  const lookupVotesForFeature = useCallback(
    (props: any): { name: string; votes: number } => {
      const candidates = new Set<string>();
      const displayName =
        props.name ||
        props.name_pt ||
        props.NOME ||
        props.ADMIN ||
        props.NM_BAIRRO ||
        "—";

      [
        props.name,
        props.name_pt,
        props.name_en,
        props.NOME,
        props.ADMIN,
        props.official_name,
        props.NM_BAIRRO,
        props.sigla,
        props.ref,
        props.short_name,
        props.iso,
        props.ISO_A2,
        props.iso_a2,
        props.ISO3166_2,
        props["ISO3166-2"],
      ].forEach((c) => c && candidates.add(String(c)));

      // sigla isolada (ex.: "BR-GO" → "GO")
      const isoFull = props.iso || props["ISO3166-2"];
      if (isoFull && typeof isoFull === "string" && isoFull.includes("-")) {
        candidates.add(isoFull.split("-")[1]);
      }

      for (const cand of candidates) {
        for (const key of regionLookupKeys(cand)) {
          if (votesByRegion.has(key)) {
            return { name: displayName, votes: votesByRegion.get(key) || 0 };
          }
        }
      }
      return { name: displayName, votes: 0 };
    },
    [votesByRegion]
  );

  /* ---------------------------------------------------------------
   * 9.6 — ESTILO + INTERAÇÃO DOS POLÍGONOS
   * --------------------------------------------------------------- */
  const geoStyle = useCallback(
    (f: any) => {
      const { votes } = lookupVotesForFeature(f.properties);
      return {
        fillColor: votes > 0 ? getColorByVotes(votes, maxVotes) : "#0a0a0a",
        fillOpacity: votes > 0 ? 0.85 : 0.25,
        color: votes > 0 ? "#ff6200" : "#444",
        weight: votes > 0 ? 1 : 0.4,
        opacity: 1,
      };
    },
    [lookupVotesForFeature, maxVotes]
  );

  const onEachFeature = useCallback(
    (f: any, l: any) => {
      const { name, votes } = lookupVotesForFeature(f.properties);
      l.bindTooltip(
        `<div class="war-tooltip"><b>${name}</b><br/>${fmt(votes)} VOTOS</div>`,
        { sticky: true }
      );

      l.on({
        mouseover: (e: any) => {
          e.target.setStyle({ weight: 2, color: "#fff" });
        },
        mouseout: (e: any) => {
          e.target.setStyle(geoStyle(f));
        },
        click: () => {
          const bbox = getFeatureBounds(f);
          if (viewMode === "world") {
            const iso2 = extractIso2FromCountryFeature(f);
            setViewMode("country");
            setActiveCountry(name);
            setActiveCountryIso2(iso2);
            setMapBbox(bbox);
            setBreadcrumbs((prev) => [...prev, { label: name, level: "country" }]);
          } else if (viewMode === "country") {
            setViewMode("state");
            setActiveState(name);
            setMapBbox(bbox);
            setBreadcrumbs((prev) => [...prev, { label: name, level: "state" }]);
          } else if (viewMode === "state") {
            setViewMode("city");
            setActiveCity(name);
            setMapBbox(bbox);
            setBreadcrumbs((prev) => [...prev, { label: name, level: "city" }]);
          }
        },
      });
    },
    [lookupVotesForFeature, geoStyle, viewMode]
  );

  /* ---------------------------------------------------------------
   * 9.7 — NAVEGAÇÃO BREADCRUMB
   * --------------------------------------------------------------- */
  const goToCrumb = useCallback((index: number) => {
    setBreadcrumbs((prev) => {
      const next = prev.slice(0, index + 1);
      const last = next[next.length - 1];
      if (last.level === "world") {
        setViewMode("world");
        setActiveCountry(null);
        setActiveCountryIso2(null);
        setActiveState(null);
        setActiveCity(null);
        setMapBbox(null);
        setMapCenter([10, 0]);
        setMapZoom(2);
      } else if (last.level === "country") {
        setViewMode("country");
        setActiveState(null);
        setActiveCity(null);
      } else if (last.level === "state") {
        setViewMode("state");
        setActiveCity(null);
      }
      return next;
    });
  }, []);

  /* ---------------------------------------------------------------
   * 9.8 — KEY DE RESET (estabilidade do MapContainer)
   * --------------------------------------------------------------- */
  const mapHardResetKey = useMemo(
    () => `map-${viewMode}-${activeCountry || ""}-${activeState || ""}-${activeCity || ""}`,
    [viewMode, activeCountry, activeState, activeCity]
  );

  /* ---------------------------------------------------------------
   * 9.9 — AÇÃO: Trocar clube ativo via busca
   * --------------------------------------------------------------- */
  const handleSelectClub = useCallback((c: ClubSearchResult) => {
    setActiveClubName(c.nome);
    setSearchQuery("");
    setSearchResults([]);
    // reset drill-down para mundo
    setViewMode("world");
    setActiveCountry(null);
    setActiveCountryIso2(null);
    setActiveState(null);
    setActiveCity(null);
    setMapBbox(null);
    setBreadcrumbs([{ label: "Mundo", level: "world" }]);
  }, []);

  /* =====================================================================
   * SEÇÃO 10 — RENDER
   * ===================================================================== */

  return (
    <div
      className="min-h-screen bg-black text-white"
      style={{ fontFamily: "Verdana, sans-serif" }}
    >
      {/* TOP BAR */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/80 backdrop-blur-md sticky top-0 z-[1001]">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
          <img src={logo} className="h-8" alt="Heart Club" />
          <span className="font-black italic text-sm tracking-widest">
            WAR ROOM
          </span>
        </div>

        <div className="flex items-center gap-3">
          {activeClubName && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              <ClubLogo clubName={activeClubName} size={20} />
              <span className="font-black italic uppercase">
                {activeClubName}
              </span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-[1600px] mx-auto">
        {/* BREADCRUMBS */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
          <button
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary flex items-center gap-1"
            onClick={() => goToCrumb(0)}
          >
            <Home className="w-3 h-3" />
          </button>
          {breadcrumbs.map((b, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && (
                <ChevronRight className="w-3 h-3 mx-1 text-muted-foreground" />
              )}
              <button
                className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                  i === breadcrumbs.length - 1
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
                onClick={() => goToCrumb(i)}
              >
                {b.label}
              </button>
            </div>
          ))}
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* SIDEBAR ESQUERDA */}
          <aside className="lg:col-span-2 space-y-4">
            {/* BUSCA DE CLUBE */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-md">
              <h3 className="text-[10px] font-black uppercase mb-3 text-muted-foreground flex items-center gap-2">
                <Search className="w-3 h-3" /> Trocar Clube
              </h3>
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar clube..."
                  className="bg-black/40 border-white/10 text-xs"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-black border border-white/10 rounded-xl overflow-hidden z-20">
                    {searchResults.map((c, i) => (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-xs"
                        onClick={() => handleSelectClub(c)}
                      >
                        <ClubLogo clubName={c.nome} size={18} />
                        <span className="font-bold uppercase">{c.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {heartClubName && heartClubName !== activeClubName && (
                <button
                  className="text-[10px] mt-2 text-primary font-black uppercase"
                  onClick={() => handleSelectClub({ nome: heartClubName } as any)}
                >
                  ← voltar para {heartClubName}
                </button>
              )}
            </div>

            {/* RANKING */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-md">
              <h3 className="text-[10px] font-black uppercase mb-4 text-muted-foreground flex items-center gap-2">
                <Trophy className="w-3 h-3" /> Top Regiões
                {loading && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
              </h3>
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2">
                {heatData
                  .slice()
                  .sort((a, b) => b.votes - a.votes)
                  .slice(0, 25)
                  .map((d, i) => {
                    const pct = d.votes / maxVotes;
                    return (
                      <motion.div
                        key={`${d.region}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="relative overflow-hidden rounded-lg bg-black/30 border border-white/5"
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            width: `${pct * 100}%`,
                            background: getColorByVotes(d.votes, maxVotes),
                            opacity: 0.25,
                          }}
                        />
                        <div className="relative flex justify-between items-center px-3 py-2 text-xs">
                          <span className="font-bold italic uppercase truncate">
                            {i + 1}. {d.region || "—"}
                          </span>
                          <span className="text-primary font-black ml-2">
                            {fmt(d.votes)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                {!loading && heatData.length === 0 && (
                  <div className="text-[10px] text-muted-foreground italic text-center py-6">
                    Nenhum voto neste recorte ainda.
                  </div>
                )}
              </div>
            </div>

            {/* LEGENDA */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-md">
              <h3 className="text-[10px] font-black uppercase mb-3 text-muted-foreground flex items-center gap-2">
                <Flame className="w-3 h-3" /> Densidade
              </h3>
              <div className="flex h-3 rounded-full overflow-hidden">
                {HEAT_PALETTE.map((c, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-black uppercase">
                <span>Baixa</span>
                <span>Alta</span>
              </div>
            </div>
          </aside>

          {/* MAPA */}
          <main className="lg:col-span-3">
            <div className="relative rounded-[40px] border border-white/10 overflow-hidden h-[640px] bg-black">
              {(geoLoading || loading) && (
                <div className="absolute inset-0 bg-black/60 z-[1000] flex items-center justify-center pointer-events-none">
                  <Loader2 className="animate-spin text-primary w-6 h-6" />
                </div>
              )}
              <div className="absolute top-3 left-3 z-[999] bg-black/80 border border-primary/40 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3 text-primary" />
                {viewMode === "world"
                  ? "Mundo"
                  : viewMode === "country"
                  ? activeCountry
                  : viewMode === "state"
                  ? activeState
                  : activeCity}
              </div>
              <MapContainer
                key={mapHardResetKey}
                center={mapCenter}
                zoom={mapZoom}
                style={{ width: "100%", height: "100%", background: "#000" }}
                zoomControl={false}
                worldCopyJump={false}
                preferCanvas={true}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap &copy; CARTO'
                />
                <FlyController
                  center={mapCenter}
                  zoom={mapZoom}
                  bbox={mapBbox}
                  lockBounds={viewMode !== "world"}
                />
                {currentGeo && (
                  <GeoJSON
                    key={mapHardResetKey + "-data"}
                    data={currentGeo}
                    style={geoStyle as any}
                    onEachFeature={onEachFeature}
                  />
                )}
                {parentFeature && (
                  <GeoJSON
                    key={mapHardResetKey + "-parent"}
                    data={parentFeature}
                    style={
                      {
                        fill: false,
                        color: "#fff",
                        weight: 1,
                        opacity: 0.4,
                        interactive: false,
                      } as any
                    }
                  />
                )}
              </MapContainer>
            </div>
          </main>
        </div>
      </div>

      {/* ESTILOS GLOBAIS DO TOOLTIP */}
      <style>{`
        .war-tooltip {
          background: #000 !important;
          border: 1px solid #ff6200 !important;
          color: #fff !important;
          padding: 6px 10px !important;
          border-radius: 8px;
          font-weight: bold;
          font-family: Verdana, sans-serif;
          font-size: 11px;
          line-height: 1.4;
        }
        .leaflet-tooltip { box-shadow: none !important; }
        .leaflet-tooltip-top:before,
        .leaflet-tooltip-bottom:before,
        .leaflet-tooltip-left:before,
        .leaflet-tooltip-right:before { display: none !important; }
        .leaflet-container { background: #000 !important; }
      `}</style>

      {/* PORTEIRO CEP — NÃO ALTERAR */}
      <AddressModal
        open={addressOpen}
        onOpenChange={setAddressOpen}
        clubName={heartClubName}
        onSuccess={() => setAddressReloadKey((k) => k + 1)}
      />
    </div>
  );
};

export default MapaCalor;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/pages/MapaCalor.tsx
 * VERSÃO: 6.0
 * - Autonomia total: nenhuma lista manual de UF/País/ISO.
 * - Cruzamento orgânico via OSM (name, name_pt, ISO_A2, ref, sigla).
 * - Choropleth com paleta laranja → vermelho profundo.
 * - Tooltip funcional (Nome + Votos reais).
 * - Drill-down: Mundo → País → Estado → Cidade → Bairro.
 * - FlyController estável + invalidateSize() evita mapa preto.
 * - Override preciso para Goiânia preservado.
 * - Porteiro CEP (AddressModal) intocado.
 */
