import { supabase } from "@/integrations/supabase/client";

const GOIANIA_ARCGIS_QUERY_URL =
  "https://services7.arcgis.com/iEMmryaM5E3wkdnU/arcgis/rest/services/Bairros_de_Goi%C3%A2nia/FeatureServer/0/query";

const normalize = (value?: string | null) =>
  (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function isOfficialGoianiaCity(city?: string | null, state?: string | null, country?: string | null) {
  const cityKey = normalize(city);
  const stateKey = normalize(state);
  const countryKey = normalize(country);
  return (
    cityKey === "goiania" &&
    (!stateKey || stateKey === "goias" || stateKey === "go" || stateKey === "goias") &&
    (!countryKey || countryKey === "brazil" || countryKey === "brasil" || countryKey === "br")
  );
}

function getOfficialGoianiaName(properties: any): string {
  return String(properties?.QL_BAI || properties?.NM_BAI || properties?.NM || properties?.name || "").trim();
}

export async function fetchOfficialGoianiaNeighborhoodGeoJson(): Promise<any | null> {
  const params = new URLSearchParams({
    f: "geojson",
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
  });

  const response = await fetch(`${GOIANIA_ARCGIS_QUERY_URL}?${params.toString()}`);
  if (!response.ok) return null;

  const geojson = await response.json();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  if (!features.length) return null;

  return {
    ...geojson,
    features: features
      .map((feature: any) => {
        const name = getOfficialGoianiaName(feature?.properties);
        if (!name) return null;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            name,
            official_name: name,
            source: "prefeitura_goiania_arcgis",
            osm_id: feature?.properties?.ObjectId ?? feature?.properties?.ID ?? null,
          },
        };
      })
      .filter(Boolean),
  };
}

export async function syncOfficialGoianiaNeighborhoods() {
  const geojson = await fetchOfficialGoianiaNeighborhoodGeoJson();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  const rows = features.map((feature: any) => ({
    country: "Brazil",
    state: "Goiás",
    city: "Goiânia",
    neighborhood: feature.properties.name,
    osm_id: feature.properties.osm_id ? Number(feature.properties.osm_id) : null,
  }));

  if (!rows.length) {
    return { count: 0, error: new Error("Malha oficial de Goiânia não retornou bairros.") };
  }

  const { error } = await supabase
    .from("geo_neighborhood_cache")
    .upsert(rows, { onConflict: "country,state,city,neighborhood", ignoreDuplicates: false });

  return { count: rows.length, error };
}