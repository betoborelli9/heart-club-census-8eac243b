/**
 * [CAMINHO]: supabase/functions/search-clubs/index.ts
 * [STATUS]: PRODUÇÃO — Cache Supabase em 1º lugar + API-Football complementar
 * Regra: escudos do clubes_cache sempre prevalecem sobre os da API.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const norm = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const uniqueClubKey = (item: any) => {
  const apiId = item.api_id || item.team?.id;
  if (apiId) return `api:${apiId}`;
  return [item.nome || item.name || item.team?.name || "", item.cidade || item.city || item.venue?.city || "", item.pais || item.country || item.team?.country || ""]
    .map(norm)
    .join("|");
};

// Espelho de src/lib/canonical-club.ts — reconhece "Flamengo", "Clube de
// Regatas do Flamengo", "Sport Club Corinthians Paulista" etc. como o MESMO
// clube, pra nunca duplicar no Supabase só porque o torcedor digitou o nome
// completo/formal em vez do nome curto já cadastrado.
const GENERIC_TOKENS = /\b(sport club|sport clube|football club|futebol clube|futbol club|clube de regatas|clube atletico|associacao atletica|esporte clube|esporte club|sociedade esportiva|club deportivo|atletico club|clube de futebol|sport recife|sport|club|clube|fc|sc|ec|ac|cr|cf|aa|se|cd|ca)\b/g;
const STOPWORDS = /\b(do|da|de|dos|das|of|the|el|la|los|las|del)\b/g;
const canonicalKey = (name: string | null | undefined): string => {
  if (!name) return "";
  let s = norm(name); // já normaliza NFD, remove acentos e deixa minúsculo
  s = s.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(GENERIC_TOKENS, " ").replace(STOPWORDS, " ");
  return s.replace(/\s+/g, " ").trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const cleanSearch = (query || "").trim();
    if (!cleanSearch) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1️⃣ CACHE PRIMEIRO — fonte de verdade para escudos
    let cacheRows = (
      await supabase
        .from("clubes_cache")
        .select("id, api_id, nome, nome_curto, cidade, pais, escudo_url")
        .or(`nome.ilike.%${cleanSearch}%,nome_curto.ilike.%${cleanSearch}%`)
        .limit(30)
    ).data;

    // 1️⃣b FALLBACK POR NOME CANÔNICO — busca literal (acima) não acha "Clube
    // de Regatas do Flamengo" quando só existe "Flamengo" salvo (o termo
    // digitado é mais longo/formal que o nome curto cadastrado). Sem isso,
    // o torcedor cairia na API-Football à toa e arriscaria duplicar o clube.
    if (!cacheRows || cacheRows.length === 0) {
      const searchCanon = canonicalKey(cleanSearch);
      const distinctiveToken = searchCanon.split(" ").sort((a, b) => b.length - a.length)[0];
      if (distinctiveToken && distinctiveToken.length >= 3) {
        const { data: broader } = await supabase
          .from("clubes_cache")
          .select("id, api_id, nome, nome_curto, cidade, pais, escudo_url")
          .ilike("nome", `%${distinctiveToken}%`)
          .limit(30);
        const exact = (broader || []).filter((c: any) => canonicalKey(c.nome) === searchCanon);
        if (exact.length > 0) cacheRows = exact;
      }
    }

    const cacheByApiId = new Map<string, any>();
    (cacheRows || []).forEach((c: any) => {
      if (c.api_id) cacheByApiId.set(String(c.api_id), c);
    });


    // 2️⃣ API-FOOTBALL — SÓ quando o Supabase não achou NADA pra essa busca.
    // Clube que já existe no clubes_cache (já foi votado/buscado antes)
    // nunca gasta cota da API de novo — só clube genuinamente novo, ainda
    // não cadastrado, justifica consultar a API-Football.
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    const apiSearch = cleanSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const queryNorm = apiSearch.toLowerCase();
    const TTL_SEARCH = 20 * 60 * 1000; // 20min — nome de clube não muda rápido
    let apiResults: any[] = [];
    let rawApiResponse: any[] | null = null;

    if ((cacheRows || []).length === 0) {
      const { data: searchCache } = await supabase
        .from("club_search_cache")
        .select("api_results, updated_at")
        .eq("query_norm", queryNorm)
        .maybeSingle();

      if (searchCache && Date.now() - new Date(searchCache.updated_at as any).getTime() < TTL_SEARCH) {
        rawApiResponse = searchCache.api_results as any[];
      } else if (apiKey) {
        try {
          const res = await fetch(
            `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(apiSearch)}`,
            { headers: { "x-apisports-key": apiKey } },
          );
          const apiData = await res.json();
          rawApiResponse = apiData.response || [];
          await supabase.from("club_search_cache").upsert({
            query_norm: queryNorm,
            api_results: rawApiResponse,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("[search-clubs] api-football falhou:", (e as Error).message);
          if (searchCache?.api_results) rawApiResponse = searchCache.api_results as any[];
        }
      }
    }

    if (rawApiResponse) {
      apiResults = rawApiResponse.map((item: any) => {
        const apiId = item.team?.id ? String(item.team.id) : null;
        // 🛡️ ANTI-COLISÃO DE HOMÔNIMOS: só reaproveita cache por api_id idêntico.
        // Match por nome fazia todos os "América" herdarem o mesmo escudo.
        const cached = apiId ? cacheByApiId.get(apiId) : null;
        return {
          api_id: item.team.id,
          name: cached?.nome || item.team.name,
          city: cached?.cidade || item.venue?.city || item.team.country || "",
          country: cached?.pais || item.team.country,
          logo: cached?.escudo_url || item.team.logo,
          source: cached ? "cache" : "api",
        };
      });
    }

    // 3️⃣ Resultados do CACHE que a API não devolveu (dedup só por api_id)
    const cacheOnly = (cacheRows || [])
      .filter((c: any) => {
        if (!c.api_id) return true;
        return !apiResults.some((a) => String(a.api_id) === String(c.api_id));
      })

      .map((c: any) => ({
        api_id: c.api_id ? Number(c.api_id) : null,
        name: c.nome,
        city: c.cidade || "Brasil",
        country: c.pais || "",
        logo: c.escudo_url || "",
        source: "cache",
      }));

    const seen = new Set<string>();
    const results = [...cacheOnly, ...apiResults].filter((item) => {
      const key = uniqueClubKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
