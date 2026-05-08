/**
 * [CAMINHO]: supabase/functions/get-rivals/index.ts
 * [MÓDULO]: Inteligência autônoma de rivalidades + resolução de escudos
 * [DESCRIÇÃO]:
 *  - Consulta cache primeiro, mas valida/gera rivais reais com Gemini + Google Search + Wikipédia.
 *  - Resolve escudos via clubes_cache e API-Football, persistindo rivais canônicos.
 *  - Retorna nomes e detalhes para o dashboard renderizar escudos reais.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const API_FOOTBALL = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";

const HITS = new Map<string, number[]>();

type RivalCandidate = {
  name: string;
  canonical_name?: string | null;
  rivalry_name?: string | null;
  scope?: "local" | "regional" | "national" | "international" | string;
  evidence_urls?: string[];
  confidence?: number;
};

type RivalDetail = {
  name: string;
  logo: string | null;
  city: string | null;
  country: string | null;
  source: "cache" | "api" | "missing";
};

function rateLimited(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > limit;
}

function norm(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|ec|ac|cf|sc|club|clube|futebol|football|sociedade|associacao|associação)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanName(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function extractJsonObject(text: string): any | null {
  const clean = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = clean.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
    } catch {
      return null;
    }
  }
}

async function apiFootballSearch(query: string): Promise<RivalDetail | null> {
  if (!API_FOOTBALL || !query) return null;
  try {
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`, {
      headers: { "x-apisports-key": API_FOOTBALL },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const teams = Array.isArray(json?.response) ? json.response : [];
    if (!teams.length) return null;

    const target = norm(query);
    const ranked = teams
      .map((item: any) => {
        const team = item?.team || {};
        const venue = item?.venue || {};
        const n = norm(team.name);
        let score = 0;
        if (n === target) score += 100;
        if (n.includes(target) || target.includes(n)) score += 40;
        if (team.logo) score += 20;
        if (team.national === false) score += 10;
        return { item, score };
      })
      .sort((a: any, b: any) => b.score - a.score);

    const best = ranked[0]?.item;
    const team = best?.team || {};
    const venue = best?.venue || {};
    if (!team?.name) return null;

    return {
      name: cleanName(team.name),
      logo: team.logo || null,
      city: venue.city || null,
      country: team.country || null,
      source: "api",
    };
  } catch (err) {
    console.error("[get-rivals] API-Football search error:", (err as Error).message);
    return null;
  }
}

async function resolveRivalDetail(admin: any, rivalName: string): Promise<RivalDetail> {
  const requested = cleanName(rivalName);
  const { data: exact } = await admin
    .from("clubes_cache")
    .select("nome, escudo_url, cidade, pais")
    .ilike("nome", requested)
    .maybeSingle();

  if (exact?.escudo_url) {
    return {
      name: exact.nome || requested,
      logo: exact.escudo_url,
      city: exact.cidade || null,
      country: exact.pais || null,
      source: "cache",
    };
  }

  const api = await apiFootballSearch(requested);
  if (api?.logo) {
    await admin.from("clubes_cache").upsert(
      {
        nome: api.name,
        nome_curto: api.name,
        cidade: api.city || "Não informado",
        pais: api.country || "Não informado",
        escudo_url: api.logo,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "nome" },
    );
    return api;
  }

  if (exact?.nome) {
    return {
      name: exact.nome,
      logo: exact.escudo_url || null,
      city: exact.cidade || null,
      country: exact.pais || null,
      source: "missing",
    };
  }

  return { name: requested, logo: null, city: null, country: null, source: "missing" };
}

function filterCandidates(candidates: RivalCandidate[], clubName: string): string[] {
  const seen = new Set<string>();
  const normalizedClub = norm(clubName);
  const clean = candidates
    .map((r) => ({
      ...r,
      name: cleanName(r.canonical_name || r.name),
      confidence: Number(r.confidence || 0),
      evidence_urls: Array.isArray(r.evidence_urls) ? r.evidence_urls : [],
    }))
    .filter((r) => r.name && norm(r.name) !== normalizedClub)
    .filter((r) => {
      const hasRivalryLabel = Boolean(cleanName(r.rivalry_name));
      const hasWiki = r.evidence_urls.some((url) => /wikipedia\.org|wikidata\.org/i.test(String(url)));
      const strongConfidence = r.confidence >= 0.78;
      return strongConfidence && (hasRivalryLabel || hasWiki || r.confidence >= 0.88);
    })
    .sort((a, b) => {
      const scopeWeight = (scope: string | undefined) =>
        scope === "local" ? 4 : scope === "regional" ? 3 : scope === "national" ? 2 : scope === "international" ? 1 : 0;
      return scopeWeight(b.scope) - scopeWeight(a.scope) || Number(b.confidence) - Number(a.confidence);
    });

  const localRegional = clean.filter((r) => r.scope === "local" || r.scope === "regional");
  const preferred = localRegional.length >= 2 ? localRegional : clean;

  for (const rival of preferred) {
    const key = norm(rival.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (seen.size >= 4) break;
  }

  return Array.from(seen)
    .map((key) => preferred.find((r) => norm(r.name) === key)?.name)
    .filter(Boolean) as string[];
}

async function aiFetchRivals(clubName: string, country?: string | null, city?: string | null): Promise<string[]> {
  if (!LOVABLE_KEY) return [];
  const ctx = [city && `cidade: ${city}`, country && `país: ${country}`].filter(Boolean).join("; ");
  const prompt = `Você é um pesquisador sênior de rivalidades históricas de futebol do Heart Club.

CLUBE CONSULTADO: ${clubName}${ctx ? ` (${ctx})` : ""}

OBJETIVO: descobrir rivais REAIS e consagrados de qualquer clube do mundo.

PROCESSO OBRIGATÓRIO:
1. Use Google Search para pesquisar simultaneamente fontes em português, inglês e espanhol.
2. Cruze com Wikipedia/Wikidata quando existir página/seção de "rivalry", "derby", "clássico", "clásico" ou "rivalidade".
3. Confirme contexto geográfico do clube (cidade/estado/região/país) antes de listar rivais.
4. Priorize derbies locais/regionais oficiais. Se houver 2+ rivais locais/regionais reconhecidos, NÃO inclua rivais nacionais/inter-estaduais.
5. Não invente rival por tamanho de torcida, confronto recente, tabela, mídia social ou partida isolada.
6. Clubes pequenos da mesma cidade só entram se o clássico tiver reconhecimento histórico documentado.
7. Se as fontes forem fracas ou contraditórias, retorne menos nomes ou lista vazia.

VALIDAÇÃO ANTI-ERRO:
- Vasco da Gama (Rio de Janeiro) deve priorizar Flamengo, Fluminense e Botafogo; Corinthians não é rival principal do Vasco.
- Vila Nova-GO deve priorizar Goiás e Atlético Goianiense/Atlético-GO; Anápolis não deve entrar sem clássico oficial documentado.
- Para clubes globais, use o derby reconhecido: Boca/River, Celtic/Rangers, Real Madrid/Barcelona/Atlético, Galatasaray/Fenerbahçe/Beşiktaş.

SAÍDA: JSON puro, sem markdown, com até 4 candidatos em ordem de importância.
Cada candidato precisa ter nome canônico, nome do clássico/rivalidade quando houver, escopo, urls de evidência e confiança 0-1.
{
  "rivals": [
    {
      "name": "Nome popular do rival",
      "canonical_name": "Nome canônico usado por APIs esportivas",
      "rivalry_name": "Nome do clássico/derby ou null",
      "scope": "local|regional|national|international",
      "evidence_urls": ["https://..."],
      "confidence": 0.0
    }
  ]
}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "google_search" }],
        temperature: 0.02,
      }),
    });
    if (!res.ok) {
      console.error("[get-rivals] AI error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const parsed = extractJsonObject(data?.choices?.[0]?.message?.content || "");
    const candidates: RivalCandidate[] = Array.isArray(parsed?.rivals) ? parsed.rivals : [];
    return filterCandidates(candidates, clubName);
  } catch (e) {
    console.error("[get-rivals] AI exception:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for") || "anon";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const clubName = cleanName(body?.club_name);
    const country = body?.country ? cleanName(body.country) : null;
    const forceRefresh = Boolean(body?.force_refresh);

    if (!clubName || clubName.length > 120) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: row } = await admin
      .from("clubes_cache")
      .select("id, rivais, pais, cidade, estadio_cidade")
      .ilike("nome", clubName)
      .maybeSingle();

    const cityCtx = row?.cidade || row?.estadio_cidade || null;
    let rivals: string[] = !forceRefresh && Array.isArray(row?.rivais) ? row.rivais.filter(Boolean).slice(0, 4) : [];
    let source = rivals.length ? "cache" : "empty";

    if (!rivals.length) {
      rivals = await aiFetchRivals(clubName, country || row?.pais || null, cityCtx);
      source = rivals.length ? "ai_validated" : "empty";
      if (row?.id && rivals.length > 0) {
        await admin.from("clubes_cache").update({ rivais: rivals, atualizado_em: new Date().toISOString() }).eq("id", row.id);
      }
    }

    const rivalDetails = await Promise.all(rivals.map((name) => resolveRivalDetail(admin, name)));
    const canonicalRivals = rivalDetails.map((r) => r.name).filter(Boolean).slice(0, 4);

    if (row?.id && canonicalRivals.length && canonicalRivals.join("|") !== rivals.join("|")) {
      await admin.from("clubes_cache").update({ rivais: canonicalRivals, atualizado_em: new Date().toISOString() }).eq("id", row.id);
    }

    return new Response(JSON.stringify({ rivals: canonicalRivals, rivalDetails, source }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[get-rivals] fatal:", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
