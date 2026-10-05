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

// Reconhece "Flamengo", "Clube de Regatas do Flamengo", "Sport Club
// Corinthians Paulista", "Sociedade Esportiva Palmeiras" etc. como o MESMO
// clube já cadastrado — sem depender de uma lista de "palavras genéricas"
// (que nunca cobre todo mundo: "Club" sem E, "Paulista" no fim, etc.).
// Regra simples e universal: separa em palavras e confere se TODAS as
// palavras do nome já salvo (curto) aparecem dentro do nome digitado
// (completo/formal) — não importa a ordem nem palavras extras.
// Sigla de QUALQUER clube (não uma lista fixa): primeira letra de cada
// palavra do nome completo, ignorando conectivos curtos (e/de/da/do) e
// parênteses — cobre o padrão universal (CRAC, PSV, AEK, CSKA, CRF, SPFC,
// LDU...). Não cobre siglas históricas irregulares (BVB, RB) — essas, se
// algum torcedor reportar, viram um "aliases" manual (como fizemos pro
// Abecat), não dá pra adivinhar por algoritmo.
const ACRONYM_CONNECTORS = new Set(["e", "de", "da", "do", "dos", "das"]);
const buildAcronym = (n: string) =>
  norm((n || "").replace(/\([^)]*\)/g, " "))
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0 && !ACRONYM_CONNECTORS.has(w))
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// APELIDOS E SIGLAS FAMOSOS (o que o torcedor digita → nome pelo qual a base/API-Football conhece o clube).
// Complementa os "aliases" gravados por clube: aqui ficam os apelidos universais ("Timão", "Man United",
// "BVB", "Barça") que valem até para clubes ainda não cadastrados. O resultado do apelido é ACRESCENTADO
// ao da busca normal (nunca a substitui), então homônimos continuam aparecendo.
// Chave: apelido sem acento e em minúsculas.
const FAMOUS_ALIASES: Record<string, string> = {
  // Brasil
  "timao": "Corinthians", "verdao": "Palmeiras", "galo": "Atletico-MG", "peixe": "Santos", "mengao": "Flamengo",
  "fla": "Flamengo", "flu": "Fluminense", "colorado": "Internacional", "imortal": "Gremio", "raposa": "Cruzeiro",
  "furacao": "Athletico Paranaense", "vascao": "Vasco DA Gama", "bota": "Botafogo", "spfc": "Sao Paulo",
  "sao paulo fc": "Sao Paulo", "massa bruta": "Bragantino",
  // Inglaterra
  "man united": "Manchester United", "man utd": "Manchester United", "mufc": "Manchester United",
  "manchester utd": "Manchester United", "man city": "Manchester City", "mcfc": "Manchester City",
  "spurs": "Tottenham", "gunners": "Arsenal", "lfc": "Liverpool", "newcastle utd": "Newcastle",
  // Espanha
  "barca": "Barcelona", "fc barcelona": "Barcelona", "atleti": "Atletico Madrid",
  "atletico de madrid": "Atletico Madrid",
  // Alemanha
  "bvb": "Borussia Dortmund", "bayern munique": "Bayern München", "bayern munich": "Bayern München",
  "gladbach": "Borussia Monchengladbach",
  // Itália
  "juve": "Juventus", "inter de milao": "Inter", "internazionale": "Inter", "inter milan": "Inter",
  "milan": "AC Milan",
  // França
  "psg": "Paris Saint Germain", "paris sg": "Paris Saint Germain", "olympique de marseille": "Marseille",
  "olympique lyonnais": "Lyon",
  // Portugal / outros
  "sporting lisboa": "Sporting CP", "sporting cp": "Sporting CP", "fc porto": "FC Porto", "psv": "PSV Eindhoven",
  "fener": "Fenerbahce", "gala": "Galatasaray",
  // América do Sul / Central
  "boca": "Boca Juniors", "river": "River Plate", "chivas": "Guadalajara Chivas", "la galaxy": "Los Angeles Galaxy",
  "lafc": "Los Angeles FC",
  // Arábia / África
  "al hilal": "Al-Hilal", "al nassr": "Al-Nassr",
};
const famousTerm = (q: string): string | null => FAMOUS_ALIASES[norm(q)] ?? null;

