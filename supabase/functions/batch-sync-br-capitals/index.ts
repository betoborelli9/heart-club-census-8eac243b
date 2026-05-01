/**
 * batch-sync-br-capitals
 * Carga em lote das 27 capitais do Brasil: bairros OSM/override + votos fictícios ponderados.
 * TEMP_EXECUTION_ENABLED fica true apenas para a execução assistida desta carga; depois deve voltar para false.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_EMAIL = "betoborelli9@gmail.com";
const TEMP_EXECUTION_ENABLED = true;

type Capital = { city: string; state: string; country: string; weight: number };
type CacheRow = { country: string; state: string; city: string; neighborhood: string; osm_id: number | null };

const CAPITALS: Capital[] = [
  { city: "Rio Branco", state: "Acre", country: "Brazil", weight: 1.2 },
  { city: "Maceió", state: "Alagoas", country: "Brazil", weight: 1.8 },
  { city: "Macapá", state: "Amapá", country: "Brazil", weight: 1.1 },
  { city: "Manaus", state: "Amazonas", country: "Brazil", weight: 2.8 },
  { city: "Salvador", state: "Bahia", country: "Brazil", weight: 4.3 },
  { city: "Fortaleza", state: "Ceará", country: "Brazil", weight: 3.9 },
  { city: "Brasília", state: "Distrito Federal", country: "Brazil", weight: 3.7 },
  { city: "Vitória", state: "Espírito Santo", country: "Brazil", weight: 1.9 },
  { city: "Goiânia", state: "Goiás", country: "Brazil", weight: 6.5 },
  { city: "São Luís", state: "Maranhão", country: "Brazil", weight: 2.1 },
  { city: "Cuiabá", state: "Mato Grosso", country: "Brazil", weight: 1.8 },
  { city: "Campo Grande", state: "Mato Grosso do Sul", country: "Brazil", weight: 1.9 },
  { city: "Belo Horizonte", state: "Minas Gerais", country: "Brazil", weight: 5.0 },
  { city: "Belém", state: "Pará", country: "Brazil", weight: 2.7 },
  { city: "João Pessoa", state: "Paraíba", country: "Brazil", weight: 1.9 },
  { city: "Curitiba", state: "Paraná", country: "Brazil", weight: 4.7 },
  { city: "Recife", state: "Pernambuco", country: "Brazil", weight: 3.4 },
  { city: "Teresina", state: "Piauí", country: "Brazil", weight: 1.8 },
  { city: "Rio de Janeiro", state: "Rio de Janeiro", country: "Brazil", weight: 6.0 },
  { city: "Natal", state: "Rio Grande do Norte", country: "Brazil", weight: 1.8 },
  { city: "Porto Alegre", state: "Rio Grande do Sul", country: "Brazil", weight: 4.1 },
  { city: "Porto Velho", state: "Rondônia", country: "Brazil", weight: 1.3 },
  { city: "Boa Vista", state: "Roraima", country: "Brazil", weight: 1.1 },
  { city: "Florianópolis", state: "Santa Catarina", country: "Brazil", weight: 2.2 },
  { city: "São Paulo", state: "São Paulo", country: "Brazil", weight: 7.2 },
  { city: "Aracaju", state: "Sergipe", country: "Brazil", weight: 1.6 },
  { city: "Palmas", state: "Tocantins", country: "Brazil", weight: 1.1 },
];

const norm = (v?: string | null) =>
  (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireMaster(req: Request, supabaseUrl: string, anonKey: string) {
  if (TEMP_EXECUTION_ENABLED) return;
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || data.user?.email !== MASTER_EMAIL) throw new Error("Acesso negado");
}

function pickWeightedCapital(capitals: Capital[]) {
  const total = capitals.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of capitals) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return capitals[capitals.length - 1];
}

async function fetchGoianiaArcgis(): Promise<{ rows: CacheRow[]; source: string }> {
  const url = "https://services7.arcgis.com/iEMmryaM5E3wkdnU/arcgis/rest/services/Bairros_de_Goi%C3%A2nia/FeatureServer/0/query";
  const params = new URLSearchParams({ f: "geojson", where: "1=1", outFields: "*", returnGeometry: "false", outSR: "4326" });
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) throw new Error(`ArcGIS Goiânia ${res.status}`);
  const data = await res.json();
  const rows = (Array.isArray(data?.features) ? data.features : [])
    .map((f: any) => {
      const p = f?.properties || {};
      const neighborhood = String(p.QL_BAI || p.NM_BAI || p.NM || "").trim();
      if (!neighborhood) return null;
      return { country: "Brazil", state: "Goiás", city: "Goiânia", neighborhood, osm_id: Number(p.OBJECTID ?? p.ObjectId ?? p.objectid ?? 0) || null };
    })
    .filter(Boolean) as CacheRow[];
  return { rows, source: "prefeitura_goiania_arcgis" };
}

async function fetchOsmNeighborhoods(capital: Capital): Promise<{ rows: CacheRow[]; source: string }> {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
  ];
  const city = capital.city.replace(/"/g, '\\"');
  const state = capital.state.replace(/"/g, '\\"');
  const query = `
[out:json][timeout:70];
area["ISO3166-1"="BR"]["admin_level"="2"]->.country;
(
  area["boundary"="administrative"]["admin_level"~"^(7|8)$"]["name"~"^${city}$",i](area.country);
  area["boundary"="administrative"]["admin_level"~"^(7|8)$"]["name:pt"~"^${city}$",i](area.country);
)->.city;
(
  nwr(area.city)["boundary"="administrative"]["admin_level"="10"];
  nwr(area.city)["place"~"^(suburb|neighbourhood|quarter|city_block)$"];
  nwr(area.city)["addr:suburb"];
);
out tags;
`.trim();

  let lastErr = "desconhecido";
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) { lastErr = `${endpoint} ${res.status}`; continue; }
      const data = await res.json();
      const seen = new Set<string>();
      const rows: CacheRow[] = [];
      for (const el of Array.isArray(data?.elements) ? data.elements : []) {
        const tags = el?.tags || {};
        const raw = tags.name || tags["name:pt"] || tags["addr:suburb"] || tags["official_name"] || "";
        const neighborhood = String(raw).trim();
        if (!neighborhood) continue;
        const key = norm(neighborhood);
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ country: capital.country, state: capital.state, city: capital.city, neighborhood, osm_id: typeof el?.id === "number" ? el.id : null });
      }
      return { rows, source: `osm_overpass:${endpoint}` };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`Overpass falhou para ${capital.city}: ${lastErr}`);
}

async function syncCapital(serviceClient: any, capital: Capital) {
  const fetched = norm(capital.city) === "goiania" ? await fetchGoianiaArcgis() : await fetchOsmNeighborhoods(capital);
  const unique = new Map<string, CacheRow>();
  for (const row of fetched.rows) {
    const key = `${norm(row.country)}|${norm(row.state)}|${norm(row.city)}|${norm(row.neighborhood)}`;
    if (row.neighborhood && !unique.has(key)) unique.set(key, row);
  }
  const rows = [...unique.values()];
  if (rows.length > 0) {
    const { error } = await serviceClient.from("geo_neighborhood_cache").upsert(rows, {
      onConflict: "country,state,city,neighborhood",
      ignoreDuplicates: false,
    });
    if (error) throw error;
  }
  const { count } = await serviceClient
    .from("geo_neighborhood_cache")
    .select("id", { count: "exact", head: true })
    .eq("country", capital.country)
    .eq("state", capital.state)
    .eq("city", capital.city);
  return { city: capital.city, state: capital.state, count: count || rows.length, source: fetched.source };
}

async function seedWeightedVotes(serviceClient: any, quantity: number, purgeExisting: boolean) {
  quantity = Math.min(Math.max(Math.floor(quantity || 50000), 1), 50000);
  if (purgeExisting) {
    const { data: oldVotes } = await serviceClient.from("votos").select("user_id").eq("status_integridade", "ficticio").limit(100000);
    const oldUsers = (oldVotes || []).map((v: any) => v.user_id).filter(Boolean);
    for (let i = 0; i < oldUsers.length; i += 1000) {
      await serviceClient.from("votos_ficticios_meta").delete().in("user_id", oldUsers.slice(i, i + 1000));
    }
    await serviceClient.from("votos").delete().eq("status_integridade", "ficticio");
  }

  const { data: clubs, error: clubsError } = await serviceClient.from("clubes_cache").select("nome").not("nome", "is", null).limit(5000);
  if (clubsError) throw clubsError;
  const clubNames = (clubs || []).map((c: any) => String(c.nome || "").trim()).filter(Boolean);
  if (!clubNames.length) throw new Error("clubes_cache está vazio");

  const cacheByCity = new Map<string, string[]>();
  for (const capital of CAPITALS) {
    const { data, error } = await serviceClient
      .from("geo_neighborhood_cache")
      .select("neighborhood")
      .eq("country", capital.country)
      .eq("state", capital.state)
      .eq("city", capital.city)
      .limit(3000);
    if (error) throw error;
    cacheByCity.set(capital.city, (data || []).map((r: any) => String(r.neighborhood || "").trim()).filter(Boolean));
  }
  const usableCapitals = CAPITALS.filter((capital) => (cacheByCity.get(capital.city)?.length || 0) > 0);
  if (!usableCapitals.length) throw new Error("Nenhuma capital com bairros no cache");

  const names = ["Carlos Silva", "Ana Souza", "João Pereira", "Maria Santos", "Pedro Lima", "Beatriz Costa", "Lucas Almeida", "Juliana Rocha", "Rafael Mendes", "Fernanda Dias", "Ricardo Gomes", "Patrícia Ribeiro", "Bruno Carvalho", "Camila Nunes", "Gustavo Araújo", "Larissa Pinto", "Felipe Barbosa", "Mariana Castro", "Thiago Moreira", "Aline Cardoso", "Eduardo Martins", "Vanessa Oliveira", "Marcelo Teixeira", "Renata Lopes", "Diego Fernandes"];
  const cityTotals = new Map<string, number>();
  const voteRows: any[] = [];
  const metaRows: any[] = [];

  for (let i = 0; i < quantity; i++) {
    const capital = pickWeightedCapital(usableCapitals);
    const neighborhoods = cacheByCity.get(capital.city) || [];
    const userId = crypto.randomUUID();
    const neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    const club = clubNames[Math.floor(Math.random() * clubNames.length)];
    voteRows.push({
      user_id: userId,
      clube_nome: club,
      pais: capital.country,
      estado: capital.state,
      cidade: capital.city,
      bairro: neighborhood,
      voto_cidade: capital.city,
      voto_pais: capital.country,
      voto_continente: "América do Sul",
      is_original_vote: true,
      is_fraud_attempt: false,
      is_suspicious: false,
      status_integridade: "ficticio",
    });
    metaRows.push({
      user_id: userId,
      nome_exibicao: `${names[Math.floor(Math.random() * names.length)]} ${userId.slice(0, 4).toUpperCase()}`,
      codigo_indicacao: crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase(),
      indicado_por: null,
    });
    cityTotals.set(capital.city, (cityTotals.get(capital.city) || 0) + 1);
  }

  for (let i = 0; i < voteRows.length; i += 1000) {
    const { error } = await serviceClient.from("votos").insert(voteRows.slice(i, i + 1000));
    if (error) throw error;
  }
  for (let i = 0; i < metaRows.length; i += 1000) {
    const { error } = await serviceClient.from("votos_ficticios_meta").insert(metaRows.slice(i, i + 1000));
    if (error) throw error;
  }

  return {
    inseridos: voteRows.length,
    capitais_usadas: usableCapitals.length,
    distribuicao: [...cityTotals.entries()].sort((a, b) => b[1] - a[1]).map(([city, votes]) => ({ city, votes })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase env vars ausentes");
    await requireMaster(req, supabaseUrl, anonKey);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode || "summary");

    if (mode === "syncOne") {
      const capital = CAPITALS.find((c) => norm(c.city) === norm(body.city));
      if (!capital) return json({ error: "Capital não reconhecida" }, 400);
      return json(await syncCapital(serviceClient, capital));
    }

    if (mode === "seed") {
      return json(await seedWeightedVotes(serviceClient, Number(body.quantity || 50000), body.purgeExisting !== false));
    }

    if (mode === "importRows") {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length || rows.length > 5000) return json({ error: "rows deve ter entre 1 e 5000 itens" }, 400);
      const cleanRows = rows
        .map((r: any) => ({
          country: String(r.country || "Brazil").trim(),
          state: String(r.state || "").trim(),
          city: String(r.city || "").trim(),
          neighborhood: String(r.neighborhood || "").trim(),
          osm_id: Number.isFinite(Number(r.osm_id)) ? Number(r.osm_id) : null,
        }))
        .filter((r: CacheRow) => r.country && r.city && r.neighborhood);
      const { error } = await serviceClient
        .from("geo_neighborhood_cache")
        .upsert(cleanRows, { onConflict: "country,state,city,neighborhood", ignoreDuplicates: false });
      if (error) throw error;
      return json({ imported: cleanRows.length });
    }

    const summary = [];
    for (const capital of CAPITALS) {
      const { count } = await serviceClient.from("geo_neighborhood_cache").select("id", { count: "exact", head: true }).eq("country", capital.country).eq("state", capital.state).eq("city", capital.city);
      summary.push({ city: capital.city, state: capital.state, count: count || 0 });
    }
    return json({ capitals: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return json({ error: message }, message === "Acesso negado" ? 403 : 500);
  }
});