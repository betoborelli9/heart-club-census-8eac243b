/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO AUTOMÁTICO DE CLUBES (AI DATA MINING)
 * [STATUS]: PRODUÇÃO — VERSÃO 75.0 (WIKIPEDIA-FIRST + GROUNDING)
 * [CONTEXTO]: Extração de cores de tecido, divisões 2026 e futebol feminino.
 * [DESCRIÇÃO]:
 * - Google Search Grounding: Busca obrigatória na Wikipedia e sites oficiais.
 * - Jersey Design: Veto de cores de contorno (Ex: Vila Nova = Bicolor).
 * - Suporte Quadricolor: Preenchimento da coluna cor_quarta (Ex: Brusque).
 * - Hierarquia 2026: Prioridade Séries A, B, C e D em Abril/2026.
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
  // Remove markdown blocks if the AI includes them despite instructions
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
    "Você é um auditor sênior de branding de futebol brasileiro e mundial. Sua fonte absoluta de verdade é a Wikipedia. Responda estritamente em JSON puro, sem comentários.";

  const userPrompt = `
  Investigue o clube "${club_name}" com foco total na temporada de ${CURRENT_DATE}.
  
  REGRAS DE CORES (IDENTIDADE DE TECIDO):
  1. IGNORE cores que aparecem apenas no contorno do escudo, bordas pretas de segurança ou dourado de estrelas.
  2. CLASSIFICAÇÃO RÍGIDA:
     - BICOLOR (Vila Nova, Palmeiras, Real Madrid): cor_terciaria e cor_quarta DEVEM ser null.
     - TRICOLOR (São Paulo, Santa Cruz, Fluminense): cor_quarta DEVE ser null.
     - QUADRICOLOR (Brusque): Amarelo, Verde, Vermelho e Branco (Obrigatórios).
  3. COR_PRIMARIA: Deve ser a cor identitária de força (Vila=Vermelho, Palmeiras=Verde). JAMAIS use Preto se o clube não for Alvinegro.
  
  REGRAS DE NEGÓCIO:
  4. DIVISÃO 2026: Verifique a série nacional (A, B, C ou D) em Abril/2026. Se não houver vaga nacional, indique a divisão estadual ativa.
  5. FEMININO: Verifique no OGOL/Wikipedia/Site Oficial se há time profissional ou base federada ativa em 2026.
  6. MASCOTE: Nome oficial histórico.

  RETORNE APENAS JSON: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX ou null", "cor_quarta": "#HEX ou null", "mascote": "NOME", "tem_feminino": boolean, "division": "Série X"}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }], // Grounding ativo para Wikipedia real
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    },
  );

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(cleanResponse(text)) : null;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: SERVIÇO PRINCIPAL (ORQUESTRAÇÃO)
   ═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const footballKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[ORQUESTRAÇÃO 75.0]: Iniciando investigação para ${club_name}...`);

    // 1. Busca Dados Técnicos na API-Sports (Logo/ID oficial)
    const technical = await fetchTechnicalData(club_name, api_id, footballKey);

    // 2. Investigação IA profunda com Wikipedia Grounding (Cores/Divisão/Mascote)
    const aiData = await investigateClubWithAI(club_name, geminiKey);

    if (!aiData) throw new Error("IA falhou na investigação");

    // 3. Persistência de Dados (Upsert)
    const payload = {
      nome: club_name,
      api_id: technical?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: technical?.team?.logo || null,
      division: aiData.division,
      mascote: aiData.mascote,
      tem_feminino: aiData.tem_feminino,
      cor_primaria: aiData.cor_primaria,
      cor_secundaria: aiData.cor_secundaria,
      cor_terciaria: aiData.cor_terciaria,
      cor_quarta: aiData.cor_quarta, // Suporte para Quadricolores como o Brusque
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
    console.error("[ERRO CRÍTICO]:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * VERSÃO: 75.0
 * MODIFICAÇÕES:
 * - Upgrade para Gemini 2.5 Flash + Google Search Grounding.
 * - Wikipedia-First: Prompt força consulta textual para evitar erros cromáticos de escudo.
 * - Veto de Contorno: Regra rígida para impedir cor preta de borda no Vila Nova.
 * - Suporte Quadricolor: Persistência garantida para a coluna 'cor_quarta'.
 */
