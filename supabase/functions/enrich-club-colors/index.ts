/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO AUTOMÁTICO DE CLUBES (AI DATA MINING)
 * [STATUS]: PRODUÇÃO — VERSÃO 76.0 (FULL SYNC + TECHNICAL MAPPING)
 * [DESCRIÇÃO]:
 * - Integração Total: API Football (Dados Técnicos) + Gemini 2.5 Flash (IA).
 * - Google Search Grounding: Busca obrigatória na Wikipedia para cores de tecido.
 * - Mapeamento Completo: Preenchimento de estádio, fundação, cidade e país.
 * - Suporte Quadricolor: Persistência da cor_quarta.
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: UTILITÁRIOS E LIMPEZA
   ═══════════════════════════════════════════════════════════ */
function cleanResponse(text: string): string {
  return text.replace(/```json|```/g, "").trim();
}

async function fetchTechnicalData(club_name: string, api_id: string | null, apiKey: string) {
  try {
    const url = api_id
      ? `https://v3.football.api-sports.io/teams?id=${api_id}`
      : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`;

    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    const json = await res.json();
    return json.response?.[0] || null;
  } catch (e) {
    console.error("[TÉCNICO]: Falha na API Football", e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: INVESTIGAÇÃO IA (WIKIPEDIA GROUNDING)
   ═══════════════════════════════════════════════════════════ */
async function investigateClubWithAI(club_name: string, geminiKey: string) {
  const CURRENT_DATE = "Abril de 2026";
  const systemPrompt =
    "Você é um auditor sênior de branding de futebol. Sua fonte absoluta de verdade é a Wikipedia. Responda estritamente em JSON puro, sem comentários.";

  const userPrompt = `
  Investigue o clube "${club_name}" com foco total na temporada de ${CURRENT_DATE}.
  
  REGRAS DE CORES (IDENTIDADE DE TECIDO):
  1. IGNORE cores que aparecem apenas no contorno do escudo, bordas pretas de segurança ou dourado de estrelas.
  2. CLASSIFICAÇÃO RÍGIDA:
     - BICOLOR: cor_terciaria e cor_quarta DEVEM ser null.
     - TRICOLOR: cor_quarta DEVE ser null.
     - QUADRICOLOR (Brusque): Amarelo, Verde, Vermelho e Branco (Obrigatórios).
  
  REGRAS DE NEGÓCIO:
  3. DIVISÃO 2026: Verifique a série nacional (A, B, C ou D) em Abril/2026.
  4. FEMININO: Verifique se há time profissional ou base federada ativa em 2026.
  5. MASCOTE: Nome oficial histórico.

  RETORNE APENAS JSON: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX ou null", "cor_quarta": "#HEX ou null", "mascote": "NOME", "tem_feminino": boolean, "division": "Série X"}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    },
  );

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(cleanResponse(text)) : null;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: ORQUESTRAÇÃO E PERSISTÊNCIA
   ═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const footballKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[LOG]: Sincronizando dados para ${club_name}...`);

    // 1. Dados Técnicos (API Football)
    const tech = await fetchTechnicalData(club_name, api_id, footballKey);

    // 2. Dados de Inteligência (Gemini Search)
    const ai = await investigateClubWithAI(club_name, geminiKey);
    if (!ai) throw new Error("IA falhou na investigação");

    // 3. Montagem do Payload (Mapeamento Completo)
    const payload = {
      nome: club_name,
      api_id: tech?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: tech?.team?.logo || null,
      fundado: tech?.team?.founded || null,
      cidade: tech?.venue?.city || tech?.team?.country || "Brasil",
      pais: tech?.team?.country || "Brasil",
      estadio_nome: tech?.venue?.name || null,
      estadio_cidade: tech?.venue?.city || null,
      estadio_capacidade: tech?.venue?.capacity || null,
      division: ai.division,
      mascote: ai.mascote,
      tem_feminino: ai.tem_feminino,
      cor_primaria: ai.cor_primaria,
      cor_secundaria: ai.cor_secundaria,
      cor_terciaria: ai.cor_terciaria,
      cor_quarta: ai.cor_quarta,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error: upsertError } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, club: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[CRITICAL]:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
