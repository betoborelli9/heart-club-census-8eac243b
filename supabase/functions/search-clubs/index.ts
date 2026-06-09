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
    const { data: cacheRows } = await supabase
      .from("clubes_cache")
      .select("id, api_id, nome, nome_curto, cidade, pais, escudo_url")
      .or(`nome.ilike.%${cleanSearch}%,nome_curto.ilike.%${cleanSearch}%`)
      .limit(30);

    const cacheByApiId = new Map<string, any>();
    const cacheByName = new Map<string, any>();
    (cacheRows || []).forEach((c: any) => {
      if (c.api_id) cacheByApiId.set(String(c.api_id), c);
      cacheByName.set(norm(c.nome), c);
      if (c.nome_curto) cacheByName.set(norm(c.nome_curto), c);
    });

    // 2️⃣ API-Football (complementa homônimos internacionais)
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    const apiSearch = cleanSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let apiResults: any[] = [];
    if (apiKey) {
      try {
        const res = await fetch(
          `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(apiSearch)}`,
          { headers: { "x-apisports-key": apiKey } },
        );
        const apiData = await res.json();
        apiResults = (apiData.response || []).map((item: any) => {
          const apiId = item.team?.id ? String(item.team.id) : null;
          const cached =
            (apiId && cacheByApiId.get(apiId)) ||
            cacheByName.get(norm(item.team?.name || ""));
          // 🛡️ Se o clube já existe no cache, usa o escudo do cache (regra do usuário)
          return {
            api_id: item.team.id,
            name: cached?.nome || item.team.name,
            city: cached?.cidade || item.venue?.city || "Brasil",
            country: cached?.pais || item.team.country,
            logo: cached?.escudo_url || item.team.logo,
            source: cached ? "cache" : "api",
          };
        });
      } catch (e) {
        console.warn("[search-clubs] api-football falhou:", (e as Error).message);
      }
    }

    // 3️⃣ Resultados do CACHE que a API não devolveu (sempre na frente)
    const seen = new Set<string>();
    const cacheOnly = (cacheRows || [])
      .filter((c: any) => {
        const key = c.api_id ? `id:${c.api_id}` : `n:${norm(c.nome)}`;
        if (seen.has(key)) return true;
        const alsoInApi = apiResults.some(
          (a) =>
            (c.api_id && String(a.api_id) === String(c.api_id)) ||
            norm(a.name) === norm(c.nome),
        );
        return !alsoInApi;
      })
      .map((c: any) => ({
        api_id: c.api_id ? Number(c.api_id) : null,
        name: c.nome,
        city: c.cidade || "Brasil",
        country: c.pais || "",
        logo: c.escudo_url || "",
        source: "cache",
      }));

    const results = [...cacheOnly, ...apiResults];

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
