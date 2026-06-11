/**
 * [CAMINHO]: src/pages/MapaCalor.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 4.1 (FIX: TOOLTIP CROSS-CHECK NOME/SIGLA)
 * [CONTEXTO]: War Room Choropleth com polígonos reais.
 * [MÓDULOS]:
 * 1. Helpers e Normalização Geográfica.
 * 2. Geocoding e Cache (OSM/Overpass).
 * 3. Porteiro do Mapa (Trava de Integridade por CEP).
 * 4. Renderização Leaflet e GeoJSON (LOGICA DE LOOKUP CORRIGIDA).
 */

/* =====================================================================
 * MapaCalor.tsx — War Room Choropleth (Polígonos Reais)
 * Engine: react-leaflet + GeoJSON layers (sem bolinhas)
 * Tiles: CartoDB DarkMatter (preto absoluto)
 * Drill-down: Mundo (países) → Brasil (estados) → Estado (municípios) → Cidade (bairros)
 * Coloração coroplética por densidade de votos (laranja → vermelho escuro)
 * Tooltips com números completos via Intl.NumberFormat('pt-BR')
 * ===================================================================== */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, Trophy, Flame, Search, Loader2, LogOut, X, Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, GeoJSON, Tooltip as LTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import { CLUBS_DATA } from "@/clubes-data";
import { fetchOfficialGoianiaNeighborhoodGeoJson, hasPreciseOverride } from "@/lib/official-neighborhoods";
import AddressModal from "@/components/AddressModal";
import logo from "@/assets/logo.png";
import { useTranslationApp } from "@/hooks/useTranslationApp";

/* ---------- Helpers ---------- */

const NF = new Intl.NumberFormat("pt-BR");
const fmt = (n: number) => NF.format(Math.round(n));

function normalize(v: string): string {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const REGION_ALIASES: Record<string, string[]> = {
  riade: ["riyadh", "riyadh region", "riyadh province", "ar riyad", "al riyadh"],
  riyadh: ["riade", "riyadh region", "riyadh province", "ar riyad", "al riyadh"],
  "riyadh region": ["riyadh", "riade", "ar riyad"],
  "riyadh province": ["riyadh", "riade", "ar riyad"],
  "ar riyad": ["riyadh", "riade"],
  "al riyadh": ["riyadh", "riade"],
  "arabia saudita": ["saudi arabia", "kingdom of saudi arabia"],
  "saudi arabia": ["arabia saudita", "kingdom of saudi arabia"],
  brasil: ["brazil", "br"],
  brazil: ["brasil", "br"],
  "estados unidos": ["usa", "united states", "united states of america"],
  "united states of america": ["usa", "united states", "estados unidos"],
  "reino unido": ["united kingdom", "england"],
  "united kingdom": ["reino unido", "england"],
};

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  "saudi arabia": "SA",
  "arabia saudita": "SA",
  brazil: "BR",
  brasil: "BR",
  "united states of america": "US",
  "united states": "US",
  usa: "US",
  egypt: "EG",
  egito: "EG",
};

const REGION_SUFFIXES = [
  " region",
  " province",
  " state",
  " governorate",
  " emirate",
  " administrative region",
  " regiao",
  " provincia",
  " estado",
  " governadoria",
  " municipio",
  " municipality",
];

function regionLookupKeys(value: string): string[] {
  const base = normalize(value);
  const keys = new Set<string>();
  const add = (v?: string | null) => {
    const n = normalize(v || "");
    if (n) keys.add(n);
  };
  add(base);
  REGION_ALIASES[base]?.forEach(add);
  for (const suffix of REGION_SUFFIXES) {
    if (base.endsWith(suffix)) add(base.slice(0, -suffix.length));
  }
  return [...keys];
}

function countryIso2FromName(country: string): string | null {
  for (const key of regionLookupKeys(country)) {
    if (COUNTRY_NAME_TO_ISO2[key]) return COUNTRY_NAME_TO_ISO2[key];
  }
  return null;
}

/* Paleta War Room (laranja imediato → laranja profundo) */

const HEAT_PALETTE = [
  "#ffb36b", // 1 voto já aparece claramente
  "#ff9340",
  "#ff7a1f",
  "#ff6200", // marca
  "#d94f00",
  "#a83a00",
  "#6f2500", // máximo
];

// Escala invasora (Time Consultado): Lilás → Roxo
const INVADER_PALETTE = [
  "#e9c2ff",
  "#cf95ff",
  "#b066ff",
  "#9333ea",
  "#7322c2",
  "#561799",
  "#380c66",
];

function getColorByVotes(value: number, max: number, palette: string[] = HEAT_PALETTE): string {
  if (!value || !max) return "rgba(40,40,40,0.15)";
  if (value <= 1 || max <= 1) return palette[0];
  const t = Math.min(1, Math.max(0, Math.log(value) / Math.log(max)));
  const idx = Math.min(palette.length - 1, Math.floor(t * palette.length));
  return palette[idx];
}

const COUNTRY_DB_TO_GEO: Record<string, string> = {
  Brazil: "Brazil",
  USA: "United States of America",
  England: "United Kingdom",
  BR: "Brazil",
};

const COUNTRY_GEO_TO_DB: Record<string, string> = {
  Brazil: "Brazil",
  "United States of America": "USA",
  "United Kingdom": "England",
};

const UF_TO_NAME: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(UF_TO_NAME).map(([k, v]) => [normalize(v), k]),
);

/* ---------- GeoJSON sources (cached) ---------- */

const GEO_URLS = {
  worldGeo: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
  brStates: "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson",
  brMunicipios: (uf: string) =>
    `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-${ufCode(uf)}-mun.json`,
};

function ufCode(uf: string): string {
  const codes: Record<string, string> = {
    AC: "12",
    AL: "27",
    AP: "16",
    AM: "13",
    BA: "29",
    CE: "23",
    DF: "53",
    ES: "32",
    GO: "52",
    MA: "21",
    MT: "51",
    MS: "50",
    MG: "31",
    PA: "15",
    PB: "25",
    PR: "41",
    PE: "26",
    PI: "22",
    RJ: "33",
    RN: "24",
    RS: "43",
    RO: "11",
    RR: "14",
    SC: "42",
    SP: "35",
    SE: "28",
    TO: "17",
  };
  return codes[uf] || "00";
}

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

type GeoBbox = [number, number, number, number];

function bboxCenter(bbox: GeoBbox): [number, number] {
  return [(bbox[0] + bbox[1]) / 2, (bbox[2] + bbox[3]) / 2];
}

function leafletBoundsToBbox(bounds: L.LatLngBounds): GeoBbox {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return [sw.lat, ne.lat, sw.lng, ne.lng];
}

/* ---------- Geocode ---------- */

const NOMINATIM_CACHE_KEY = "mapacalor_nominatim_v2";

interface GeocodeResult {
  center: [number, number];
  bbox?: GeoBbox;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
}

const nomCache = loadNomCache();

function loadNomCache(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem("mapacalor_nominatim_v2") || "{}");
  } catch {
    return {};
  }
}

function readCachedGeocode(value: any): GeocodeResult | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [lat, lng, bbox] = value;
    return { center: [lat, lng], bbox };
  }
  return value;
}

