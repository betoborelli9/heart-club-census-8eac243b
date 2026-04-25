/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO DE CLUBES (Cores · Divisão · Mascote · Feminino · Escudo)
 * [STATUS]: VERSÃO 4.0 — GEMINI 2.5 FLASH + GOOGLE SEARCH GROUNDING
 * [DESCRIÇÃO]: Edge Function que enriquece dados de clubes via:
 *   1. API-Football (ID técnico + escudo oficial + país/cidade)
 *   2. Gemini 2.5 Flash com Google Search Tool (busca cruzada Wikipedia,
 *      OGOL, Site Oficial, CBF) para extrair cores, divisão, mascote
 *      e status do futebol feminino com altíssima assertividade.
 *   3. Persistência via UPSERT em `clubes_cache` (chave: nome).
 * ═══════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: CORS
   ═══════════════════════════════════════════════════════════ */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO: TIPOS
   ═══════════════════════════════════════════════════════════ */
interface TechnicalData {
  api_id: string | null;
  escudo_url: string | null;
  pais: string | null;
  cidade: string | null;
}

interface AIEnrichment {
  cor_primaria: string;
  cor_secundaria: string;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  mascote: string;
  tem_feminino: boolean;
  division: string;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: fetchTechnicalData
    Busca ID técnico, escudo oficial e localização na API-Football.
   ═══════════════════════════════════════════════════════════ */
async function fetchTechnicalData(clubName: string): Promise<TechnicalData> {
  const apiKey =
    Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY");
  const fallback: TechnicalData = {
    api_id: null,
    escudo_url: null,
    pais: null,
    cidade: null,
  };
  if (!apiKey) return fallback;

  try {
    const url = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(
      clubName,
    )}`;
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    const item = json?.response?.[0];
    if (!item) return fallback;

    return {
      api_id: item.team?.id ? String(item.team.id) : null,
      escudo_url: item.team?.logo ?? null,
      pais: item.team?.country ?? null,
      cidade: item.venue?.city ?? null,
    };
  } catch (err) {
    console.error("[fetchTechnicalData] erro:", err);
    return fallback;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: investigateClubWithAI
    Busca cruzada via Gemini 2.5 Flash + Google Search Tool.
    Aplica o "cabresto" de prompt rígido para garantir output JSON puro.
   ═══════════════════════════════════════════════════════════ */
async function investigateClubWithAI(
  clubName: string,
  pais: string | null,
): Promise<AIEnrichment | null> {
  const geminiKey =
    Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
  if (!geminiKey) {
    console.error("[investigateClubWithAI] GEMINI_API_KEY ausente");
    return null;
  }

  const paisLabel = pais ?? "Brasil";

  const systemPrompt = `Você é um SCOUT TÉCNICO de futebol mundial. Sua única missão é
investigar um clube e retornar um JSON puro com cores, divisão atual, mascote
e status do futebol feminino. Sua resposta DEVE conter EXCLUSIVAMENTE o objeto
JSON — nada mais (sem markdown, sem comentários, sem texto antes ou depois).`;

  const userPrompt = `
INVESTIGAÇÃO ALVO: "${clubName}" (País: ${paisLabel})

═══════════════════════════════════════════════════════════
1. BUSCA CRUZADA OBRIGATÓRIA (use Google Search):
   - Wikipedia (PT/EN/ES)
   - OGOL (ogol.com.br)
   - Site Oficial do Clube
   - CBF (cbf.com.br) — para clubes brasileiros

═══════════════════════════════════════════════════════════
2. HIERARQUIA DE DIVISÕES — BRASIL (temporada 2026):
   a) Verificar PRIMEIRO se o clube disputa em 2026:
      - "Série A", "Série B", "Série C" ou "Série D"
   b) Se NÃO houver competição nacional, verificar Estadual:
      - "Estadual 1ª Divisão", "Estadual 2ª Divisão",
        "Estadual 3ª Divisão", "Estadual 4ª Divisão" ou
        "Estadual 5ª Divisão"

3. HIERARQUIA INTERNACIONAL (clubes fora do Brasil):
   a) Buscar PRIMEIRO o campeonato nacional mais importante do país
      (ex: "Premier League", "La Liga", "Serie A", "Bundesliga",
      "Ligue 1", "Primera División").
   b) Se não estiver na 1ª divisão, buscar 2ª, 3ª etc.

═══════════════════════════════════════════════════════════
4. ALFAIATARIA VISUAL — CORES DO TECIDO DO UNIFORME:
   ⚠️ REGRA ANTI-BORDA: IGNORAR cores de contorno de escudo,
      detalhes de estrelas, números, patrocínios. Foque na ALMA
      do uniforme titular (camisa principal, mangas, faixas).

   - BICOLOR  → cor_terciaria = null  E  cor_quarta = null
   - TRICOLOR → cor_quarta = null
   - QUADRICOLOR → identificar OBRIGATORIAMENTE as 4 cores
     (Ex: Brusque-SC = Amarelo, Verde, Vermelho e Branco)

   Todas as cores devem ser HEX em maiúsculas: "#RRGGBB".

═══════════════════════════════════════════════════════════
5. FUTEBOL FEMININO (tem_feminino):
   - true APENAS se houver confirmação de equipe profissional OU
     categoria de base ATIVA, validada no OGOL ou Site Oficial.
   - Caso contrário: false.