const wordSet = (name: string | null | undefined): Set<string> => {
  const s = norm(name || "").replace(/[^a-z0-9 ]/g, " ").trim();
  return new Set(s.split(/\s+/).filter((w) => w.length > 0));
};
const isSameClubByWords = (storedName: string, searchedName: string): boolean => {
  const stored = wordSet(storedName);
  const searched = wordSet(searchedName);
  if (stored.size === 0) return false;
  for (const w of stored) if (!searched.has(w)) return false;
  return true;
};
// Palavra única e comum demais pra decidir sozinha entre dois clubes que
// cobrem o mesmo número de palavras (ex.: "Sport" dentro de "Sport Club
// Corinthians Paulista" — Sport (Recife) é um clube de verdade, mas não é
// esse). Mesma lista de risco já usada na resolução de escudos.
const AMBIGUOUS_SINGLE_WORDS = new Set([
  "america", "atletico", "nacional", "internacional", "real", "vitoria",
  "goiania", "sport", "racing", "union", "central", "city", "united", "deportivo",
]);

// Busca completa por UM termo (cache em 1º lugar, depois API-Football) — devolve a lista de clubes.
async function searchTerm(cleanSearch: string): Promise<any[]> {
  {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1️⃣ CACHE PRIMEIRO — fonte de verdade para escudos.
    // A busca ignora acentos nos DOIS lados ("Grêmio" acha "Gremio"; "Atletico" acha "Atlético"),
    // via search_clubes_cache. Se essa função falhar por qualquer motivo, volta para a busca antiga.
    let cacheRows: any[] | null = null;
    const viaRpc = await supabase.rpc("search_clubes_cache", { p_term: cleanSearch, p_limit: 30 });
    if (!viaRpc.error && Array.isArray(viaRpc.data)) {
      cacheRows = viaRpc.data;
    } else {
      cacheRows = (
        await supabase
          .from("clubes_cache")
          .select("id, api_id, nome, nome_curto, cidade, pais, escudo_url")
          .or(`nome.ilike.%${cleanSearch}%,nome_curto.ilike.%${cleanSearch}%`)
          .limit(30)
      ).data;
    }

    // 1️⃣a APELIDOS / NOME ANTIGO — clube que trocou de nome (ex.: "Abecat"
    // virou "Agro Esporte Clube") continua achável pelo nome antigo, sem
    // criar um segundo cadastro (o torcedor sempre cai no clube CANÔNICO,
    // nome.nome — nunca no apelido). Guarda qual apelido bateu pra mostrar
    // "antes: Abecat" no resultado, sem esconder a troca de nome do torcedor.
    let matchedAlias: string | null = null;
    if (!cacheRows || cacheRows.length === 0) {
      const { data: aliasRows } = await supabase
        .from("clubes_cache")
        .select("id, api_id, nome, nome_curto, cidade, pais, escudo_url, aliases")
        .not("aliases", "is", null);
      const searchNorm = norm(cleanSearch);
      let foundAlias: string | null = null;
      const aliasMatch = (aliasRows || []).find((c: any) => {
        const hit = Array.isArray(c.aliases)
          ? c.aliases.find((a: string) => norm(a).includes(searchNorm) || searchNorm.includes(norm(a)))
          : null;
        if (hit) foundAlias = hit;
        return !!hit;
      });
      if (aliasMatch) {
        cacheRows = [aliasMatch];
        matchedAlias = foundAlias;
      }
    }

    // 1️⃣b FALLBACK POR PALAVRAS — busca literal (acima) não acha "Clube de
    // Regatas do Flamengo" quando só existe "Flamengo" salvo (o termo
    // digitado é mais longo/formal que o nome curto cadastrado). Sem isso,
    // o torcedor cairia na API-Football à toa e arriscaria duplicar o clube.
    // Funciona pra qualquer clube: tenta VÁRIAS palavras digitadas (não só a
    // mais longa) como âncora — o nome curto salvo pode não conter
    // justamente a palavra mais "chamativa" do nome completo (ex.: "Vasco
    // DA Gama" não tem "Regatas", mas tem "Vasco" e "Gama"). Confirma o
    // achado conferindo se o nome salvo é "coberto" pelas palavras
    // digitadas (isSameClubByWords), nunca confia só na palavra-âncora.
    if (!cacheRows || cacheRows.length === 0) {
      const anchorWords = Array.from(wordSet(cleanSearch))
        .filter((w) => w.length >= 3)
        .sort((a, b) => b.length - a.length)
        .slice(0, 6);
      if (anchorWords.length > 0) {
        const orFilter = anchorWords.map((w) => `nome.ilike.%${w}%`).join(",");
        const { data: broader } = await supabase
          .from("clubes_cache")
          .select("id, api_id, nome, nome_curto, cidade, pais, escudo_url")
          .or(orFilter)
          .limit(30);
        const matched = (broader || []).filter((c: any) => isSameClubByWords(c.nome, cleanSearch));
        if (matched.length > 0) {
          // Entre os que bateram, fica só com quem cobre MAIS palavras do
          // nome digitado (o mais completo/específico vence — ex.: "Vasco
          // DA Gama" com 3 palavras ganha de "Gama" com 1). Em empate,
          // descarta palavra única conhecidamente ambígua.
          const withCount = matched.map((c: any) => ({ row: c, count: wordSet(c.nome).size }));
          const maxCount = Math.max(...withCount.map((x) => x.count));
          let best = withCount.filter((x) => x.count === maxCount);
          if (best.length > 1) {
            best = best.filter((x) => !(x.count === 1 && AMBIGUOUS_SINGLE_WORDS.has(Array.from(wordSet(x.row.nome))[0])));
          }
          if (best.length === 1) cacheRows = [best[0].row];
        }
      }
    }

    // 1️⃣c SIGLA — funciona nas DUAS direções, pra QUALQUER clube já
    // cadastrado (não é lista fixa): torcedor digitou a sigla ("CRAC") e o
    // nome salvo é o nome completo, OU digitou o nome completo e o nome
    // salvo é a sigla. Tabela pequena (centenas de linhas) — compara em
    // memória, sem custo real.
    if (!cacheRows || cacheRows.length === 0) {
      const searchAlpha = norm(cleanSearch).replace(/[^a-z0-9]/g, "").toUpperCase();
      const searchAsAcronym = buildAcronym(cleanSearch);
      if (searchAlpha.length >= 2) {
        const { data: allClubs } = await supabase
          .from("clubes_cache")
          .select("id, api_id, nome, nome_curto, cidade, pais, escudo_url");
        const siglaMatches = (allClubs || []).filter((c: any) => {
          const rowAcronym = buildAcronym(c.nome);
          const rowCurto = (c.nome_curto || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
          const rowNomeAlpha = (c.nome || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
          return (
            (rowAcronym && rowAcronym === searchAlpha) ||
            (rowCurto && rowCurto === searchAlpha) ||
            (searchAsAcronym && (searchAsAcronym === rowNomeAlpha || searchAsAcronym === rowCurto))
          );
        });
        if (siglaMatches.length === 1) cacheRows = [siglaMatches[0]];
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
        matched_alias: matchedAlias && c.id === (cacheRows || [])[0]?.id ? matchedAlias : undefined,
      }));

    const seen = new Set<string>();
    const results = [...cacheOnly, ...apiResults].filter((item) => {
      const key = uniqueClubKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return results;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const typed = (query || "").trim();
    if (!typed) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apelido famoso ("Timão", "Man United", "BVB") → também busca o nome oficial e junta os resultados.
    const famous = famousTerm(typed);
    const [fromFamous, fromTyped] = await Promise.all([
      famous && norm(famous) !== norm(typed) ? searchTerm(famous) : Promise.resolve([] as any[]),
      searchTerm(typed),
    ]);
    const seenKeys = new Set<string>();
    const merged = [...fromFamous, ...fromTyped].filter((item) => {
      const key = uniqueClubKey(item);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    return new Response(JSON.stringify(merged), {
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