async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const key = normalize(`place:${query}`);
  const legacyKey = normalize(query);
  const cached = readCachedGeocode(nomCache[key] || nomCache[legacyKey]);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&namedetails=1&q=${encodeURIComponent(query)}`,
      { headers: { "Accept-Language": "pt-BR,en" } },
    );
    const data = await res.json();
    if (data?.[0]) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const bb = item.boundingbox?.map(parseFloat);
      const bbox: GeoBbox | undefined = bb ? [bb[0], bb[1], bb[2], bb[3]] : undefined;
      const address = item.address || {};
      const result: GeocodeResult = {
        center: [lat, lng],
        bbox,
        country: address.country,
        countryCode: address.country_code ? String(address.country_code).toUpperCase() : undefined,
        state: address.state || address.region || address.province || address.state_district,
        city: address.city || address.town || address.village || address.municipality || address.county,
      };
      nomCache[key] = result;
      try {
        localStorage.setItem(NOMINATIM_CACHE_KEY, JSON.stringify(nomCache));
      } catch {}
      return result;
    }
  } catch {}
  return null;
}

async function geocodeBounds(query: string): Promise<{ center: [number, number]; bbox?: GeoBbox } | null> {
  const r = await geocodePlace(query);
  return r ? { center: r.center, bbox: r.bbox } : null;
}

/* ---------- Overpass (OSM) ---------- */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const ovCache = loadOvCache();

function loadOvCache(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem("mapacalor_overpass_v2") || "{}");
  } catch {
    return {};
  }
}

function saveOvCache() {
  try {
    localStorage.setItem("mapacalor_overpass_v2", JSON.stringify(ovCache));
  } catch {}
}

function assembleRings(ways: { id: number; geometry: { lat: number; lon: number }[] }[]): number[][][] {
  const rings: number[][][] = [];
  const remaining = ways.map((w) => w.geometry.map((p) => [p.lon, p.lat] as number[]));
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
  const inners = el.members.filter((m: any) => m.role === "inner" && m.geometry);
  if (!outers.length) return null;
  const outerRings = assembleRings(outers.map((m: any, i: number) => ({ id: i, geometry: m.geometry })));
  const innerRings = assembleRings(inners.map((m: any, i: number) => ({ id: i, geometry: m.geometry })));
  if (!outerRings.length) return null;
  const polygons = outerRings.map((o) => [o, ...innerRings.filter(() => false)]);
  const geometry =
    polygons.length === 1
      ? { type: "Polygon", coordinates: polygons[0] }
      : { type: "MultiPolygon", coordinates: polygons };
  return {
    type: "Feature",
    properties: {
      name: tags.name || tags["name:pt"] || tags.official_name || tags["name:en"] || "—",
      name_en: tags["name:en"],
      name_pt: tags["name:pt"],
      name_ar: tags["name:ar"],
      int_name: tags.int_name,
      admin_level: tags.admin_level,
      osm_id: el.id,
      area_id: el.id ? 3600000000 + Number(el.id) : null,
      sigla: tags.short_name || tags.ref || tags["addr:state"] || null,
    },
    geometry,
  };
}

async function overpassQuery(query: string): Promise<any | null> {
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 65_000);
      const res = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(query), signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return await res.json();
    } catch {}
  }
  return null;
}

async function fetchAdminSubdivisions(
  bbox: GeoBbox,
  adminLevel: 4 | 6 | 8 | 10,
  cacheKey: string,
  scope?: { countryIso2?: string | null; areaId?: number | null; cityName?: string | null },
): Promise<any | null> {
  if (ovCache[cacheKey]) return ovCache[cacheKey];
  const [s, n, w, e] = bbox;
  const levels: number[] =
    adminLevel === 10
      ? [10, 9, 8, 11, 7]
      : adminLevel === 4
        ? [4, 3, 5]
        : adminLevel === 8
          ? [8, 7, 9, 6]
          : [adminLevel];
  const head = `[out:json][timeout:60][maxsize:1073741824];`;
  for (const lv of levels) {
    let areaSelector = "";
    let relationSelector = "";
    if (scope?.cityName && (lv === 10 || lv === 9 || lv === 11 || lv === 8)) {
      const safeName = scope.cityName.replace(/"/g, '\\"');
      areaSelector = `(area["name"="${safeName}"]["boundary"="administrative"]["admin_level"~"^(6|7|8|9)$"];area["name:en"="${safeName}"]["boundary"="administrative"]["admin_level"~"^(6|7|8|9)$"];area["name:pt"="${safeName}"]["boundary"="administrative"]["admin_level"~"^(6|7|8|9)$"];)->.city;`;
      relationSelector = `relation(area.city)["boundary"="administrative"]["admin_level"="${lv}"];`;
    } else if (scope?.areaId) {
      areaSelector = `area(${scope.areaId})->.a;`;
      relationSelector = `relation(area.a)["boundary"="administrative"]["admin_level"="${lv}"];`;
    } else if (scope?.countryIso2) {
      areaSelector = `area["ISO3166-1"="${scope.countryIso2}"]["boundary"="administrative"]->.a;`;
      relationSelector = `relation(area.a)["boundary"="administrative"]["admin_level"="${lv}"];`;
    } else {
      relationSelector = `relation["boundary"="administrative"]["admin_level"="${lv}"](${s},${w},${n},${e});`;
    }
    const q = `${head}${areaSelector}(${relationSelector});out geom;`;
    const data = await overpassQuery(q);
    let features: any[] = [];
    if (data?.elements?.length) {
      for (const el of data.elements) {
        if (el.type === "relation") {
          const f = relationToFeature(el);
          if (f) features.push(f);
        }
      }
    }
    if (!features.length) {
      const fallbackQ = `${head}(relation["boundary"="administrative"]["admin_level"="${lv}"](${s},${w},${n},${e}););out geom;`;
      const fb = await overpassQuery(fallbackQ);
      if (fb?.elements?.length) {
        for (const el of fb.elements) {
          if (el.type === "relation") {
            const f = relationToFeature(el);
            if (f) features.push(f);
          }
        }
      }
    }
    if (features.length) {
      const fc = { type: "FeatureCollection", features };
      ovCache[cacheKey] = fc;
      saveOvCache();
      return fc;
    }
  }
  return null;
}

function getFeatureDisplayName(props: any): string {
  return (
    props?.ADMIN || props?.name || props?.nome || props?.NOME || props?.NAME || props?.NAME_LONG || props?.NM_UF || "—"
  );
}

function getNeighborhoodFeatureName(props: any): string {
  const candidates = [
    props?.name,
    props?.name_pt,
    props?.official_name,
    props?.nome,
    props?.NOME,
    props?.NM_BAIRRO,
    props?.bairro,
    props?.BAIRRO,
    props?.NAME,
    props?.name_en,
    props?.int_name,
    props?.osm_id ? `OSM-${props.osm_id}` : null,
  ];
  return String(candidates.find((v) => typeof v === "string" && v.trim().length > 0) || "—").trim();
}

function isBrazilCountry(country?: string | null): boolean {
  const n = normalize(country || "");
  return n === "brazil" || n === "brasil" || n === "br";
}

function resolveBrazilStateName(value?: string | null, props?: any): string {
  const candidates = [
    value,
    props?.name,
    props?.nome,
    props?.NOME,
    props?.NM_UF,
    props?.name_pt,
    props?.name_en,
    props?.sigla,
    props?.SIGLA,
    props?.UF,
    props?.uf,
    props?.SIGLA_UF,
    props?.ISO3166_2,
    props?.["ISO3166-2"],
    props?.id,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  for (const candidate of candidates) {
    const raw = candidate.trim();
    const uf = raw.replace(/^BR[-_\s]?/i, "").toUpperCase();
    if (UF_TO_NAME[uf]) return UF_TO_NAME[uf];
    const byName = NAME_TO_UF[normalize(raw)];
    if (byName) return UF_TO_NAME[byName];
  }
  return value || getFeatureDisplayName(props);
}

function matchesBrazilStateFeature(props: any, state: string): boolean {
  const targetName = resolveBrazilStateName(state);
  const targetUf = NAME_TO_UF[normalize(targetName)];
  const candidateName = resolveBrazilStateName(getFeatureDisplayName(props), props);
  const candidateUf = NAME_TO_UF[normalize(candidateName)];
  return normalize(candidateName) === normalize(targetName) || (!!targetUf && candidateUf === targetUf);
}

function getFeatureScope(props: any): TerritoryScope {
  return {
    countryIso2: props?.["ISO3166-1-Alpha-2"] || props?.iso_a2 || props?.ISO_A2 || null,
    areaId: props?.area_id || (props?.osm_id ? 3600000000 + Number(props.osm_id) : null),
  };
}

function getFeatureBounds(feature: any): GeoBbox | null {
  try {
    return leafletBoundsToBbox(L.geoJSON(feature).getBounds());
  } catch {
    return null;
  }
}

/* ---------- Geometry helpers ---------- */

function findCountryFeature(world: any, countryNameOrIso: string): any | null {
  if (!world?.features) return null;
  const target = normalize(countryNameOrIso);
  const targetGeo = COUNTRY_DB_TO_GEO[countryNameOrIso] ? normalize(COUNTRY_DB_TO_GEO[countryNameOrIso]) : null;
  return (
    world.features.find((f: any) => {
      const props = f.properties || {};
      const names = [props.ADMIN, props.name, props.NAME, props.NAME_LONG, props.SOVEREIGNT]
        .filter(Boolean)
        .map(normalize);
      return (targetGeo && names.includes(targetGeo)) || names.includes(target);
    }) || null
  );
}

function buildMaskFeature(territoryFeature: any): any | null {
  if (!territoryFeature?.geometry) return null;
  const geom = territoryFeature.geometry;
  const holes: number[][][] = [];
  if (geom.type === "Polygon") {
    holes.push(geom.coordinates[0]);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) holes.push(poly[0]);
  } else return null;
  const worldRing = [
    [-540, -85],
    [540, -85],
    [540, 85],
    [-540, 85],
    [-540, -85],
  ];
  return {
    type: "Feature",
    properties: { __mask: true },
    geometry: { type: "Polygon", coordinates: [worldRing, ...holes] },
  };
}

/* ---------- Types ---------- */

type ViewLevel = "world" | "country" | "state" | "city";
interface HeatEntry {
  region: string;
  votes: number;
}
interface ClubVote {
  club: string;
  votes: number;
}
interface Crumb {
  label: string;
  level: ViewLevel;
  value?: string;
}
interface CityHit {
  city: string;
  state: string;
  country?: string;
  votes: number;
}
interface TerritoryScope {
  countryIso2?: string | null;
  areaId?: number | null;
  cityName?: string | null;
}
interface ClubCompareData {
  name: string;
  info: any;
  totalVotes: number;
  topRegion: { region: string; votes: number } | null;
}

/* ---------- Map controllers ---------- */

function FlyController({
  center,
  zoom,
  bbox,
  lockBounds,
}: {
  center: [number, number];
  zoom: number;
  bbox?: GeoBbox | null;
  lockBounds?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (bbox) {
      const [s, n, w, e] = bbox;
      const fitZoom = zoom > 0 ? Math.max(2, Math.min(zoom, 13)) : 13;
      const bounds = L.latLngBounds([s, w], [n, e]);
      map.flyToBounds(bounds, { duration: 1.2, maxZoom: fitZoom });
      if (lockBounds) {
        const padded = bounds.pad(0.15);
        map.setMaxBounds(padded);
        map.options.maxBoundsViscosity = 1.0;
        const minZ = Math.max(2, map.getBoundsZoom(bounds) - 1);
        map.setMinZoom(minZ);
      } else {
        map.setMaxBounds(undefined as any);
        map.setMinZoom(2);
      }
    } else {
      map.setMaxBounds(undefined as any);
      map.setMinZoom(2);
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, bbox, lockBounds, map]);
  return null;
}

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

function FitToGeoJson({ data, deps }: { data: any | null; deps: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (!data?.features?.length) return;
    try {
      const layer = L.geoJSON(data);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14, animate: true });
      }
    } catch {}
  }, deps);
  return null;
}

/* ---------- Component principal ---------- */

const MapaCalor = () => {
  const navigate = useNavigate();
  const { t } = useTranslationApp();
  const { user, signOut } = useUser();
  const [heartClubName, setHeartClubName] = useState("");
  const [activeClubName, setActiveClubName] = useState("");
  const [activeClubInfo, setActiveClubInfo] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewLevel>("world");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [countryScope, setCountryScope] = useState<TerritoryScope>({});
  const [stateScope, setStateScope] = useState<TerritoryScope>({});
  const [cityScope, setCityScope] = useState<TerritoryScope>({});
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([{ label: "Mundo", level: "world" }]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10, 0]);
  const [mapZoom, setMapZoom] = useState<number>(2);
  const [mapBbox, setMapBbox] = useState<GeoBbox | null>(null);
  const [heatData, setHeatData] = useState<HeatEntry[]>([]);
  const [compareHeatData, setCompareHeatData] = useState<HeatEntry[]>([]);
  const [cityClubs, setCityClubs] = useState<ClubVote[]>([]);
  const [clubLogos, setClubLogos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentGeo, setCurrentGeo] = useState<any | null>(null);
  const [parentFeature, setParentFeature] = useState<any | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [citySearchResults, setCitySearchResults] = useState<CityHit[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const citySearchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const [compareClubName, setCompareClubName] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<ClubCompareData | null>(null);
  const [heartCompareData, setHeartCompareData] = useState<ClubCompareData | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressChecked, setAddressChecked] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [addressReloadKey, setAddressReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos")
        .select("clube_nome, bairro, cep, cidade, estado")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      const name = data?.clube_nome || "";
      setHeartClubName(name);
      // [VISÃO GERAL]: por padrão o mapa mostra TODOS os clubes votantes.
      // O torcedor clica no card do coração ou pesquisa um clube para filtrar.
      // setActiveClubName fica "" → RPC agrega todos os clubes.
      setActiveClubInfo(null);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("cep, cidade, estado, bairro, latitude, longitude, address_confirmed")
        .eq("id", user.id)
        .maybeSingle();
      const addressConfirmed = !!profileData?.address_confirmed;
      // [SYNC PROFILE → VOTO ORIGINAL]
      // Garantir que o voto sagrado herda os dados de território confirmados no profile.
      // Sem isso, o heatmap (que lê de votos) não pinta país/estado/cidade/bairro do torcedor.
      const updates: Record<string, any> = {};
      const isEmpty = (v: any) => !v || !String(v).trim();
      if (isEmpty(data?.cidade) && profileData?.cidade) updates.cidade = profileData.cidade;
      if (isEmpty(data?.estado) && profileData?.estado) updates.estado = profileData.estado;
      if (isEmpty(data?.bairro) && profileData?.bairro) updates.bairro = profileData.bairro;
      if (isEmpty(data?.cep) && profileData?.cep) updates.cep = profileData.cep;
      if (profileData?.latitude != null) {
        updates.latitude = profileData.latitude;
        updates.voto_lat = profileData.latitude;
      }
      if (profileData?.longitude != null) {
        updates.longitude = profileData.longitude;
        updates.voto_lng = profileData.longitude;
      }
      // Fallback CEP → bairro via ViaCEP, mantido como último recurso.
      if (isEmpty(updates.bairro) && isEmpty(data?.bairro)) {
        const cepRaw = (data?.cep || profileData?.cep || updates.cep || "").toString().replace(/\D/g, "");
        if (cepRaw.length === 8) {
          try {
            const r = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
            const j = await r.json();
            if (j?.bairro && String(j.bairro).trim()) {
              updates.bairro = String(j.bairro).trim();
              if (isEmpty(updates.cidade) && isEmpty(data?.cidade) && j.localidade) updates.cidade = j.localidade;
              if (isEmpty(updates.estado) && isEmpty(data?.estado) && j.uf) updates.estado = j.uf;
            }
          } catch (e) {}
        }
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("votos").update(updates).eq("user_id", user.id).eq("is_original_vote", true);
      }
      // [PORTARIA]: address_confirmed é a única chave de liberação do território.
      // [MASTER TEST]: ?force_onboarding=1 reabre o modal mesmo já confirmado,
      // sem alterar address_confirmed real no perfil.
      const forceOnboarding =
        new URLSearchParams(window.location.search).get("force_onboarding") === "1";
      setAddressConfirmed(addressConfirmed);
      if (!addressConfirmed || forceOnboarding) {
        setAddressOpen(true);
      }
      setAddressChecked(true);
    };
    load();
  }, [user, addressReloadKey]);

  useEffect(() => {
    // activeClubName === "" → busca TODOS os clubes (visão geral).
    const fetchOne = async (clubName: string): Promise<HeatEntry[]> => {
      if (viewMode === "city" && activeCity) {
        const { data, error } = await supabase.rpc("get_heatmap_neighborhoods", {
          p_club_name: clubName,
          p_city: activeCity,
        });
        if (error || !data) return [];
        return (data as any[]).map((r) => ({
          region: r.region ?? r.bairro ?? r.neighborhood ?? r.name ?? "—",
          votes: Number(r.votes ?? r.total ?? r.count ?? 0),
        }));
      }
      let level: string = viewMode;
      let filter: string | null = null;
      if (viewMode === "world") level = "country";
      else if (viewMode === "country") {
        level = "state";
        filter = activeCountry;
      } else if (viewMode === "state") {
        level = "city";
        filter = activeState;
      }
      const { data, error } = await supabase.rpc("get_heatmap_data", {
        p_club_name: clubName,
        p_level: level,
        p_filter_value: filter,
      });
      if (error || !data) return [];
      return data as unknown as HeatEntry[];
    };
    const fetchHeat = async () => {
      setLoading(true);
      const [primary, compare] = await Promise.all([
        fetchOne(activeClubName),
        compareClubName ? fetchOne(compareClubName) : Promise.resolve([] as HeatEntry[]),
      ]);
      setHeatData(primary);
      setCompareHeatData(compare);
      setLoading(false);
    };
    fetchHeat();
  }, [activeClubName, compareClubName, viewMode, activeCountry, activeState, activeCity]);

  const totalVotes = useMemo(() => heatData.reduce((s, e) => s + Number(e.votes), 0), [heatData]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setGeoLoading(true);
      let geo: any = null;
      let parent: any = null;
      if (viewMode === "world") {
        geo = await fetchGeo(GEO_URLS.worldGeo);
        parent = null;
      } else if (viewMode === "country" && activeCountry) {
        const world = await fetchGeo(GEO_URLS.worldGeo);
        parent = findCountryFeature(world, activeCountry);
        if (activeCountry === "Brazil" || activeCountry === "BR") {
          geo = await fetchGeo(GEO_URLS.brStates);
        } else if (mapBbox) {
          geo = await fetchAdminSubdivisions(mapBbox, 4, `states:${normalize(activeCountry)}`, countryScope);
        }
      } else if (viewMode === "state" && activeState) {
        const normalizedState = isBrazilCountry(activeCountry) ? resolveBrazilStateName(activeState) : activeState;
        const uf = NAME_TO_UF[normalize(normalizedState)];
        if (uf && isBrazilCountry(activeCountry)) {
          const brStates = await fetchGeo(GEO_URLS.brStates);
          parent =
            brStates?.features?.find((f: any) => matchesBrazilStateFeature(f.properties, normalizedState)) || null;
          geo = await fetchGeo(GEO_URLS.brMunicipios(uf));
        } else if (mapBbox) {
          const stateFc = await fetchAdminSubdivisions(
            mapBbox || [-90, 90, -180, 180],
            4,
            `state-parent:${normalize(activeCountry || "")}:${normalize(activeState)}`,
            countryScope,
          );
          parent =
            stateFc?.features?.find((f: any) => {
              const names = [f.properties?.name, f.properties?.name_en, f.properties?.name_pt]
                .filter(Boolean)
                .map(normalize);
              return names.includes(normalize(activeState));
            }) || null;
          geo = await fetchAdminSubdivisions(
            mapBbox,
            8,
            `cities:${normalize(activeCountry || "")}:${normalize(activeState)}`,
            stateScope,
          );
        }
      } else if (viewMode === "city" && mapBbox) {
        const cityFc = await fetchAdminSubdivisions(
          mapBbox,
          8,
          `city-parent:${normalize(activeCountry || "")}:${normalize(activeState || "")}:${normalize(activeCity || "")}`,
          stateScope,
        );
        parent =
          cityFc?.features?.find((f: any) => {
            const names = [f.properties?.name, f.properties?.name_en, f.properties?.name_pt]
              .filter(Boolean)
              .map(normalize);
            return names.includes(normalize(activeCity || ""));
          }) ||
          cityFc?.features?.[0] ||
          null;
        geo = hasPreciseOverride(activeCity, activeState, activeCountry)
          ? await fetchOfficialGoianiaNeighborhoodGeoJson()
          : await fetchAdminSubdivisions(
              mapBbox,
              10,
              `bairros:${normalize(`${activeCountry}:${activeState}:${activeCity}`)}`,
              { ...cityScope, cityName: activeCity || null },
            );
      }
      if (!cancelled) {
        setCurrentGeo(geo);
        setParentFeature(parent);
        setGeoLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [viewMode, activeCountry, activeState, activeCity, mapBbox, countryScope, stateScope, cityScope]);

  const isolatedGeo = useMemo(() => currentGeo, [currentGeo]);

  useEffect(() => {
    if (viewMode !== "city" || !activeCity || !isolatedGeo?.features?.length) return;
    const rows = isolatedGeo.features
      .map((feature: any) => ({
        country: activeCountry || "Brazil",
        state: activeState || null,
        city: activeCity,
        neighborhood: getNeighborhoodFeatureName(feature?.properties),
        osm_id: feature?.properties?.osm_id ? Number(feature.properties.osm_id) : null,
      }))
      .filter((row: any) => row.neighborhood && row.neighborhood !== "—");
    if (!rows.length) return;
    supabase
      .from("geo_neighborhood_cache")
      .upsert(rows, { onConflict: "country,state,city,neighborhood", ignoreDuplicates: false });
  }, [viewMode, activeCountry, activeState, activeCity, isolatedGeo]);

  const maskFeature = useMemo(
    () => (viewMode === "world" || !parentFeature ? null : buildMaskFeature(parentFeature)),
    [parentFeature, viewMode],
  );

  useEffect(() => {
    if (viewMode !== "city" || !activeCity) {
      setCityClubs([]);
      return;
    }
    const run = async () => {
      const { data } = await supabase.rpc("get_top_clubs_by_region", {
        p_level: "city",
        p_value: activeCity,
        p_limit: 10,
      });
      if (data) setCityClubs(data as unknown as ClubVote[]);
    };
    run();
  }, [viewMode, activeCity]);

  useEffect(() => {
    const names = Array.from(new Set(cityClubs.map((c) => c.club).filter(Boolean)));
    const missing = names.filter((n) => !clubLogos[n]);
    if (!missing.length) return;
    (async () => {
      const { data } = await supabase.from("clubes_cache").select("nome, escudo_url").in("nome", missing);
      if (!data?.length) return;
      setClubLogos((prev) => {
        const next = { ...prev };
        for (const row of data) {
          if (row?.nome && row?.escudo_url) next[row.nome] = row.escudo_url;
        }
        return next;
      });
    })();
  }, [cityClubs, clubLogos]);

  const combinedHeatData = useMemo(() => {
    if (!compareClubName || !compareHeatData.length) return heatData;
    const map = new Map<string, number>();
    const display = new Map<string, string>();
    for (const e of [...heatData, ...compareHeatData]) {
      const key = normalize(e.region);
      map.set(key, (map.get(key) || 0) + Number(e.votes));
      if (!display.has(key)) display.set(key, e.region);
    }
    return Array.from(map.entries()).map(([k, votes]) => ({ region: display.get(k) || k, votes }));
  }, [heatData, compareHeatData, compareClubName]);

  const votesByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of combinedHeatData) {
      for (const key of regionLookupKeys(e.region)) map.set(key, Number(e.votes));
    }
    return map;
  }, [combinedHeatData]);

  // [GUERRA DE CORES]: contadores separados Coração vs Invasor por região
  const heartVotesByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of heatData) {
      for (const key of regionLookupKeys(e.region)) map.set(key, Number(e.votes));
    }
    return map;
  }, [heatData]);

  const invaderVotesByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of compareHeatData) {
      for (const key of regionLookupKeys(e.region)) map.set(key, Number(e.votes));
    }
    return map;
  }, [compareHeatData]);

  const regionNameByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of combinedHeatData) {
      for (const key of regionLookupKeys(e.region)) map.set(key, e.region);
    }
    return map;
  }, [combinedHeatData]);

  const maxVotes = useMemo(
    () => combinedHeatData.reduce((m, e) => Math.max(m, Number(e.votes)), 0),
    [combinedHeatData],
  );

  const maxHeartVotes = useMemo(
    () => heatData.reduce((m, e) => Math.max(m, Number(e.votes)), 0),
    [heatData],
  );

  const maxInvaderVotes = useMemo(
    () => compareHeatData.reduce((m, e) => Math.max(m, Number(e.votes)), 0),
    [compareHeatData],
  );

  /** * [MODULO 4: RENDERIZAÇÃO E LOOKUP CORRIGIDO]
   * Ajustado para resolver o problema de Tooltips vazios em Estados/Cidades.
   */
  const lookupVotesForFeature = useCallback(
    (props: any): { name: string; votes: number; heartVotes: number; invaderVotes: number } => {
      const empty = { name: "—", votes: 0, heartVotes: 0, invaderVotes: 0 };
      if (!props) return empty;

      const candidates: string[] = [];
      let display = "—";

      if (viewMode === "city") {
        display = getNeighborhoodFeatureName(props);
        candidates.push(display);
      } else {
        const propNames = ["ADMIN", "name", "name_en", "name_pt", "official_name", "NAME", "NAME_LONG", "NOME", "NM_MUN", "NM_UF"];
        propNames.forEach((p) => { if (props[p]) candidates.push(props[p]); });
        const propUfs = ["sigla", "sigla_uf", "UF", "uf", "ISO_A2", "iso_a2", "ISO3166_2"];
        propUfs.forEach((p) => { if (props[p]) candidates.push(props[p]); });
        display = candidates[0] || "—";
      }

      // Procura match em qualquer chave normalizada
      for (const c of candidates) {
        const keys = regionLookupKeys(c);
        const dbName = COUNTRY_GEO_TO_DB[c];
        if (dbName) for (const k of regionLookupKeys(dbName)) keys.push(k);
        for (const key of keys) {
          if (votesByRegion.has(key) || heartVotesByRegion.has(key) || invaderVotesByRegion.has(key)) {
            const heartVotes = heartVotesByRegion.get(key) || 0;
            const invaderVotes = invaderVotesByRegion.get(key) || 0;
            const total = votesByRegion.get(key) ?? heartVotes + invaderVotes;
            return {
              name: regionNameByKey.get(key) || display,
              votes: total,
              heartVotes,
              invaderVotes,
            };
          }
        }
      }
      return { name: display, votes: 0, heartVotes: 0, invaderVotes: 0 };
    },
    [votesByRegion, heartVotesByRegion, invaderVotesByRegion, regionNameByKey, viewMode],
  );

  const ranking = useMemo(
    () => [...heatData].sort((a, b) => Number(b.votes) - Number(a.votes)).slice(0, 15),
    [heatData],
  );

  const goWorld = useCallback(() => {
    setCurrentGeo(null);
    setParentFeature(null);
    setViewMode("world");
    setActiveCountry(null);
    setActiveState(null);
    setActiveCity(null);
    setCountryScope({});
    setStateScope({});
    setCityScope({});
    setBreadcrumbs([{ label: "Mundo", level: "world" }]);
    setMapCenter([10, 0]);
    setMapZoom(2);
    setMapBbox(null);
  }, []);

  const goCountry = useCallback(
    async (country: string, bboxOverride?: GeoBbox | null, scopeOverride?: TerritoryScope) => {
      setCurrentGeo(null);
      setParentFeature(null);
      const enrichedScope = {
        ...(scopeOverride || {}),
        countryIso2: scopeOverride?.countryIso2 || countryIso2FromName(country),
      };
      const resolvedCountry = isBrazilCountry(country) ? "Brazil" : country;
      setViewMode("country");
      setActiveCountry(resolvedCountry);
      setActiveState(null);
      setActiveCity(null);
      setCountryScope(enrichedScope);
      setStateScope({});
      setCityScope({});
      setBreadcrumbs([
        { label: "Mundo", level: "world" },
        { label: resolvedCountry, level: "country", value: resolvedCountry },
      ]);
      if (bboxOverride) {
        setMapBbox(bboxOverride);
        setMapCenter(bboxCenter(bboxOverride));
        setMapZoom(5);
        return;
      }
      const q = COUNTRY_DB_TO_GEO[resolvedCountry] || resolvedCountry;
      const r = await geocodeBounds(q);
      if (r) {
        setMapCenter(r.center);
        setMapZoom(5);
        setMapBbox(r.bbox || null);
      }
    },
    [],
  );

  const goState = useCallback(
    async (state: string, bboxOverride?: GeoBbox | null, scopeOverride?: TerritoryScope) => {
      setCurrentGeo(null);
      setParentFeature(null);
      const resolvedState = isBrazilCountry(activeCountry) ? resolveBrazilStateName(state) : state;
      const uf = NAME_TO_UF[normalize(resolvedState)];
      setViewMode("state");
      setActiveState(resolvedState);
      setActiveCity(null);
      setStateScope(scopeOverride || {});
      setCityScope({});
      setBreadcrumbs((prev) => [
        ...prev.filter((b) => b.level === "world" || b.level === "country"),
        { label: resolvedState, level: "state", value: resolvedState },
      ]);
      if (uf && isBrazilCountry(activeCountry)) {
        const brStates = await fetchGeo(GEO_URLS.brStates);
        const stateFeature = brStates?.features?.find((f: any) =>
          matchesBrazilStateFeature(f.properties, resolvedState),
        );
        const stateBbox = stateFeature ? getFeatureBounds(stateFeature) : bboxOverride;
        if (stateBbox) {
          setMapBbox(stateBbox);
          setMapCenter(bboxCenter(stateBbox));
          setMapZoom(7);
          return;
        }
      }
      if (bboxOverride) {
        setMapBbox(bboxOverride);
        setMapCenter(bboxCenter(bboxOverride));
        setMapZoom(7);
        return;
      }
      const country = COUNTRY_DB_TO_GEO[activeCountry || "Brazil"] || activeCountry || "Brasil";
      const r = await geocodeBounds(`${resolvedState}, ${country}`);
      if (r) {
        setMapCenter(r.center);
        setMapZoom(7);
        setMapBbox(r.bbox || null);
      }
    },
    [activeCountry],
  );

  const goCity = useCallback(
    async (city: string, stateOverride?: string, bboxOverride?: GeoBbox | null, scopeOverride?: TerritoryScope) => {
      setCurrentGeo(null);
      setParentFeature(null);
      setViewMode("city");
      setActiveCity(city);
      setCityScope(scopeOverride || {});
      if (stateOverride) setActiveState(stateOverride);
      setBreadcrumbs((prev) => [
        ...prev.filter((b) => b.level !== "city"),
        { label: city, level: "city", value: city },
      ]);
      if (bboxOverride) {
        setMapBbox(bboxOverride);
        setMapCenter(bboxCenter(bboxOverride));
        setMapZoom(12);
        return;
      }
      const st = stateOverride || activeState || "";
      const country = COUNTRY_DB_TO_GEO[activeCountry || "Brazil"] || activeCountry || "Brasil";
      const r = await geocodeBounds(`${city}, ${st}, ${country}`);
      if (r) {
        setMapCenter(r.center);
        setMapZoom(13);
        setMapBbox(r.bbox || null);
      }
    },
    [activeCountry, activeState],
  );

  const handleCrumb = (c: Crumb) => {
    if (c.level === "world") goWorld();
    else if (c.level === "country" && c.value) goCountry(c.value);
    else if (c.level === "state" && c.value) goState(c.value);
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length > 1) setSearchResults(await searchClubsLocal(val, 6));
    else setSearchResults([]);
  };

  const selectClub = (club: ClubSearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    if (club.name === activeClubName) return;
    if (heartClubName && club.name !== heartClubName) {
      setCompareClubName(club.name);
    } else {
      setActiveClubName(club.name);
      setActiveClubInfo(CLUBS_DATA.find((c) => c.nome === club.name) || null);
      setCompareClubName(null);
      setCompareData(null);
      goWorld();
    }
  };

  const handleCitySearch = (val: string) => {
    setCitySearchQuery(val);
    if (citySearchDebounce.current) clearTimeout(citySearchDebounce.current);
    if (val.length < 2 || !activeClubName) {
      setCitySearchResults([]);
      setCitySearchLoading(false);
      return;
    }
    setCitySearchLoading(true);
    citySearchDebounce.current = setTimeout(async () => {
      const { data } = await supabase.rpc("search_club_city_votes", {
        p_club_name: activeClubName,
        p_city_query: val,
        p_limit: 15,
      });
      setCitySearchResults(data as unknown as CityHit[]);
      setCitySearchLoading(false);
    }, 300);
  };

  const openCityResultTerritory = useCallback(
    async (hit: CityHit) => {
      setCitySearchQuery("");
      setCitySearchResults([]);
      const place = await geocodePlace([hit.city, hit.state, hit.country].filter(Boolean).join(", "));
      const country = hit.country || place?.country || activeCountry;
      if (country) {
        const countryPlace = await geocodePlace(country);
        const scope = { countryIso2: place?.countryCode || countryPlace?.countryCode || countryIso2FromName(country) };
        await goCountry(country, countryPlace?.bbox || null, scope);
        return;
      }
      await goCity(hit.city, hit.state);
    },
    [activeCountry, goCountry, goCity],
  );

  useEffect(() => {
    const run = async (clubName: string, setter: (d: ClubCompareData) => void) => {
      let info = CLUBS_DATA.find((c) => c.nome === clubName) || null;
      if (!info?.logoUrl) {
        const { data: cacheRow } = await supabase
          .from("clubes_cache")
          .select("nome, nome_curto, cidade, pais, mascote, escudo_url")
          .ilike("nome", clubName)
          .maybeSingle();
        if (cacheRow) {
          info = {
            nome: cacheRow.nome,
            nome_curto: cacheRow.nome_curto || cacheRow.nome,
            serie: "",
            cidade: cacheRow.cidade || "",
            estado: "",
            pais: cacheRow.pais || "",
            mascote: cacheRow.mascote || "",
            logoUrl: cacheRow.escudo_url || "",
          };
        }
      }
      const level = viewMode === "world" ? "country" : viewMode === "country" ? "state" : "city";
      const filter =
        viewMode === "country" ? activeCountry : viewMode === "state" || viewMode === "city" ? activeState : null;
      const { data } = await supabase.rpc("get_heatmap_data", {
        p_club_name: clubName,
        p_level: level,
        p_filter_value: filter,
      });
      const arr = data as unknown as HeatEntry[];
      const total = arr.reduce((s, e) => s + Number(e.votes), 0);
      const top = arr.length ? { region: arr[0].region, votes: Number(arr[0].votes) } : null;
      setter({ name: clubName, info, totalVotes: total, topRegion: top });
    };
    if (compareClubName) run(compareClubName, setCompareData);
    else setCompareData(null);
    if (activeClubName) run(activeClubName, setHeartCompareData);
  }, [compareClubName, activeClubName, viewMode, activeCountry, activeState]);

  const geoStyle = useCallback(
    (feature: any) => {
      const { votes, heartVotes, invaderVotes } = lookupVotesForFeature(feature?.properties);
      const hasVotes = votes > 0;
      // [GUERRA DE CORES]: Invasor atropela Coração quando vence
      const invaderWins = invaderVotes > heartVotes && invaderVotes > 0;
      const fillColor = !hasVotes
        ? "#0a0a0a"
        : invaderWins
          ? getColorByVotes(invaderVotes, maxInvaderVotes || 1, INVADER_PALETTE)
          : getColorByVotes(heartVotes || votes, (maxHeartVotes || maxVotes) || 1, HEAT_PALETTE);
      return {
        fillColor,
        fillOpacity: hasVotes ? 0.82 : 0.35,
        color: "#A9A9A9",
        weight: 0.5,
        opacity: 1,
      };
    },
    [lookupVotesForFeature, maxVotes, maxHeartVotes, maxInvaderVotes],
  );

  const onEachFeature = useCallback(
    (feature: any, layer: any) => {
      const { name, votes, heartVotes, invaderVotes } = lookupVotesForFeature(feature?.properties);
      const breakdown = compareClubName
        ? `<div style="color:#ff6200;font-weight:900;font-size:10px;margin-top:2px">❤️ ${fmt(heartVotes)}</div><div style="color:#b066ff;font-weight:900;font-size:10px">⚔️ ${fmt(invaderVotes)}</div>`
        : `<div style="color:#ff6200;font-weight:900;font-size:11px;margin-top:2px">${fmt(votes)} VOTOS</div>`;
      layer.bindTooltip(
        `<div style="font-family:Verdana,sans-serif"><div style="font-weight:900;font-style:italic;text-transform:uppercase;font-size:11px;color:#fff">${name}</div>${breakdown}</div>`,
        { sticky: true, direction: "top", opacity: 0.95, className: "war-tooltip" },
      );
      layer.on({
        mouseover: (e: any) => {
          const l = e.target;
          l.setStyle({ weight: 2, color: "#ffffff", opacity: 1 });
          l.bringToFront();
        },
        mouseout: (e: any) => {
          const l = e.target;
          l.setStyle({ weight: 0.5, color: "#A9A9A9", opacity: 1 });
        },
        click: () => {
          const featureBbox = getFeatureBounds(feature);
          const featureScope = getFeatureScope(feature?.properties);
          if (viewMode === "world") {
            goCountry(COUNTRY_GEO_TO_DB[name] || name, featureBbox, featureScope);
          } else if (viewMode === "country") {
            goState(resolveBrazilStateName(name, feature?.properties), featureBbox, featureScope);
          } else if (viewMode === "state") {
            goCity(name, activeState || undefined, featureBbox, featureScope);
          }
        },
      });
    },
    [lookupVotesForFeature, viewMode, activeState, goCountry, goState, goCity, compareClubName],
  );

  const geoKey = useMemo(
    () => `${viewMode}-${activeCountry}-${activeState}-${activeCity}-${maxVotes}-${heatData.length}-${compareClubName || "solo"}-${compareHeatData.length}`,
    [viewMode, activeCountry, activeState, activeCity, maxVotes, heatData.length, compareClubName, compareHeatData.length],
  );
  const mapHardResetKey = useMemo(() => {
    const raw = `${viewMode}|${activeCountry || ""}|${activeState || ""}|${activeCity || ""}`;
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    }
    return `map-${viewMode}-${Math.abs(h).toString(36)}`;
  }, [viewMode, activeCountry, activeState, activeCity]);

  const activeClubLogo =
    (heartCompareData?.info?.logoUrl ? heartCompareData.info : activeClubInfo || heartCompareData?.info)?.logoUrl || "";

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Verdana, Geneva, sans-serif" }}>
      <header className="h-14 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            <img src={logo} alt="Heart Club" className="h-8 w-auto" />
            <span className="font-black italic text-sm tracking-tighter hidden sm:block">{t("heatmap.title")}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={goWorld}
              className="flex items-center gap-1 text-[10px] font-black italic uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              <Home className="w-3 h-3" /> {t("heatmap.world")}
            </button>
            {breadcrumbs.slice(1).map((bc, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <button
                  onClick={() => handleCrumb(bc)}
                  className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  {bc.label}
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-[10px] font-black italic uppercase tracking-widest text-primary"
          >
            <ArrowLeft className="w-3 h-3" /> {t("heatmap.back_to_dashboard")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/5 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  placeholder={t("heatmap.search_club")}
                  className="pl-10 bg-secondary/50 border-white/5"
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-card border border-white/10 rounded-xl overflow-hidden z-[1000] shadow-2xl max-h-60 overflow-y-auto">
                    {searchResults.map((club) => (
                      <button
                        key={club.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectClub(club);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary text-left"
                      >
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
              {/* [VISÃO GERAL ↔ CORAÇÃO]: alternância entre mapa de todos os clubes e mapa filtrado */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setActiveClubName("");
                    setActiveClubInfo(null);
                    setCompareClubName(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black italic uppercase tracking-widest transition-colors ${!activeClubName ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-muted-foreground hover:text-primary"}`}
                >
                  {t("heatmap.general_map")}
                </button>
                {heartClubName && (
                  <button
                    onClick={() => {
                      setActiveClubName(heartClubName);
                      setActiveClubInfo(CLUBS_DATA.find((c) => c.nome === heartClubName) || null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black italic uppercase tracking-widest transition-colors ${activeClubName === heartClubName ? "bg-primary text-primary-foreground" : "bg-white/5 border border-primary/30 text-primary hover:bg-primary/10"}`}
                  >
                    ❤️ {heartClubName}
                  </button>
                )}
              </div>
              {activeClubName && (
                <div className={`mt-3 grid gap-2 ${compareData ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="p-3 rounded-xl bg-white/5 border border-primary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-9 h-9 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
                        <ClubLogo src={activeClubLogo} alt={activeClubName} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] text-primary font-black uppercase tracking-widest">{t("heatmap.heart_label")}</p>
                        <h3 className="text-[10px] font-black italic uppercase truncate leading-tight">
                          {activeClubName}
                        </h3>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-black uppercase">{t("heatmap.total_visible")}</p>
                    <p className="text-base text-primary font-black italic">
                      {fmt(heartCompareData?.totalVotes ?? totalVotes)}
                    </p>
                    {heartCompareData?.topRegion && (
                      <p className="text-[8px] text-muted-foreground mt-1 truncate">
                        {t("heatmap.top")} <span className="font-black uppercase">{heartCompareData.topRegion.region}</span> (
                        {fmt(heartCompareData.topRegion.votes)})
                      </p>
                    )}
                  </div>
                  {compareData && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 relative">
                      <button
                        onClick={() => setCompareClubName(null)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center hover:bg-primary/30"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-9 h-9 bg-white rounded-full p-1 flex items-center justify-center shrink-0">
                          <ClubLogo src={compareData.info?.logoUrl} alt={compareData.name} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest">{t("heatmap.vs_label")}</p>
                          <h3 className="text-[10px] font-black italic uppercase truncate leading-tight">
                            {compareData.name}
                          </h3>
                        </div>
                      </div>
                      {compareData.totalVotes > 0 ? (
                        <>
                          <p className="text-[9px] text-muted-foreground font-black uppercase">{t("heatmap.total_visible")}</p>
                          <p className="text-base font-black italic" style={{ color: HEAT_PALETTE[3] }}>
                            {fmt(compareData.totalVotes)}
                          </p>
                          {compareData.topRegion && (
                            <p className="text-[8px] text-muted-foreground mt-1 truncate">
                              {t("heatmap.top")} <span className="font-black uppercase">{compareData.topRegion.region}</span> (
                              {fmt(compareData.topRegion.votes)})
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="mt-1 px-2 py-2 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-[9px] font-black italic uppercase tracking-wide text-primary leading-tight">
                            {t("heatmap.no_votes_yet")}
                          </p>
                          <p className="text-[8px] text-muted-foreground mt-0.5 leading-snug">
                            {t("heatmap.no_votes_yet_desc")}
                          </p>
                        </div>
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
                      placeholder={t("heatmap.votes_of_in_city", { club: activeClubName })}
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
                          onClick={() => openCityResultTerritory(c)}
                          className="w-full flex justify-between items-center text-[10px] p-2 rounded-lg bg-white/5 hover:bg-primary/20 transition-colors"
                        >
                          <span className="font-black italic uppercase truncate text-left">
                            {c.city} <span className="text-muted-foreground font-normal">/ {c.state}</span>
                          </span>
                          <span className="font-black text-primary shrink-0">{fmt(Number(c.votes))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/5 p-4">
              <h3 className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-3 h-3" />
                {viewMode === "world" && t("heatmap.world_countries")}
                {viewMode === "country" && t("heatmap.states_of", { name: activeCountry })}
                {viewMode === "state" && t("heatmap.cities_of", { name: activeState })}
                {viewMode === "city" && t("heatmap.neighborhoods_of", { name: activeCity })}
              </h3>
              {ranking.length === 0 ? (
                <p className="text-[11px] italic text-muted-foreground text-center py-4">
                  {t("heatmap.no_votes_registered")}
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
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0"
                              style={{ backgroundColor: i < 3 ? HEAT_PALETTE[5] : "hsl(0 0% 18%)", color: "white" }}
                            >
                              {i + 1}
                            </span>
                            <span className="truncate group-hover:text-primary transition-colors">{entry.region}</span>
                          </span>
                          <span className="font-black text-primary shrink-0">{fmt(v)}</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.04 }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${HEAT_PALETTE[3]}, ${HEAT_PALETTE[6]})` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {viewMode === "city" && activeCity && (
              <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-primary/20 p-4">
                <h3 className="text-[10px] font-black italic uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <Flame className="w-3 h-3" /> {t("heatmap.top_clubs_in", { city: activeCity })}
                </h3>
                {cityClubs.length === 0 ? (
                  <p className="text-[11px] italic text-muted-foreground text-center py-3">{t("heatmap.loading")}</p>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {cityClubs.map((c, i) => {
                      const logoSrc = clubLogos[c.club] || CLUBS_DATA.find((cd) => cd.nome === c.club)?.logoUrl || null;
                      return (
                        <div
                          key={c.club}
                          className={`flex justify-between items-center text-[10px] p-2 rounded-lg ${c.club === heartClubName ? "bg-primary/15 border border-primary/40" : c.club === compareClubName ? "bg-white/10 border border-white/20" : "bg-white/5"}`}
                        >
                          <span className="font-black italic uppercase truncate flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                            <span className="w-6 h-6 bg-white rounded-full p-0.5 flex items-center justify-center shrink-0">
                              <ClubLogo src={logoSrc} alt={c.club} size="sm" />
                            </span>
                            <span className="truncate">{c.club}</span>
                            {c.club === heartClubName && <span className="text-primary text-[8px] shrink-0">❤️</span>}
                            {c.club === compareClubName && <span className="text-[8px] shrink-0">⚔️</span>}
                          </span>
                          <span className="font-black text-primary shrink-0">{fmt(Number(c.votes))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </aside>

          <main className="lg:col-span-3">
            <div className="relative rounded-[32px] bg-black border border-white/5 overflow-hidden h-[420px] sm:h-[520px] lg:h-[660px]">
              {(loading || geoLoading) && (
                <div className="absolute top-3 right-3 z-[500] px-3 py-1.5 rounded-xl bg-black/70 border border-primary/30 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[9px] font-black italic uppercase text-primary">
                    {loading ? t("heatmap.loading_votes") : t("heatmap.loading_territory")}
                  </span>
                </div>
              )}
              {activeClubName && (
                <div className="absolute top-3 left-3 z-[500] flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-primary/40">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      <ClubLogo src={activeClubLogo || undefined} alt={activeClubName} size="sm" />
                    </div>
                    <div>
                      <p className="text-[7px] text-primary font-black uppercase tracking-widest leading-none">
                        ❤️ Coração
                      </p>
                      <p className="text-[10px] font-black italic uppercase text-white leading-tight max-w-[100px] truncate">
                        {activeClubName}
                      </p>
                    </div>
                  </div>
                  {compareData && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0">
                        <ClubLogo src={compareData.info?.logoUrl || undefined} alt={compareData.name} size="sm" />
                      </div>
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest leading-none text-white/80">
                          ⚔️ vs
                        </p>
                        <p className="text-[10px] font-black italic uppercase text-white leading-tight max-w-[100px] truncate">
                          {compareData.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <MapContainer
                key={mapHardResetKey}
                center={mapCenter}
                zoom={mapZoom}
                minZoom={2}
                maxZoom={19}
                worldCopyJump={false}
                style={{ width: "100%", height: "100%", background: "#000" }}
                scrollWheelZoom={true}
                zoomControl={false}
              >
                {viewMode === "world" && (
                  <>
                    <TileLayer
                      attribution="&copy; CARTO &copy; OSM"
                      url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                      subdomains="abcd"
                    />
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                      subdomains="abcd"
                      opacity={0.45}
                    />
                  </>
                )}
                <FlyController center={mapCenter} zoom={mapZoom} bbox={mapBbox} lockBounds={viewMode !== "world"} />
                <ResizeFix />
                {viewMode !== "world" && (
                  <FitToGeoJson
                    data={parentFeature ? { type: "FeatureCollection", features: [parentFeature] } : isolatedGeo}
                    deps={[mapHardResetKey, parentFeature, isolatedGeo]}
                  />
                )}
                {isolatedGeo && (
                  <GeoJSON key={geoKey} data={isolatedGeo} style={geoStyle as any} onEachFeature={onEachFeature} />
                )}
                {parentFeature && viewMode !== "world" && (
                  <GeoJSON
                    key={`parent-outline-${geoKey}`}
                    data={parentFeature}
                    style={{ fill: false, color: "#A9A9A9", weight: 0.5, opacity: 1, interactive: false } as any}
                  />
                )}
              </MapContainer>
              <div className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 z-[500]">
                <p className="text-[8px] font-black italic uppercase tracking-widest text-muted-foreground mb-1.5">
                  Densidade de votos
                </p>
                <div className="flex items-center gap-0.5">
                  {HEAT_PALETTE.slice(1).map((c, i) => (
                    <div key={i} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex justify-between text-[7px] text-muted-foreground mt-1">
                  <span>Baixa</span>
                  <span>Alta</span>
                </div>
              </div>
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 z-[500]">
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
      <style>{`.war-tooltip { background: rgba(0,0,0,0.92) !important; border: 1px solid rgba(255,98,0,0.5) !important; border-radius: 8px !important; padding: 6px 10px !important; color: #fff !important; box-shadow: 0 4px 20px rgba(255,98,0,0.25) !important; }.war-tooltip::before { display: none !important; }.leaflet-container { font-family: Verdana, sans-serif; z-index: 0; }.leaflet-pane, .leaflet-top, .leaflet-bottom, .leaflet-control { z-index: 1 !important; }.leaflet-tooltip { z-index: 2 !important; }`}</style>
      {addressChecked && !addressConfirmed && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center">
          <div className="text-center space-y-4 px-6">
            <MapPin className="w-12 h-12 text-[#ff6200] mx-auto" />
            <h2 className="text-xl font-black italic uppercase text-white">Confirme seu território</h2>
            <p className="text-zinc-400 text-sm italic max-w-sm mx-auto">
              O Mapa de Calor está bloqueado até você confirmar onde mora.
            </p>
            <Button
              onClick={() => setAddressOpen(true)}
              className="bg-[#ff6200] hover:bg-[#ff8230] text-white font-black italic uppercase h-12 px-6 rounded-2xl"
            >
              Abrir confirmação
            </Button>
          </div>
        </div>
      )}
      <AddressModal
        open={addressOpen}
        onOpenChange={(v: boolean) => {
          const forceOnboarding =
            new URLSearchParams(window.location.search).get("force_onboarding") === "1";
          // Em modo teste do master, permite fechar livremente o modal.
          if (!v && !addressConfirmed && !forceOnboarding) return;
          setAddressOpen(v);
        }}
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
 * VERSÃO: 4.1
 * - FIX: Lógica de lookup de votos unificada para suportar Nome e Sigla (UF) simultaneamente.
 * - Estética War Room preservada.
 */
