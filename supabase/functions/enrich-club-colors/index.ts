/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: INTELLIGENCE & DATA ENRICHMENT
 * [STATUS]: PRODUÇÃO - VERSÃO 68.0 (SEARCH GROUNDING + JSON NATIVE MODE)
 * [DESCRIÇÃO]:
 * - Mapeamento exaustivo de cores (Bicolor, Tricolor, Quadricolor).
 * - Pesquisa real em Wikipedia, OGOL e Sites Oficiais via Google Search Grounding.
 * - Divisões 2026: Prioridade absoluta Séries A, B, C e D.
 * - Suporte à 'cor_quarta' e validação rigorosa de Futebol Feminino.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const apiKeyFootball = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[LOG]: Investigação Ultra-Sênior 68.0: ${club_name}...`);

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 1: BUSCA TÉCNICA (API FOOTBALL - FALLBACK ESCUDO)
       ═══════════════════════════════════════════════════════════ */
    let apiEscudo = null;
    let apiIdFinal = api_id;
    try {
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
    } catch (e) {
      console.error("[API FOOTBALL ERROR]:", e);
    }

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 2: INVESTIGAÇÃO GEMINI (SEARCH GROUNDING)
       ═══════════════════════════════════════════════════════════ */
    let aiData = {
      cor_primaria: "#000000",
      cor_secundaria: "#ffffff",
      cor_terciaria: null,
      cor_quarta: null,
      mascote: "Não Identificado",
      tem_feminino: false,
      division: "Sem Divisão",
    };

    if (geminiKey) {
      const prompt = `Investigue o clube brasileiro "${club_name}" para a temporada 2026.
      
      FONTES OBRIGATÓRIAS: Wikipedia, OGOL, Site Oficial e CBF.
      
      REGRAS DE DADOS:
      1. DIVISÃO 2026: Verifique a divisão NACIONAL (Série A, B, C ou D) em 2026. Se não houver nacional, indique a divisão regional/estadual oficial.
      2. CORES DE TECIDO (JERSEY): Identifique as cores REAIS do uniforme 1 (Home).
         - Se BICOLOR (ex: Palmeiras, Vila Nova, Santos): cor_terciaria e cor_quarta DEVEM ser null.
         - Se TRICOLOR (ex: São Paulo, Santa Cruz, Fluminense): cor_quarta DEVE ser null.
         - Se QUADRICOLOR (ex: Brusque): Identifique obrigatoriamente Amarelo, Verde, Vermelho e Branco.
      3. MAPEAMENTO: cor_primaria (cor de borda/fundo forte), cor_secundaria (cor predominante).
      4. FEMININO: Verifique no OGOL ou Wikipedia se o clube possui time feminino profissional ou de base sub-20 ativo e federado em 2026.
      5. MASCOTE: Nome do mascote oficial histórico.

      SAÍDA OBRIGATÓRIA: JSON puro sem comentários ou markdown.`;

      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }], // BUSCA REAL ATIVA
            generationConfig: {
              responseMimeType: "application/json", // MODO JSON NATIVO - ELIMINA ERRO DO TIGRE
              temperature: 0.1,
            },
          }),
        },
      );

      const gJson = await gRes.json();
      const rawText = gJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        aiData = JSON.parse(rawText.trim());
      }
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
 * Versão: 68.0
 * - JSON Mode: Força a IA a retornar dados limpos, eliminando falhas de parsing no mascote.
 * - Pesquisa Cruzada: Instruído a usar Wikipedia e OGOL para validar femininos e divisões.
 * - Brusque Fix: Regra quadricolor blindada com proibição de alucinação de cores.
 * - Suporte cor_quarta: Payload sincronizado com a nova coluna do banco.
 */
