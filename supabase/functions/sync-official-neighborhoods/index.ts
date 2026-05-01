import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_EMAIL = "betoborelli9@gmail.com";
const GOIANIA_ARCGIS_QUERY_URL =
  "https://services7.arcgis.com/iEMmryaM5E3wkdnU/arcgis/rest/services/Bairros_de_Goi%C3%A2nia/FeatureServer/0/query";

function getOfficialGoianiaName(properties: Record<string, unknown>) {
  return String(properties?.QL_BAI || properties?.NM_BAI || properties?.NM || "").trim();
}

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
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      f: "geojson",
      where: "1=1",
      outFields: "*",
      returnGeometry: "false",
      outSR: "4326",
    });
    const response = await fetch(`${GOIANIA_ARCGIS_QUERY_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Prefeitura/ArcGIS retornou ${response.status}`);

    const geojson = await response.json();
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    const rows = features
      .map((feature: any) => ({
        country: "Brazil",
        state: "Goiás",
        city: "Goiânia",
        neighborhood: getOfficialGoianiaName(feature.properties || {}),
        osm_id: feature.properties?.ObjectId ? Number(feature.properties.ObjectId) : null,
      }))
      .filter((row) => row.neighborhood.length > 0);

    if (!rows.length) throw new Error("Malha oficial de Goiânia não retornou bairros.");

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await serviceClient
      .from("geo_neighborhood_cache")
      .upsert(rows, { onConflict: "country,state,city,neighborhood", ignoreDuplicates: false });

    if (error) throw error;

    return new Response(JSON.stringify({ count: rows.length, source: "prefeitura_goiania_arcgis" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});