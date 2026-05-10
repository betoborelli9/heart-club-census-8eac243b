/**
 * [CAMINHO]: src/pages/MapaCalor.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 5.0 (AUTONOMIA GLOBAL TOTAL)
 * [CONTEXTO]: War Room Choropleth sem dependências de listas manuais.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, Trophy, Flame, Search, Loader2, LogOut, X, Home, ArrowLeft } from "lucide-react";
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
import { CLUBS_DATA } from "@/clubes-data";
import { fetchOfficialGoianiaNeighborhoodGeoJson, hasPreciseOverride } from "@/lib/official-neighborhoods";
import AddressModal from "@/components/AddressModal";
import logo from "@/assets/logo.png";

/* ---------- HELPERS DE NORMALIZAÇÃO UNIVERSAL ---------- */

const NF = new Intl.NumberFormat("pt-BR");
const fmt = (n: number) => NF.format(Math.round(n));

function normalize(v: string): string {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * [AUTONOMIA]: Gera chaves de busca baseadas no nome real. 
 * Remove sufixos administrativos globais para bater com o banco de dados.
 */
function regionLookupKeys(value: string): string[] {
  const base = normalize(value);
  const keys = new Set<string>();
  if (!base) return [];

  keys.add(base);

  const suffixes = [" region", " province", " state", " governorate", " emirate", " regiao", " provincia", " estado", " municipio"];
  for (const s of suffixes) {
    if (base.endsWith(s)) keys.add(base.slice(0, -s.length).trim());
  }
  return [...keys];
}

/* Paleta War Room */
const HEAT_PALETTE = ["#ffb36b", "#ff9340", "#ff7a1f", "#ff6200", "#d94f00", "#a83a00", "#6f2500"];

function getColorByVotes(value: number, max: number): string {
  if (!value || !max) return "rgba(40,40,40,0.15)";
  if (value <= 1 || max <= 1) return HEAT_PALETTE[0];
  const t = Math.min(1, Math.max(0, Math.log(value) / Math.log(max)));
  const idx = Math.min(HEAT_PALETTE.length - 1, Math.floor(t * HEAT_PALETTE.length));
  return HEAT_PALETTE[idx];
}

/* ---------- GEOJSON SOURCES ---------- */
const GEO_URLS = {
  worldGeo: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
  brStates: "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson",
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
  } catch { return null; }
}

type GeoBbox = [number, number, number, number];
function bboxCenter(bbox: GeoBbox): [number, number] { return [(bbox[0] + bbox[1]) / 2, (bbox[2] + bbox[3]) / 2]; }
function leafletBoundsToBbox(bounds: L.LatLngBounds): GeoBbox {
  const sw = bounds.getSouthWest(); const ne = bounds.getNorthEast();
  return [sw.lat, ne.lat, sw.lng, ne.lng];
}

/* ---------- GEOCODE & OVERPASS (OSM) ---------- */
async function geocodePlace(query: string) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": "pt-BR,en" } });
    const data = await res.json();
    if (data?.[0]) {
      const item = data[0];
      const bb = item.boundingbox?.map(parseFloat);
      return {
        center: [parseFloat(item.lat), parseFloat(item.lon)] as [number, number],
        bbox: bb ? [bb[0], bb[1], bb[2], bb[3]] as GeoBbox : undefined,
        countryCode: item.address?.country_code?.toUpperCase(),
        name: item.display_name
      };
    }
  } catch { return null; }
}

