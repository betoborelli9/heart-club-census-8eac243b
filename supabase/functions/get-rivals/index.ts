/**
 * [CAMINHO]: supabase/functions/get-rivals/index.ts
 * [MÓDULO]: Inteligência de Rivalidades via Lovable AI (Gemini)
 * [DESCRIÇÃO]:
 *  - Recebe { club_name, country }.
 *  - Verifica cache em clubes_cache.rivais; se vazio, consulta IA Gemini com Google Search.
 *  - Persiste lista de até 4 rivais oficiais como text[] no clubes_cache.
 *  - Retorna { rivals: string[] }.
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

// ── rate-limit em memória (best-effort) ──
const HITS = new Map<string, number[]>();
function rateLimited(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > limit;
}

async function aiFetchRivals(
  clubName: string,
  country?: string | null,
  city?: string | null,
): Promise<string[]> {
  if (!LOVABLE_KEY) return [];
  const ctx = [city, country].filter(Boolean).join(", ");
  const ctxStr = ctx ? ` (${ctx})` : "";
  const prompt = `Você é um especialista em rivalidades HISTÓRICAS do futebol. Cruze obrigatoriamente Google Search + Wikipédia (PT e EN) antes de responder.

Clube: ${clubName}${ctxStr}

Tarefa: liste APENAS os rivais HISTÓRICOS oficiais (clássicos regionais consagrados e clássicos nacionais reconhecidos pela imprensa esportiva), em ordem de importância.

REGRAS DURAS DE PRIORIZAÇÃO:
1. PRIORIDADE ABSOLUTA = MESMO ESTADO/REGIÃO. Identifique o ESTADO/UF do clube e liste primeiro os rivais do MESMO ESTADO. Se houver 2+ rivais estaduais consagrados, eles ocupam TODAS as vagas — NÃO inclua rivais interestaduais.
   - Exemplo: Vasco da Gama é do Rio de Janeiro → rivais corretos: Flamengo, Fluminense, Botafogo. PROIBIDO listar Corinthians (SP) como rival principal do Vasco.
   - Exemplo: Vila Nova-GO → Goiás, Atlético-GO. NÃO inclua Anápolis (não disputa clássico oficial reconhecido).
   - Exemplo: Grêmio → Internacional (Gre-Nal). NÃO listar Palmeiras como rival principal.
2. Só inclua rival INTERESTADUAL se NÃO houver rivais consagrados no mesmo estado (ex.: clube único de uma UF) OU se for um clássico nacional histórico reconhecido pela imprensa (ex.: clássicos da Copa Libertadores entre clubes de países distintos).
3. PROIBIDO incluir clubes pequenos/sem expressão da mesma cidade que NÃO disputam clássico oficial reconhecido.
4. Para clubes europeus/sul-americanos, use o derby clássico reconhecido (ex.: Boca → River; Real Madrid → Barcelona, Atlético de Madrid).
5. Mínimo 2, máximo 4 rivais. Se houver menos de 2 rivais documentados, retorne lista vazia.
6. Apenas o NOME popular do clube (ex.: "Flamengo", "Atlético-GO", "Atlético Goianiense").

Pesquise: "rivais do ${clubName}", "clássico ${clubName}", "${clubName} rivalry wikipedia", "estado ${clubName}".

Responda APENAS em JSON válido sem markdown:
{"rivals":["Nome 1","Nome 2","Nome 3"]}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "google_search" }],
        temperature: 0.1,
      }),
    });
    if (!res.ok) {
      console.error("[get-rivals] AI error:", res.status);
      return [];
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return [];
    const parsed = JSON.parse(m[0]);
    const arr: string[] = Array.isArray(parsed?.rivals) ? parsed.rivals : [];
    return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 4);
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
    const clubName = String(body?.club_name || "").trim();
    const country = body?.country ? String(body.country).trim() : null;

    if (!clubName || clubName.length > 120) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Cache
    const { data: row } = await admin
      .from("clubes_cache")
      .select("id, rivais, pais")
      .ilike("nome", clubName)
      .maybeSingle();

    if (row?.rivais && Array.isArray(row.rivais) && row.rivais.length > 0) {
      return new Response(JSON.stringify({ rivals: row.rivais, source: "cache" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. IA
    const rivals = await aiFetchRivals(clubName, country || row?.pais || null);

    // 3. Persiste se houver clube no cache
    if (row?.id && rivals.length > 0) {
      await admin.from("clubes_cache").update({ rivais: rivals }).eq("id", row.id);
    }

    return new Response(JSON.stringify({ rivals, source: rivals.length ? "ai" : "empty" }), {
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
