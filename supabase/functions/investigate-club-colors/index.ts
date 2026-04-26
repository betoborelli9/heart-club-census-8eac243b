/**
 * [CAMINHO]: supabase/functions/investigate-club-colors/index.ts
 * [MÓDULO]: Investigação Google + Gemini para cores oficiais de clubes
 * [STATUS]: PRODUÇÃO — v5.1 CORES APENAS
 * [VERSÃO]: 5.1.0
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ═══════════════════════════════════════════════════════════
   IMPORTS / CORS / TIPOS
═══════════════════════════════════════════════════════════ */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ClubIdentity = {
  nome_confirmado: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  estrutura: "BICOLOR" | "TRICOLOR" | "QUADRICOLOR";
  cores: string[];
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ═══════════════════════════════════════════════════════════
   VALIDAÇÃO DE ENTRADA
═══════════════════════════════════════════════════════════ */
const validateClubName = (value: unknown): string => {
  if (typeof value !== "string") throw new Error("clubName obrigatório");
  const clubName = value.trim().replace(/\s+/g, " ");
  if (clubName.length < 2 || clubName.length > 120) {
    throw new Error("clubName inválido");
  }
  return clubName;
};

/* ═══════════════════════════════════════════════════════════
   PROMPT — CONSULTA SIMPLES NO GOOGLE SOMENTE PARA CORES
═══════════════════════════════════════════════════════════ */
const buildPrompt = (clubName: string) => `
Você é a IA de dados esportivos do Heart Club.

Use obrigatoriamente a ferramenta Google Search e responda somente as cores oficiais/tradicionais do clube consultado.

CLUBE CONSULTADO: ${clubName}

PERGUNTAS OBRIGATÓRIAS PARA PESQUISAR NO GOOGLE:
1. "quais são as cores do clube ${clubName}"
2. "${clubName} cores oficiais uniforme futebol"
3. "${clubName} official club colors football"

REGRAS DE CORES:
- Use as cores oficiais/tradicionais do clube e do uniforme principal.
- NÃO use cores que aparecem apenas no contorno do escudo, borda, estrelas, sombras, letras ou detalhes decorativos.
- Se o clube for BICOLOR, retorne exatamente 2 cores: cor_primaria e cor_secundaria.
- Se for TRICOLOR, retorne exatamente 3 cores: cor_primaria, cor_secundaria e cor_terciaria.
- Se for QUADRICOLOR, retorne exatamente 4 cores: cor_primaria, cor_secundaria, cor_terciaria e cor_quarta.
- Se a fonte disser apenas uma cor principal, use branco ou preto somente quando fizer parte real do uniforme/tradição.
- Vila Nova-GO é Vermelho e Branco; NÃO inclua preto do contorno.
- Palmeiras é Verde e Branco.
- Real Madrid é Branco e Dourado.
- Santa Cruz-PE é Vermelho, Preto e Branco.
- Brusque-SC é Amarelo, Verde, Vermelho e Branco.

SAÍDA OBRIGATÓRIA:
Retorne EXCLUSIVAMENTE JSON puro, sem markdown e sem explicação:
{
  "nome_confirmado": "Nome oficial/mais provável do clube",
  "cor_primaria": "#HEX",
  "cor_secundaria": "#HEX",
  "cor_terciaria": "#HEX ou null",
  "cor_quarta": "#HEX ou null"
}
`.trim();

/* ═══════════════════════════════════════════════════════════
   GEMINI + GOOGLE SEARCH
═══════════════════════════════════════════════════════════ */
const fetchTechnicalData = async (clubName: string): Promise<string> => {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(clubName) }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.05,
          topP: 0.2,
          maxOutputTokens: 1200,
        },
      }),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Gemini error", response.status, payload);
    throw new Error(`Gemini ${response.status}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("\n")
    .trim();

  if (!text) throw new Error("Gemini não retornou conteúdo");
  return text;
};

/* ═══════════════════════════════════════════════════════════
   PARSE / NORMALIZAÇÃO / BLINDAGEM
═══════════════════════════════════════════════════════════ */
const extractJson = (text: string): Record<string, unknown> => {
  let clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Resposta da IA sem JSON");
  clean = clean.slice(start, end + 1);

  try {
    return JSON.parse(clean);
  } catch {
    return JSON.parse(clean.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""));
  }
};

const normalizeHex = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const hex = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : null;
};

const dedupeColors = (colors: Array<string | null>): string[] => {
  const seen = new Set<string>();
  return colors.filter((color): color is string => {
    if (!color || seen.has(color)) return false;
    seen.add(color);
    return true;
  });
};

const normalizeIdentity = (raw: Record<string, unknown>, fallbackName: string): ClubIdentity => {
  const cores = dedupeColors([
    normalizeHex(raw.cor_primaria),
    normalizeHex(raw.cor_secundaria),
    normalizeHex(raw.cor_terciaria),
    normalizeHex(raw.cor_quarta),
  ]).slice(0, 4);

  if (cores.length < 2) throw new Error("IA retornou menos de 2 cores válidas");

  const estrutura = cores.length >= 4 ? "QUADRICOLOR" : cores.length === 3 ? "TRICOLOR" : "BICOLOR";

  return {
    nome_confirmado: typeof raw.nome_confirmado === "string" && raw.nome_confirmado.trim()
      ? raw.nome_confirmado.trim()
      : fallbackName,
    cor_primaria: cores[0],
    cor_secundaria: cores[1],
    cor_terciaria: cores[2] || null,
    cor_quarta: cores[3] || null,
    estrutura,
    cores,
  };
};

/* ═══════════════════════════════════════════════════════════
   HANDLER PRINCIPAL
═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const clubName = validateClubName(body.clubName);
    const text = await fetchTechnicalData(clubName);
    const raw = extractJson(text);
    const identity = normalizeIdentity(raw, clubName);

    return jsonResponse(identity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("investigate-club-colors", message);
    const status = message.includes("obrigatório") || message.includes("inválido") ? 400 : 500;
    return jsonResponse({ error: message }, status);
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão 5.0.0:
 * - Remove chamada direta do front para Gemini e usa GEMINI_API_KEY apenas no Edge Runtime.
 * - Usa Google Search nativo do Gemini com perguntas simples: cores, feminino e competições.
 * - Normaliza HEX, remove duplicidade e força 2/3/4 campos conforme BICOLOR/TRICOLOR/QUADRICOLOR.
 * - Aplica veto explícito contra contorno de escudo, estrelas e detalhes decorativos.
 * - Retorna JSON puro compatível com clubes_cache: cor_primaria, cor_secundaria, cor_terciaria, cor_quarta, mascote, tem_feminino e division.
 */