function assembleRings(ways: any[]): number[][][] {
  const rings: number[][][] = [];
  const remaining = ways.map((w) => w.geometry.map((p: any) => [p.lon, p.lat]));
  while (remaining.length) {
    let ring = remaining.shift()!;
    let extended = true;
    while (extended) {
      extended = false;
      const head = ring[0]; const tail = ring[ring.length - 1];
      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i]; const sH = seg[0]; const sT = seg[seg.length - 1];
        if (tail[0] === sH[0] && tail[1] === sH[1]) { ring = ring.concat(seg.slice(1)); remaining.splice(i, 1); extended = true; break; }
        if (tail[0] === sT[0] && tail[1] === sT[1]) { ring = ring.concat(seg.slice().reverse().slice(1)); remaining.splice(i, 1); extended = true; break; }
        if (head[0] === sT[0] && head[1] === sT[1]) { ring = seg.concat(ring.slice(1)); remaining.splice(i, 1); extended = true; break; }
        if (head[0] === sH[0] && head[1] === sH[1]) { ring = seg.slice().reverse().concat(ring.slice(1)); remaining.splice(i, 1); extended = true; break; }
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
  const outerRings = assembleRings(outers.map((m: any, i: number) => ({ id: i, geometry: m.geometry })));
  if (!outerRings.length) return null;
  return {
    type: "Feature",
    properties: {
      name: tags.name || tags["name:pt"] || tags.official_name || tags["name:en"] || "—",
      sigla: tags.short_name || tags.ref || tags["ISO3166-2"]?.split("-")[1] || null,
      osm_id: el.id,
      admin_level: tags.admin_level
    },
    geometry: outerRings.length === 1 ? { type: "Polygon", coordinates: outerRings } : { type: "MultiPolygon", coordinates: outerRings.map(r => [r]) },
  };
}

async function fetchAdminSubdivisions(bbox: GeoBbox, adminLevel: number, scope: any): Promise<any | null> {
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
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(query) });
    const data = await res.json();
    const features = data.elements?.map(relationToFeature).filter(Boolean);
    return features?.length ? { type: "FeatureCollection", features } : null;
  } catch { return null; }
}

function getNeighborhoodFeatureName(props: any): string {
  return (props?.name || props?.name_pt || props?.official_name || props?.nome || props?.NM_BAIRRO || "—").trim();
}

function buildMaskFeature(territoryFeature: any): any | null {
  if (!territoryFeature?.geometry) return null;
  const geom = territoryFeature.geometry;
  const holes: number[][][] = [];
  if (geom.type === "Polygon") holes.push(geom.coordinates[0]);
  else if (geom.type === "MultiPolygon") for (const poly of geom.coordinates) holes.push(poly[0]);
  const worldRing = [[-540, -85], [540, -85], [540, 85], [-540, 85], [-540, -85]];
  return { type: "Feature", properties: { __mask: true }, geometry: { type: "Polygon", coordinates: [worldRing, ...holes] } };
}

/* ---------- COMPONENTE MAPA ---------- */

