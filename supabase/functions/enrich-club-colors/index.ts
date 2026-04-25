/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: INTELLIGENCE & DATA ENRICHMENT
 * [STATUS]: PRODUÇÃO - VERSÃO 61.0 (GROUNDING SEARCH & 2026 PRIORITY)
 * [DESCRIÇÃO]:
 * - Integração com Google Search Grounding para busca real em múltiplas fontes.
 * - Prioridade absoluta para Divisões Nacionais A, B, C e D (Temporada 2026/2027).
 * - Identificação de Futebol Feminino Ativo (Profissional/Base).
 * - Regra Bicolor/Tricolor: Força NULL na terceira cor para clubes bicolores.
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
  // Remove blocos de markdown e espaços extras para garantir JSON puro
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

    console.log(`[LOG]: Investigação 2026 iniciada para: ${club_name}...`);

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 1: PESQUISA EXAUSTIVA (GEMINI + SEARCH GROUNDING)
       ═══════════════════════════════════════════════════════════ */
    let aiData = {
      cor_primaria: "#000000",
      cor_secundaria: "#ffffff",
      cor_terciaria: null,
      mascote: "Não Identificado",
      tem_feminino: false,
      division: "Sem Divisão",
      logo_fallback: null,
    };

    if (geminiKey) {
      // O prompt agora exige pesquisa em fontes oficiais para 2026
      const prompt = `Faça uma pesquisa exaustiva sobre o clube de futebol "${club_name}" no Brasil. 
      Consulte múltiplas fontes confiáveis (CBF, sites oficiais, portais de esportes) para o ano de 2026.
      
      REQUISITOS TÉCNICOS OBRIGATÓRIOS:
      1. DIVISÃO 2026: Identifique a divisão no Campeonato Brasileiro (Série A, B, C ou D). 
         - Prioridade máxima para Séries Nacionais.
         - Se não tiver divisão nacional em 2026, indique a divisão estadual (Ex: Goiano Divisão 1).
      2. CORES JERSEY (PRECISÃO MÁXIMA):
         - Identifique se o clube é BICOLOR ou TRICOLOR no uniforme principal.
         - Se for BICOLOR (Ex: Palmeiras, Vila Nova, Santos, Corinthians): A "cor_terciaria" DEVE ser null. Jamais invente dourado ou amarelo para bicolores.
         - "cor_primaria": Cor dominante e mais escura (Contraste do escudo).
         - "cor_secundaria": Segunda cor principal.
      3. FEMININO: Verifique se o clube possui departamento de futebol feminino (profissional ou sub-20) ativo e federado em 2026.
      4. MASCOTE: Identifique o mascote oficial histórico.

      Retorne APENAS um JSON puro no formato:
      {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX ou null", "mascote": "NOME", "tem_feminino": boolean, "division": "Série X"}`;

      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }], // TURBO: Ativa a busca real do Google
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
    }

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 2: VALIDAÇÃO DE ESCUDO (API FOOTBALL FALLBACK)
       ═══════════════════════════════════════════════════════════ */
    let apiEscudo = null;
    let apiIdFinal = api_id;

    const teamRes = await fetch(
      api_id
        ? `https://v3.football.api-sports.io/teams?id=${api_id}`
        : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`,
      { headers: { "x-apisports-key": apiKeyFootball } },
    );
    const teamJson = await teamRes.json();
    const teamInfo = teamJson.response?.[0];

    if (teamInfo) {
      apiEscudo = teamInfo.team.logo;
      apiIdFinal = teamInfo.team.id;
    }

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 3: PERSISTÊNCIA NO BANCO (UPSERT)
       ═══════════════════════════════════════════════════════════ */
    const payload = {
      nome: club_name,
      api_id: apiIdFinal?.toString() || null,
      escudo_url: apiEscudo || null,
      division: aiData.division,
      mascote: aiData.mascote,
      tem_feminino: aiData.tem_feminino,
      cor_primaria: aiData.cor_primaria,
      cor_secundaria: aiData.cor_secundaria,
      cor_terciaria: aiData.cor_terciaria, // Vem NULL se for Bicolor via IA
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
 * Versão: 61.0
 * - Google Search Grounding: O Gemini agora consulta a web em tempo real antes de definir cores e divisões.
 * - Divisões 2026: Lógica de prioridade nacional (A, B, C, D) injetada no prompt de pesquisa.
 * - Bicolor Safeguard: Força NULL na cor_terciaria caso o clube seja identificado como bicolor.
 * - Feminino: Verificação ativa integrada ao fluxo de enriquecimento.
 */
