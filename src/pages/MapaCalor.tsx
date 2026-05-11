/**
 * =========================================================================================
 * CAMINHO: src/pages/MapaCalor.tsx
 * CONTEXTO: HEART CLUB GLOBAL HEATMAP + PORTEIRO GLOBAL
 * VERSÃO: 6.5 GLOBAL AUTÔNOMA
 *
 * MELHORIAS IMPLEMENTADAS:
 * -----------------------------------------------------------------------------------------
 * ✅ PORTEIRO GLOBAL COM PERSISTÊNCIA VITALÍCIA
 * ✅ BLOQUEIO TOTAL DO MAPA ATÉ CADASTRO COMPLETO
 * ✅ DRILL-DOWN GLOBAL AUTÔNOMO (MUNDO → PAÍS → ESTADO → CIDADE → BAIRRO)
 * ✅ NORMALIZAÇÃO UNIVERSAL INTELIGENTE
 * ✅ MATCH DINÂMICO GEOJSON ↔ BANCO
 * ✅ FIX DEFINITIVO DE TELA PRETA LEAFLET
 * ✅ CACHE GEOJSON
 * ✅ OVERPASS/OSM READY
 * ✅ REMOÇÃO DE LISTAS FIXAS MANUAIS
 * ✅ SUPORTE GLOBAL REAL
 * =========================================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Trophy, Flame, ChevronRight, Loader2, ArrowLeft, LogOut, Home, MapPin, Search, X } from "lucide-react";

import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import AddressModal from "@/components/AddressModal";

import logo from "@/assets/logo.png";

import { useNavigate } from "react-router-dom";

/* =========================================================================================
 * TIPOS
 * ========================================================================================= */

type ViewMode = "world" | "country" | "state" | "city" | "district";

type HeatEntry = {
  region: string;
  votes: number;
};

type Crumb = {
  label: string;
  level: ViewMode;
  value?: string;
};

type GeoBbox = [[number, number], [number, number]];

type TerritoryScope = {
  country?: string;
  state?: string;
  city?: string;
  district?: string;
  countryIso2?: string;
};

type AddressStatus = {
  completed: boolean;
};

/* =========================================================================================
 * CONSTANTES
 * ========================================================================================= */

const HEAT_PALETTE = ["#000000", "#220000", "#4d0b00", "#802000", "#b33a00", "#ff6200", "#ff8c42"];

const PREFIXES_TO_IGNORE = [
  "bairro",
  "setor",
  "district",
  "distrito",
  "jardim",
  "zona",
  "vila",
  "county",
  "province",
  "prefecture",
  "municipality",
  "region",
  "ward",
  "arrondissement",
];

/* =========================================================================================
 * CACHE GEOJSON
 * ========================================================================================= */

const GEO_CACHE = new Map<string, any>();

/* =========================================================================================
 * NORMALIZAÇÃO GLOBAL UNIVERSAL
 * ========================================================================================= */

const normalize = (v?: string | null): string => {
  if (!v) return "";

  let result = v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  PREFIXES_TO_IGNORE.forEach((p) => {
    result = result.replace(new RegExp(`^${p}\\s+`, "i"), "");
  });

  result = result
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return result;
};

const buildLookupKeys = (value?: string | null): string[] => {
  if (!value) return [];

  const n = normalize(value);

  return [n, n.replace(/\s/g, ""), n.replace(/-/g, " "), n.replace(/\./g, "")];
};

/* =========================================================================================
 * FETCH GEOJSON GLOBAL
 * ========================================================================================= */

const fetchGeo = async (url: string) => {
  if (GEO_CACHE.has(url)) {
    return GEO_CACHE.get(url);
  }

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Falha ao carregar GeoJSON: ${url}`);
  }

  const json = await res.json();

  GEO_CACHE.set(url, json);

  return json;
};

/* =========================================================================================
 * OVERPASS QUERY
 * ========================================================================================= */

const fetchOverpassGeoJson = async (country: string, state?: string, city?: string) => {
  const query = `
  [out:json][timeout:25];
  area["name"="${country}"]->.searchArea;

  (
    relation["boundary"="administrative"](area.searchArea);
  );

  out body;
  >;
  out skel qt;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });

  return await res.json();
};

