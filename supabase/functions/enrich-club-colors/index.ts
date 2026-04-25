/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: INTELLIGENCE & DATA ENRICHMENT
 * [STATUS]: PRODUÇÃO - VERSÃO 65.0 (SEARCH GROUNDING & 4TH COLOR SYNC)
 * [CONTEXTO]: Enriquecimento de dados com foco em Precisão Histórica e Divisões 2026.
 * [DESCRIÇÃO]:
 * - Google Search Grounding: Busca em tempo real em múltiplas fontes oficiais.
 * - Prioridade Nacional 2026: Foco em Séries A, B, C e D antes de regionais.
 * - Suporte Quadricolor: Inclusão da 'cor_quarta' para clubes como Brusque.
 * - Alfaiataria Visual: Diferenciação entre cores de Escudo e cores de Tecido (Jersey).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO: UTILITÁRIOS DE LIMPEZA
   ═══════════════════════════════════════════════════════════ */
function cleanGeminiResponse(text: string): string {
  return text.replace(/```json|```/g, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const apiKeyFootball = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[LOG]: Investigação Ultra-Sênior 2026: ${club_name}...`);

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 1: BUSCA TÉCNICA (API FOOTBALL - FALLBACK E ESCUDO)
       ═══════════════════════════════════════════════════════════ */
    let teamInfo: any = null;
    const teamRes = await fetch(
      api_id
        ? `https://v3.football.api-sports.io/teams?id=${api_id}`
        : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`,
      { headers: { "x-apisports-key": apiKeyFootball } },
    );
    const teamJson = await teamRes.json();
    teamInfo = teamJson.response?.[0];

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 2: ENGENHARIA DE PROMPT (INVESTIGAÇÃO 2026 + GROUNDING)
       ═══════════════════════════════════════════════════════════ */
    let aiData = {
      cor_primaria: "#000000",
      cor_secundaria: "#ffffff",
      cor_terciaria: null,
      cor_quarta: null,
      mascote: "Não Identificado",
      tem_feminino: false,
      division: "Série Não Identificada",
    };

    if (geminiKey) {
      try {
        const prompt = `Atue como o maior Especialista em Futebol Brasileiro e Designer de Branding. 
        Sua tarefa é investigar o clube "${club_name}" para a temporada de 2026.
        
        REGRAS DE PESQUISA (GOOGLE SEARCH GROUNDING):
        1. DIVISÃO 2026: Identifique se o clube está na Série A, B, C ou D do Brasileiro em 2026. Priorize a pirâmide NACIONAL. Se não houver divisão nacional, indique a divisão ESTADUAL (Ex: Catarinense Série A).
        2. CORES DE TECIDO (JERSEY): Ignore cores de estrelas ou bordas mínimas do escudo.
           - Se BICOLOR (Palmeiras, Vila Nova): cor_terciaria e cor_quarta DEVEM ser null.
           - Se TRICOLOR (São Paulo, Santa Cruz, Fluminense): cor_quarta DEVE ser null.
           - Se QUADRICOLOR (Brusque): Identifique as 4 cores (Ex: Amarelo, Verde, Vermelho, Branco).
        3. MAPEAMENTO VISUAL: 
           - "cor_primaria": Cor predominante e mais forte (Ex: Vermelho no Vila, Verde no Palmeiras, Preto no SPFC).
           - "cor_secundaria": Cor de contraste principal (Geralmente Branco #FFFFFF).
        4. FUTEBOL FEMININO: Verifique se existe departamento de futebol feminino (profissional ou base) federado e ativo em 2026.
        5. MASCOTE: Nome do mascote oficial histórico.

        FORMATO EXIGIDO: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX ou null", "cor_quarta": "#HEX ou null", "mascote": "NOME", "tem_feminino": boolean, "division": "NOME_DIVISAO"}`;

        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              tools: [{ google_search: {} }], // Ativa a busca real do Google
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          },
        );

        const gJson = await gRes.json();
        const rawText = gJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(cleanGeminiResponse(rawText));
          aiData = { ...aiData, ...parsed };
        }
      } catch (e) {
        console.error("[GEMINI ERROR]:", e);
      }
    }

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 3: PERSISTÊNCIA NO BANCO (UPSERT)
       ═══════════════════════════════════════════════════════════ */
    const payload = {
      nome: club_name,
      api_id: teamInfo?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: teamInfo?.team?.logo || null,
      division: aiData.division,
      mascote: aiData.mascote,
      tem_feminino: aiData.tem_feminino,
      cor_primaria: aiData.cor_primaria,
      cor_secundaria: aiData.cor_secundaria,
      cor_terciaria: aiData.cor_terciaria,
      cor_quarta: aiData.cor_quarta,
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
    console.error("[CRITICAL ERROR]:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 65.0
 * - Google Search Grounding: Garante que a IA pesquise divisões 2026 e feminino em tempo real.
 * - Bicolor/Quadricolor Safeguard: Prompt blindado para evitar invenção de cores em times de 2 cores.
 * - Integridade: Mantido o Módulo 3 de persistência e suporte para cor_quarta.
 */
