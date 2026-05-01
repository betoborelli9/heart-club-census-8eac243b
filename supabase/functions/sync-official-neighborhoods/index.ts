/**
 * sync-official-neighborhoods
 * Universal neighborhood sync.
 *
 * Default provider: OpenStreetMap (Overpass API) — admin_level=10 worldwide.
 * Override providers: city-specific official sources (e.g. Prefeitura de Goiânia / ArcGIS).
 *
 * Body: { city: string, state?: string, country?: string }
 * Auth: master admin only.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_EMAIL = "betoborelli9@gmail.com";

const norm = (v?: string | null) =>
  (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

type Row = { country: string; state: string | null; city: string; neighborhood: string; osm_id: number | null };

/* ---------------- PROVIDER REGISTRY ---------------- */
type ProviderResult = { rows: Row[]; source: string };
type Provider = {
  id: string;
  matches: (city: string, state: string, country: string) => boolean;
  fetch: (city: string, state: string, country: string) => Promise<ProviderResult>;
};

/* Override: Goiânia (ArcGIS Prefeitura) */
const goianiaArcgis: Provider = {
  id: "prefeitura_goiania_arcgis",
  matches: (city, _state, country) =>
    norm(city) === "goiania" && (!country || ["brazil", "brasil", "br"].includes(norm(country))),
  fetch: async (_city, _state, country) => {
    const url =
      "https://services7.arcgis.com/iEMmryaM5E3wkdnU/arcgis/rest/services/Bairros_de_Goi%C3%A2nia/FeatureServer/0/query";
    const params = new URLSearchParams({
      f: "geojson", where: "1=1", outFields: "*", returnGeometry: "false", outSR: "4326",
    });
    const res = await fetch(`${url}?${params}`);
    if (!res.ok) throw new Error(`ArcGIS Goiânia ${res.status}`);
    const json = await res.json();
    const feats = Array.isArray(json?.features) ? json.features : [];
    const rows: Row[] = [];
    for (const f of feats) {
      const p = f?.properties || {};
      const name = String(p.QL_BAI || p.NM_BAI || p.NM || "").trim();
      if (!name) continue;
      const idVal = p.OBJECTID ?? p.ObjectId ?? p.objectid ?? null;
      rows.push({
        country: country || "Brazil",
        state: "Goiás",
        city: "Goiânia",
        neighborhood: name,
        osm_id: idVal != null ? Number(idVal) : null,
      });
    }
    return { rows, source: "prefeitura_goiania_arcgis" };
  },
};

/* Universal default: OpenStreetMap Overpass admin_level=10 */
const overpassUniversal: Provider = {
  id: "osm_overpass_admin_level_10",
  matches: () => true,
  fetch: async (city, state, country) => {
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.openstreetmap.fr/api/interpreter",
    ];

    // Build a tolerant Overpass query: find the city area, then admin_level=10 within it.
    // Match city by name OR name:* tags (handles accents/locales).
    const cityEsc = city.replace(/"/g, '\\"');
    const stateEsc = (state || "").replace(/"/g, '\\"');
    const countryEsc = (country || "").replace(/"/g, '\\"');

    const stateFilter = state
      ? `["is_in:state"~"${stateEsc}",i]` // soft hint, optional
      : "";
    const countryFilter = country
      ? `(area["admin_level"~"^[23]$"]["name"~"^${countryEsc}$",i];)->.country;`
      : `(area["admin_level"="2"];)->.country;`;

    const query = `
[out:json][timeout:60];
${countryFilter}
(
  area["boundary"="administrative"]["admin_level"~"^(7|8)$"]["name"~"^${cityEsc}$",i](area.country);
  area["boundary"="administrative"]["admin_level"~"^(7|8)$"]["name:pt"~"^${cityEsc}$",i](area.country);
  area["boundary"="administrative"]["admin_level"~"^(7|8)$"]["name:en"~"^${cityEsc}$",i](area.country);
)->.city;
(
  relation(area.city)["boundary"="administrative"]["admin_level"="10"];
  way(area.city)["boundary"="administrative"]["admin_level"="10"];
);
out tags;
`.trim();

    let lastErr: unknown = null;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) { lastErr = new Error(`Overpass ${ep} ${res.status}`); continue; }
        const json = await res.json();
        const elements = Array.isArray(json?.elements) ? json.elements : [];
        const rows: Row[] = [];
        const seen = new Set<string>();
        for (const el of elements) {
          const tags = el?.tags || {};
          const name = String(tags.name || tags["name:pt"] || tags["name:en"] || "").trim();
          if (!name) continue;
          const key = norm(name);
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({
            country: country || "",
            state: state || null,
            city,
            neighborhood: name,
            osm_id: typeof el?.id === "number" ? el.id : null,
          });
        }
        return { rows, source: `osm_overpass:${ep}` };
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(`Overpass falhou: ${lastErr instanceof Error ? lastErr.message : "desconhecido"}`);
  },
};

const REGISTRY: Provider[] = [goianiaArcgis, overpassUniversal];

function pickProvider(city: string, state: string, country: string): Provider {
  return REGISTRY.find((p) => p.matches(city, state, country)) || overpassUniversal;
}

/* ---------------- HANDLER ---------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || userData.user?.email !== MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const city = String(body?.city || "").trim();
    const state = String(body?.state || "").trim();
    const country = String(body?.country || "").trim();

    if (!city) {
      return new Response(JSON.stringify({ error: "city é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = pickProvider(city, state, country);
    const { rows, source } = await provider.fetch(city, state, country);

    // Dedup defensivo
    const unique = new Map<string, Row>();
    for (const r of rows) {
      if (!r.neighborhood) continue;
      const k = `${norm(r.country)}|${norm(r.state || "")}|${norm(r.city)}|${norm(r.neighborhood)}`;
      if (!unique.has(k)) unique.set(k, r);
    }
    const finalRows = Array.from(unique.values());

    if (!finalRows.length) {
      return new Response(JSON.stringify({
        count: 0, source, error: "Nenhum bairro retornado pelo provedor.",
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await serviceClient
      .from("geo_neighborhood_cache")
      .upsert(finalRows, { onConflict: "country,state,city,neighborhood", ignoreDuplicates: false });
    if (error) throw error;

    return new Response(JSON.stringify({
      count: finalRows.length, source, city, state, country,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