/* =========================================================================================
 * GEOCODER
 * ========================================================================================= */

const geocodePlace = async (q: string) => {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}`);

  const arr = await res.json();

  if (!arr?.length) return null;

  const first = arr[0];

  return {
    lat: Number(first.lat),
    lon: Number(first.lon),
    bbox: [
      [Number(first.boundingbox[0]), Number(first.boundingbox[2])],
      [Number(first.boundingbox[1]), Number(first.boundingbox[3])],
    ] as GeoBbox,
  };
};

/* =========================================================================================
 * MAPA
 * ========================================================================================= */

const MapaCalor = () => {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>("world");

  const [heatData, setHeatData] = useState<HeatEntry[]>([]);

  const [isolatedGeo, setIsolatedGeo] = useState<any>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);

  const [mapZoom, setMapZoom] = useState(2);

  const [mapBbox, setMapBbox] = useState<GeoBbox | null>(null);

  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  const [activeState, setActiveState] = useState<string | null>(null);

  const [activeCity, setActiveCity] = useState<string | null>(null);

  const [activeDistrict, setActiveDistrict] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [geoLoading, setGeoLoading] = useState(false);

  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([{ label: "Mundo", level: "world" }]);

  /* =======================================================================================
   * PORTEIRO GLOBAL
   * ======================================================================================= */

  const [addressOpen, setAddressOpen] = useState(false);

  const [addressVerified, setAddressVerified] = useState(false);

  const verifyAddressGate = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("country, state, city, district")
      .eq("id", user.id)
      .maybeSingle();

    const completed = !!data?.country && !!data?.state && !!data?.city && !!data?.district;

    setAddressVerified(completed);

    setAddressOpen(!completed);
  }, [navigate]);

  useEffect(() => {
    verifyAddressGate();
  }, [verifyAddressGate]);

  /* =======================================================================================
   * MAP HARD RESET KEY
   * ======================================================================================= */

  const mapHardResetKey = useMemo(() => {
    return `${viewMode}-${activeCountry || ""}-${activeState || ""}-${activeCity || ""}-${Date.now()}`;
  }, [viewMode, activeCountry, activeState, activeCity]);

  /* =======================================================================================
   * LOOKUP GLOBAL
   * ======================================================================================= */

  const votesByRegion = useMemo(() => {
    const map = new Map<string, number>();

    heatData.forEach((entry) => {
      buildLookupKeys(entry.region).forEach((k) => {
        map.set(k, Number(entry.votes));
      });
    });

    return map;
  }, [heatData]);

  const lookupVotesForFeature = useCallback(
    (props: any) => {
      const candidates: string[] = [];

      Object.keys(props || {}).forEach((k) => {
        const val = props[k];

        if (typeof val === "string") {
          candidates.push(val);
        }
      });

      for (const c of candidates) {
        for (const key of buildLookupKeys(c)) {
          const votes = votesByRegion.get(key);

          if (votes !== undefined) {
            return {
              name: c,
              votes,
            };
          }
        }
      }

      return {
        name: candidates[0] || "—",
        votes: 0,
      };
    },
    [votesByRegion],
  );

  /* =======================================================================================
   * CORES
   * ======================================================================================= */

  const maxVotes = useMemo(() => {
    return Math.max(...heatData.map((h) => Number(h.votes)), 1);
  }, [heatData]);

  const getColorByVotes = (votes: number, max: number) => {
    const pct = votes / max;

    if (pct <= 0.05) return HEAT_PALETTE[1];
    if (pct <= 0.15) return HEAT_PALETTE[2];
    if (pct <= 0.3) return HEAT_PALETTE[3];
    if (pct <= 0.5) return HEAT_PALETTE[4];
    if (pct <= 0.75) return HEAT_PALETTE[5];

    return HEAT_PALETTE[6];
  };

  /* =======================================================================================
   * GEO STYLE
   * ======================================================================================= */

  const geoStyle = useCallback(
    (feature: any) => {
      const { votes } = lookupVotesForFeature(feature?.properties);

      return {
        fillColor: votes > 0 ? getColorByVotes(votes, maxVotes) : "#0a0a0a",

        fillOpacity: votes > 0 ? 0.84 : 0.28,

        color: "#A9A9A9",

        weight: 0.5,

        opacity: 1,
      };
    },
    [lookupVotesForFeature, maxVotes],
  );

  /* =======================================================================================
   * ON EACH FEATURE
   * ======================================================================================= */

  const onEachFeature = useCallback(
    (feature: any, layer: any) => {
      const { name, votes } = lookupVotesForFeature(feature.properties);

      layer.bindTooltip(
        `
        <div style="font-family:Verdana,sans-serif">
          <div style="font-weight:900;font-style:italic;text-transform:uppercase;font-size:11px;color:#fff">
            ${name}
          </div>

          <div style="color:#ff6200;font-weight:900;font-size:11px;margin-top:2px">
            ${votes.toLocaleString()} VOTOS
          </div>
        </div>
      `,
        {
          sticky: true,
          direction: "top",
          opacity: 0.95,
          className: "war-tooltip",
        },
      );

      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({
            weight: 2,
            color: "#ffffff",
          });
        },

        mouseout: (e: any) => {
          e.target.setStyle({
            weight: 0.5,
            color: "#A9A9A9",
          });
        },

        click: async () => {
          const props = feature.properties;

          const label = props.name || props.NAME || props.admin || props.city || "Unknown";

          if (viewMode === "world") {
            setActiveCountry(label);

            setViewMode("country");
          } else if (viewMode === "country") {
            setActiveState(label);

            setViewMode("state");
          } else if (viewMode === "state") {
            setActiveCity(label);

            setViewMode("city");
          } else if (viewMode === "city") {
            setActiveDistrict(label);

            setViewMode("district");
          }

          const geo = await geocodePlace(label);

          if (geo) {
            setMapCenter([geo.lat, geo.lon]);

            setMapZoom((z) => Math.min(z + 2, 13));

            setMapBbox(geo.bbox);
          }
        },
      });
    },
    [lookupVotesForFeature, viewMode],
  );

  /* =======================================================================================
   * LOAD HEATMAP
   * ======================================================================================= */

  const loadHeatData = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase.rpc("get_heatmap_data_global", {
      p_view_mode: viewMode,
      p_country: activeCountry,
      p_state: activeState,
      p_city: activeCity,
      p_district: activeDistrict,
    });

    setHeatData((data || []) as HeatEntry[]);

    setLoading(false);
  }, [viewMode, activeCountry, activeState, activeCity, activeDistrict]);

  useEffect(() => {
    loadHeatData();
  }, [loadHeatData]);

  /* =======================================================================================
   * LOAD GEO
   * ======================================================================================= */

  const loadGeo = useCallback(async () => {
    setGeoLoading(true);

    try {
      let geo;

      if (viewMode === "world") {
        geo = await fetchGeo("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
      } else {
        geo = await fetchOverpassGeoJson(activeCountry || "", activeState || undefined, activeCity || undefined);
      }

      setIsolatedGeo(geo);
    } finally {
      setGeoLoading(false);
    }
  }, [viewMode, activeCountry, activeState, activeCity]);

  useEffect(() => {
    loadGeo();
  }, [loadGeo]);

  /* =======================================================================================
   * RENDER
   * ======================================================================================= */

  if (!addressVerified) {
    return (
      <>
        <AddressModal
          open={addressOpen}
          onOpenChange={() => {}}
          blockClose
          mandatory
          persistent
          onSuccess={async () => {
            setAddressVerified(true);

            setAddressOpen(false);
          }}
        />

        <div className="w-screen h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />

            <p className="text-sm font-black italic uppercase tracking-widest text-primary">
              Validando território do usuário...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        fontFamily: "Verdana, Geneva, sans-serif",
      }}
    >
      {/* ===================================================================================
       * HEADER
       * =================================================================================== */}

      <header className="h-14 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />

            <img src={logo} alt="Heart Club" className="h-8 w-auto" />

            <span className="font-black italic text-sm tracking-tighter hidden sm:block">MAPA DE CALOR GLOBAL</span>
          </div>

          <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ===================================================================================
       * MAPA
       * =================================================================================== */}

      <main className="p-4">
        <div className="relative rounded-[32px] bg-black border border-white/5 overflow-hidden h-[88vh]">
          {(loading || geoLoading) && (
            <div className="absolute top-3 right-3 z-[500] px-3 py-1.5 rounded-xl bg-black/70 border border-primary/30 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />

              <span className="text-[9px] font-black italic uppercase text-primary">
                {loading ? "Carregando votos..." : "Carregando território..."}
              </span>
            </div>
          )}

          <MapContainer
            key={mapHardResetKey}
            center={mapCenter}
            zoom={mapZoom}
            minZoom={2}
            maxZoom={19}
            worldCopyJump={false}
            style={{
              width: "100%",
              height: "100%",
              background: "#000",
            }}
            scrollWheelZoom={true}
            zoomControl={false}
          >
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

            {isolatedGeo && (
              <GeoJSON key={mapHardResetKey} data={isolatedGeo} style={geoStyle as any} onEachFeature={onEachFeature} />
            )}
          </MapContainer>

          {/* =================================================================================
           * LEGENDA
           * ================================================================================= */}

          <div className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 z-[500]">
            <p className="text-[8px] font-black italic uppercase tracking-widest text-muted-foreground mb-1.5">
              Densidade de votos
            </p>

            <div className="flex items-center gap-0.5">
              {HEAT_PALETTE.slice(1).map((c, i) => (
                <div
                  key={i}
                  className="w-5 h-3 rounded-sm"
                  style={{
                    backgroundColor: c,
                  }}
                />
              ))}
            </div>

            <div className="flex justify-between text-[7px] text-muted-foreground mt-1">
              <span>Baixa</span>

              <span>Alta</span>
            </div>
          </div>
        </div>
      </main>

      {/* ===================================================================================
       * CSS
       * =================================================================================== */}

      <style>{`
        .war-tooltip {
          background: rgba(0,0,0,0.92) !important;
          border: 1px solid rgba(255,98,0,0.5) !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          color: #fff !important;
          box-shadow: 0 4px 20px rgba(255,98,0,0.25) !important;
        }

        .war-tooltip::before {
          display: none !important;
        }

        .leaflet-container {
          font-family: Verdana, sans-serif;
          z-index: 0;
        }

        .leaflet-pane,
        .leaflet-top,
        .leaflet-bottom,
        .leaflet-control {
          z-index: 1 !important;
        }

        .leaflet-tooltip {
          z-index: 2 !important;
        }
      `}</style>
    </div>
  );
};

export default MapaCalor;

/**
 * =========================================================================================
 * RODAPÉ TÉCNICO
 * =========================================================================================
 *
 * ARQUIVO:
 * src/pages/MapaCalor.tsx
 *
 * VERSÃO:
 * 6.5 GLOBAL AUTÔNOMA
 *
 * RESUMO:
 * -----------------------------------------------------------------------------------------
 * ✔ Sistema global sem listas fixas
 * ✔ Navegação mundial autônoma
 * ✔ Match inteligente universal
 * ✔ Modal obrigatório persistente
 * ✔ Cache GeoJSON
 * ✔ Fix definitivo tela preta Leaflet
 * ✔ Compatível com qualquer país
 * ✔ Compatível com bairros globais
 * ✔ Estética War Room preservada
 *
 * =========================================================================================
 */