const MapaCalor = () => {
  const navigate = useNavigate();
  const { user, signOut, refreshProfile } = useUser();
  const [heartClubName, setHeartClubName] = useState("");
  const [activeClubName, setActiveClubName] = useState("");
  const [viewMode, setViewMode] = useState<ViewLevel>("world");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([{ label: "Mundo", level: "world" }]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10, 0]);
  const [mapZoom, setMapZoom] = useState<number>(2);
  const [mapBbox, setMapBbox] = useState<GeoBbox | null>(null);
  const [heatData, setHeatData] = useState<any[]>([]);
  const [compareHeatData, setCompareHeatData] = useState<any[]>([]);
  const [currentGeo, setCurrentGeo] = useState<any | null>(null);
  const [parentFeature, setParentFeature] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressReloadKey, setAddressReloadKey] = useState(0);

  // Carregamento Inicial
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: voto } = await supabase.from("votos").select("clube_nome, cep").eq("user_id", user.id).eq("is_original_vote", true).maybeSingle();
      if (voto) { setHeartClubName(voto.clube_nome); setActiveClubName(voto.clube_nome); }
      const { data: prof } = await supabase.from("profiles").select("cep").eq("id", user.id).maybeSingle();
      if (!voto?.cep && !prof?.cep) setAddressOpen(true);
    };
    load();
  }, [user, addressReloadKey]);

  // Busca de Dados de Votos
  useEffect(() => {
    if (!activeClubName) return;
    const fetchData = async (club: string) => {
      let rpc = viewMode === "city" ? "get_heatmap_neighborhoods" : "get_heatmap_data";
      let params: any = { p_club_name: club };
      if (viewMode === "world") params.p_level = "country";
      else if (viewMode === "country") { params.p_level = "state"; params.p_filter_value = activeCountry; }
      else if (viewMode === "state") { params.p_level = "city"; params.p_filter_value = activeState; }
      else { params.p_city = activeCity; }

      const { data } = await supabase.rpc(rpc, params);
      return (data || []).map((d: any) => ({ region: d.region || d.bairro || d.name, votes: Number(d.votes || 0) }));
    };
    const run = async () => {
      setLoading(true);
      const [p, c] = await Promise.all([fetchData(activeClubName), Promise.resolve([])]);
      setHeatData(p); setLoading(false);
    };
    run();
  }, [activeClubName, viewMode, activeCountry, activeState, activeCity]);

  // Lógica de Geografia Autônoma
  useEffect(() => {
    const run = async () => {
      setGeoLoading(true);
      if (viewMode === "world") {
        setCurrentGeo(await fetchGeo(GEO_URLS.worldGeo));
        setParentFeature(null);
      } else if (viewMode === "country") {
        const world = await fetchGeo(GEO_URLS.worldGeo);
        const parent = world?.features?.find((f: any) => normalize(f.properties.name) === normalize(activeCountry || ""));
        setParentFeature(parent);
        if (activeCountry === "Brazil") setCurrentGeo(await fetchGeo(GEO_URLS.brStates));
        else if (mapBbox) setCurrentGeo(await fetchAdminSubdivisions(mapBbox, 4, {}));
      } else if (viewMode === "state" && mapBbox) {
        setCurrentGeo(await fetchAdminSubdivisions(mapBbox, 8, {}));
      } else if (viewMode === "city" && mapBbox) {
        setCurrentGeo(await fetchAdminSubdivisions(mapBbox, 10, { cityName: activeCity }));
      }
      setGeoLoading(false);
    };
    run();
  }, [viewMode, activeCountry, activeState, activeCity, mapBbox]);

  const votesByRegion = useMemo(() => {
    const m = new Map<string, number>();
    heatData.forEach(d => regionLookupKeys(d.region).forEach(k => m.set(k, d.votes)));
    return m;
  }, [heatData]);

  /** * [O CÉREBRO DO SISTEMA]: Lookup de votos sem listas manuais.
   * Ele pega todas as propriedades do OSM e tenta bater com o banco.
   */
  const lookupVotesForFeature = useCallback((props: any) => {
    const candidates = new Set<string>();
    const name = props.name || props.name_pt || props.NOME || props.ADMIN;
    if (name) candidates.add(name);
    if (props.sigla || props.ref || props.ISO3166_2) candidates.add(props.sigla || props.ref || props.ISO3166_2);

    for (const cand of Array.from(candidates)) {
      for (const key of regionLookupKeys(cand)) {
        if (votesByRegion.has(key)) return { name: cand, votes: votesByRegion.get(key) || 0 };
      }
    }
    return { name: name || "—", votes: 0 };
  }, [votesByRegion]);

  const geoStyle = useCallback((f: any) => {
    const { votes } = lookupVotesForFeature(f.properties);
    const max = Math.max(...heatData.map(d => d.votes), 1);
    return { fillColor: votes > 0 ? getColorByVotes(votes, max) : "#0a0a0a", fillOpacity: votes > 0 ? 0.8 : 0.3, color: "#444", weight: 0.5, opacity: 1 };
  }, [lookupVotesForFeature, heatData]);

  const onEachFeature = (f: any, l: any) => {
    const { name, votes } = lookupVotesForFeature(f.properties);
    l.bindTooltip(`<div class="war-tooltip"><b>${name}</b><br/>${fmt(votes)} VOTOS</div>`, { sticky: true });
    l.on({
      click: async () => {
        const bbox = getFeatureBounds(f);
        if (viewMode === "world") { setViewMode("country"); setActiveCountry(name); setMapBbox(bbox); setBreadcrumbs(prev => [...prev, {label: name, level: "country"}]); }
        else if (viewMode === "country") { setViewMode("state"); setActiveState(name); setMapBbox(bbox); setBreadcrumbs(prev => [...prev, {label: name, level: "state"}]); }
        else if (viewMode === "state") { setViewMode("city"); setActiveCity(name); setMapBbox(bbox); setBreadcrumbs(prev => [...prev, {label: name, level: "city"}]); }
      }
    });
  };

  const mapHardResetKey = useMemo(() => `map-${viewMode}-${activeCountry}-${activeState}-${activeCity}`, [viewMode, activeCountry, activeState, activeCity]);

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "Verdana, sans-serif" }}>
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/80 backdrop-blur-md sticky top-0 z-[1001]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> <img src={logo} className="h-8" /> <span className="font-black italic text-sm">WAR ROOM</span>
        </div>
        <Button variant="ghost" onClick={() => signOut()}><LogOut className="w-4 h-4" /></Button>
      </header>

      <div className="p-4 max-w-[1600px] mx-auto">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {breadcrumbs.map((b, i) => (
            <button key={i} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary whitespace-nowrap" onClick={() => {
              if (b.level === "world") { setViewMode("world"); setBreadcrumbs([{label: "Mundo", level: "world"}]); }
            }}>
              {i > 0 && <span className="mx-2">/</span>}{b.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <aside className="lg:col-span-2 space-y-4">
             {/* Ranking Lateral Autônomo */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
              <h3 className="text-[10px] font-black uppercase mb-4 text-muted-foreground flex items-center gap-2"><Trophy className="w-3 h-3"/> Top Regiões</h3>
              <div className="space-y-3">
                {heatData.sort((a,b) => b.votes - a.votes).slice(0, 10).map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="font-bold italic uppercase">{i+1}. {d.region}</span>
                    <span className="text-primary font-black">{fmt(d.votes)}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3">
            <div className="relative rounded-[40px] border border-white/10 overflow-hidden h-[600px] bg-black">
              {geoLoading && <div className="absolute inset-0 bg-black/60 z-[1000] flex items-center justify-center"><Loader2 className="animate-spin text-primary"/></div>}
              <MapContainer key={mapHardResetKey} center={mapCenter} zoom={mapZoom} style={{ width: "100%", height: "100%", background: "#000" }} zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
                <FlyController center={mapCenter} zoom={mapZoom} bbox={mapBbox} lockBounds={viewMode !== "world"} />
                {currentGeo && <GeoJSON data={currentGeo} style={geoStyle} onEachFeature={onEachFeature} />}
                {parentFeature && <GeoJSON data={parentFeature} style={{ fill: false, color: "#fff", weight: 1, opacity: 0.5, interactive: false } as any} />}
              </MapContainer>
            </div>
          </main>
        </div>
      </div>
      <style>{`.war-tooltip { background: #000 !important; border: 1px solid #ff6200 !important; color: #fff !important; padding: 5px 10px !important; border-radius: 8px; font-weight: bold; font-family: Verdana; }`}</style>
      <AddressModal open={addressOpen} onOpenChange={setAddressOpen} clubName={heartClubName} onSuccess={() => setAddressReloadKey(k => k + 1)} />
    </div>
  );
};

export default MapaCalor;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/pages/MapaCalor.tsx
 * VERSÃO: 5.0
 * - Autonomia total: Removidas listas manuais de UF e Países.
 * - Cruzamento via Normalização Geográfica OSM.
 */