═══════════════════════════════════════════════════════════
6. MASCOTE:
   - Nome popular do mascote/apelido (ex: "Tigre", "Mosqueteiro",
     "Galo", "Timbu"). Sem emojis, sem aspas extras.

═══════════════════════════════════════════════════════════
OUTPUT — RETORNE EXCLUSIVAMENTE ESTE JSON PURO:
{"cor_primaria":"#HEX","cor_secundaria":"#HEX","cor_terciaria":"#HEX ou null","cor_quarta":"#HEX ou null","mascote":"NOME","tem_feminino":true|false,"division":"Série X"}
`.trim();

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      geminiKey;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) {
      console.error(
        "[investigateClubWithAI] Gemini status:",
        res.status,
        await res.text(),
      );
      return null;
    }

    const json = await res.json();
    const text: string =
      json?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("") ?? "";

    // Extração robusta do JSON (ignora markdown/fences caso o modelo desvie)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("[investigateClubWithAI] JSON não encontrado:", text);
      return null;
    }

    const parsed = JSON.parse(match[0]) as AIEnrichment;

    // Normalização defensiva (cabresto pós-IA)
    const norm = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (!s || s.toLowerCase() === "null") return null;
      return s.startsWith("#") ? s.toUpperCase() : `#${s.toUpperCase()}`;
    };

    return {
      cor_primaria: norm(parsed.cor_primaria) ?? "#000000",
      cor_secundaria: norm(parsed.cor_secundaria) ?? "#FFFFFF",
      cor_terciaria: norm(parsed.cor_terciaria),
      cor_quarta: norm(parsed.cor_quarta),
      mascote: (parsed.mascote ?? "").toString().trim() || "—",
      tem_feminino: Boolean(parsed.tem_feminino),
      division: (parsed.division ?? "").toString().trim() || "Indefinida",
    };
  } catch (err) {
    console.error("[investigateClubWithAI] exceção:", err);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: ORQUESTRAÇÃO PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clubName: string | undefined = body?.club_name ?? body?.clubName;

    if (!clubName || typeof clubName !== "string" || clubName.length < 2) {
      return new Response(
        JSON.stringify({ error: "club_name inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Dados técnicos (API-Football)
    const technical = await fetchTechnicalData(clubName);

    // 2. Inteligência cruzada (Gemini + Google Search)
    const ai = await investigateClubWithAI(clubName, technical.pais);

    if (!ai) {
      return new Response(
        JSON.stringify({ error: "Falha no enriquecimento por IA" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Persistência (UPSERT por nome)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const payload = {
      nome: clubName,
      pais: technical.pais ?? "Brasil",
      cidade: technical.cidade ?? "—",
      api_id: technical.api_id,
      escudo_url: technical.escudo_url,
      cor_primaria: ai.cor_primaria,
      cor_secundaria: ai.cor_secundaria,
      cor_terciaria: ai.cor_terciaria,
      cor_quarta: ai.cor_quarta,
      mascote: ai.mascote,
      tem_feminino: ai.tem_feminino,
      division: ai.division,
      atualizado_em: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" });

    if (upsertError) {
      console.error("[orchestration] upsert erro:", upsertError);
      return new Response(
        JSON.stringify({ error: "Persistência falhou", details: upsertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, club: clubName, data: payload }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[orchestration] exceção:", err);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO — REGRAS DE BLINDAGEM IMPLEMENTADAS]
 * ───────────────────────────────────────────────────────────────────
 * 1. CORS preflight tratado (OPTIONS → 200 ok).
 * 2. Validação de input: `club_name` obrigatório, string, mín. 2 chars.
 * 3. Modularização rígida:
 *      • fetchTechnicalData  → API-Football (ID + escudo + localização)
 *      • investigateClubWithAI → Gemini 2.5 Flash + Google Search Tool
 *      • Orquestração principal (Deno.serve)
 * 4. Cabresto de prompt:
 *      • System instruction força JSON puro (sem markdown).
 *      • Busca cruzada obrigatória (Wikipedia, OGOL, Site Oficial, CBF).
 *      • Hierarquia de divisões BR (Série A→D ou Estadual 1ª→5ª).
 *      • Hierarquia internacional (1ª divisão nacional → inferiores).
 *      • Regra anti-borda (ignora contornos de escudo/estrelas).
 *      • Bicolor → terciária/quarta = NULL.
 *      • Tricolor → quarta = NULL.
 *      • Quadricolor → 4 cores obrigatórias (ex.: Brusque-SC).
 *      • Feminino validado em OGOL ou Site Oficial.
 * 5. Normalização pós-IA:
 *      • HEX maiúsculo, prefixo "#" garantido.
 *      • "null"/vazio → null real.
 *      • Defaults defensivos (#000000 / #FFFFFF) se cor faltar.
 * 6. Persistência via UPSERT em `clubes_cache` (onConflict: "nome").
 * 7. Service Role Key apenas server-side (nunca exposta ao cliente).
 * 8. Logs com prefixo de módulo para rastreio em Supabase Logs.
 * 9. Tratamento de erros tipado (`err instanceof Error`).
 * 10. Temperatura baixa (0.2) para reduzir alucinação.
 * ═══════════════════════════════════════════════════════════════════
 */
