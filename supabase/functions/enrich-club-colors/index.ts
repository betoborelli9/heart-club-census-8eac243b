/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO ASSERTIVO DE CLUBES (Wikipedia-First)
 * [STATUS]: PRODUÇÃO — VERSÃO 6.0.0 (DATA-SYNC APRIL 2026)
 * [CORREÇÃO]:
 * • Wikipedia como Âncora de Verdade para cores e história.
 * • Calendário: Identifica competição mais importante em ABRIL/2026.
 * • Veto de Emblema: Ignora cores de bordas (ex: preto no Vila Nova).
 * • Quadricolor: Força preenchimento de 4 colunas (ex: Brusque).
 * ═══════════════════════════════════════════════════════════════════
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const CURRENT_DATE = "25 de Abril de 2026";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: UTILITÁRIOS E INTERFACES
   ═══════════════════════════════════════════════════════════ */
interface AIInvestigationRaw {
  clube_confirmado?: string;
  quantidade_cores?: number;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_terciaria?: string | null;
  cor_quarta?: string | null;
  mascote?: string | null;
  tem_feminino?: boolean;
  division?: string | null;
}

function normalizeHex(value: unknown): string | null {
  if (!value || String(value).toLowerCase() === "null") return null;
  const raw = String(value).trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/i.test(withHash) ? withHash.toUpperCase() : null;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: fetchTechnicalData (API Football)
   ═══════════════════════════════════════════════════════════ */
async function fetchTechnicalData(clubName: string) {
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) return { api_id: null, escudo_url: null, pais: "Brasil", cidade: "—" };

  try {
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(clubName)}`, {
      headers: { "x-apisports-key": apiKey },
    });
    const json = await res.json();
    const best = json?.response?.[0];
    return {
      api_id: best?.team?.id ? String(best.team.id) : null,
      escudo_url: best?.team?.logo ?? null,
      pais: best?.team?.country ?? "Brasil",
      cidade: best?.venue?.city ?? "—",
      official_name: best?.team?.name ?? clubName,
    };
  } catch {
    return { api_id: null, escudo_url: null, pais: "Brasil", cidade: "—" };
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: investigateClubWithAI (Wikipedia-First Logic)
   ═══════════════════════════════════════════════════════════ */
async function investigateClubWithAI(clubName: string, technical: any) {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("GEMINI_API_KEY ausente");

  const systemPrompt = `Você é um auditor sênior. Data Atual: ${CURRENT_DATE}. Sua única fonte de verdade para cores é a WIKIPEDIA.`;

  const userPrompt = `
  INVESTIGAÇÃO OBRIGATÓRIA: "${clubName}" (${technical.pais})
  
  1. CORES (FONTE: WIKIPEDIA): 
     - Busque as cores descritas no texto da Wikipedia/Estatuto.
     - VETO: Ignore cores de bordas, contornos de escudo ou estrelas (ex: Vila Nova é estritamente Vermelho e Branco. Ignore preto de contorno).
     - BICOLOR: cor_terciaria/quarta = null.
     - QUADRICOLOR (Brusque): Amarelo, Verde, Vermelho e Branco (obrigatórios).
  
  2. COMPETIÇÃO (ABRIL 2026):
     - Identifique qual campeonato o clube está disputando hoje (${CURRENT_DATE}).
     - Escolha o MAIS IMPORTANTE: Série A > B > C > D > Estadual (Brasil).
     - Se estrangeiro, escolha a Liga Nacional principal.

  3. FEMININO & MASCOTE: Verifique Wikipedia e OGOL para status profissional ativo em 2026.

  RETORNE JSON PURO:
  {
    "clube_confirmado": "Nome",
    "quantidade_cores": 2|3|4,
    "cor_primaria": "#HEX",
    "cor_secundaria": "#HEX",
    "cor_terciaria": "#HEX ou null",
    "cor_quarta": "#HEX ou null",
    "mascote": "Nome",
    "tem_feminino": boolean,
    "division": "Nome do Campeonato"
  }`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    },
  );

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = JSON.parse(text) as AIInvestigationRaw;

  return {
    cor_primaria: normalizeHex(data.cor_primaria) || "#000000",
    cor_secundaria: normalizeHex(data.cor_secundaria) || "#FFFFFF",
    cor_terciaria: data.quantidade_cores && data.quantidade_cores >= 3 ? normalizeHex(data.cor_terciaria) : null,
    cor_quarta: data.quantidade_cores && data.quantidade_cores >= 4 ? normalizeHex(data.cor_quarta) : null,
    mascote: data.mascote || "—",
    tem_feminino: !!data.tem_feminino,
    division: data.division || "Indefinida",
  };
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: ORQUESTRAÇÃO
   ═══════════════════════════════════════════════════════════ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { club_name } = await req.json();
    const technical = await fetchTechnicalData(club_name);
    const ai = await investigateClubWithAI(club_name, technical);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase
      .from("clubes_cache")
      .upsert(
        {
          nome: club_name,
          pais: technical.pais,
          cidade: technical.cidade,
          api_id: technical.api_id,
          escudo_url: technical.escudo_url,
          ...ai,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "nome" },
      )
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

/**
 * [RODAPÉ TÉCNICO — v6.0.0]
 * 1. Wikipedia-First: Prompt forçado para ignorar emblemas e focar no texto descritivo.
 * 2. Calendário 2026: Injetado no prompt para definir a divisão ativa em Abril/2026.
 * 3. Bicolor/Quadricolor: Lógica de fatiamento de colunas baseada na contagem oficial da IA.
 * 4. Grounding: Google Search ativado para validar o futebol feminino no OGOL.
 */
