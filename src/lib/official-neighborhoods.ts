/**
 * Universal neighborhood sync (frontend wrapper).
 * No more Goiânia-specific gates. Works for any {city, state, country}.
 *
 * Backwards compatibility:
 * - syncOfficialGoianiaNeighborhoods() → syncs Goiânia (kept so old callers keep working)
 * - fetchOfficialGoianiaNeighborhoodGeoJson() → ArcGIS Goiânia GeoJSON for the map overlay
 * - isOfficialGoianiaCity() → still exported but ALWAYS returns false (no gating; registry decides)
 */
import { supabase } from "@/integrations/supabase/client";

const GOIANIA_ARCGIS_QUERY_URL =
  "https://services7.arcgis.com/iEMmryaM5E3wkdnU/arcgis/rest/services/Bairros_de_Goi%C3%A2nia/FeatureServer/0/query";

const norm = (v?: string | null) =>
  (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export type SyncParams = { city: string; state?: string | null; country?: string | null };

/**
 * Universal sync. Calls the edge function which picks the best provider
 * (city-specific override or OSM Overpass as universal default).
 */
export async function syncNeighborhoods({ city, state, country }: SyncParams) {
  if (!city || !city.trim()) {
    return { count: 0, source: null as string | null, error: new Error("city é obrigatório") };
  }
  const { data, error } = await supabase.functions.invoke("sync-official-neighborhoods", {
    body: { city: city.trim(), state: (state || "").trim(), country: (country || "").trim() },
  });
  if (error) return { count: 0, source: null, error };
  return {
    count: typeof data?.count === "number" ? data.count : 0,
    source: (data?.source as string | null) || null,
    error: null as Error | null,
  };
}

/* ---------------- BACKWARDS-COMPAT EXPORTS ---------------- */

/** Always false. Kept only so old imports don't break — registry decides the source now. */
export function isOfficialGoianiaCity(_city?: string | null, _state?: string | null, _country?: string | null) {
  return false;
}

/** ArcGIS Goiânia GeoJSON (still used as a precise overlay when the user navigates Goiânia). */
export async function fetchOfficialGoianiaNeighborhoodGeoJson(): Promise<any | null> {
  const params = new URLSearchParams({
    f: "geojson", where: "1=1", outFields: "*", returnGeometry: "true", outSR: "4326",
  });
  const response = await fetch(`${GOIANIA_ARCGIS_QUERY_URL}?${params}`);
  if (!response.ok) return null;
  const geojson = await response.json();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  if (!features.length) return null;
  return {
    ...geojson,
    features: features
      .map((feature: any) => {
        const p = feature?.properties || {};
        const name = String(p.QL_BAI || p.NM_BAI || p.NM || p.name || "").trim();
        if (!name) return null;
        return {
          ...feature,
          properties: {
            ...p, name, official_name: name, source: "prefeitura_goiania_arcgis",
            osm_id: p?.ObjectId ?? p?.OBJECTID ?? p?.ID ?? null,
          },
        };
      })
      .filter(Boolean),
  };
}

/** Old wrapper, kept for callers that still import it. */
export async function syncOfficialGoianiaNeighborhoods() {
  return syncNeighborhoods({ city: "Goiânia", state: "Goiás", country: "Brazil" });
}

/** Helper for callers that want to know if there's a precise override available. */
export function hasPreciseOverride(city?: string | null, _state?: string | null, country?: string | null) {
  return norm(city) === "goiania" && (!country || ["brazil", "brasil", "br"].includes(norm(country)));
}
