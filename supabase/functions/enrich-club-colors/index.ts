/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO DE CLUBES (STABLE FINAL)
 * [STATUS]: PRODUÇÃO — VERSÃO 78.0 (FIX: JSON PARSING & MAPPING)
 * [DESCRIÇÃO]:
 * - Correção definitiva do erro de parsing do Mascote.
 * - Mapeamento técnico completo: Fundação, Estádio e Capacidade.
 * - Inteligência Gemini 2.5 Flash com Grounding (Wikipedia-First).
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Limpa a resposta da IA para garantir que seja um JSON válido.
 * Remove blocos de código markdown (```json ... ```) se existirem.
 */
function sanitizeJson(text: string): string {
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

    console.log(`[STABLE SYNC]: Investigando ${club_name}...`);

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 1: DADOS TÉCNICOS (API FOOTBALL)
       ═══════════════════════════════════════════════════════════ */
    let teamInfo: any = null;
    let division = "Série Não Identificada";

    const teamRes = await fetch(
      api_id
        ? `https://v3.football.api-sports.io/teams?id=${api_id}`
        : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`,
      { headers: { "x-apisports-key": apiKeyFootball } },
    );
    const teamJson = await teamRes.json();
    teamInfo = teamJson.response?.[0];

    if (teamInfo?.team?.id) {
      const leagueRes = await fetch(`https://v3.football.api-sports.io/leagues?team=${teamInfo.team.id}&current=true`, {
        headers: { "x-apisports-key": apiKeyFootball },
      });
      const leagueJson = await leagueRes.json();
      const leagues = leagueJson.response || [];

      const tiers = ["Série A", "Série B", "Série C", "Série D", "Brasileirão", "Premier League", "La Liga"];
      const mainLeague = leagues.find((l: any) => tiers.some((tier) => l.league.name.includes(tier))) || leagues[0];
      if (mainLeague) division = mainLeague.league.name;
    }

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 2: INTELIGÊNCIA IA (GEMINI 2.5 FLASH + SEARCH)
       ═══════════════════════════════════════════════════════════ */
    let aiData = {
      cor_primaria: "#000000",
      cor_secundaria: "#FFFFFF",
      cor_terciaria: null as string | null,
      cor_quarta: null as string | null,
      mascote: "Não Identificado",
      tem_feminino: false,
    };

    if (geminiKey) {
      const prompt = `Investigue o clube "${club_name}". 
      REGRAS: 
      1. Cores do TECIDO da camisa titular na Wikipedia. Ignore contornos de escudo.
      2. Vila Nova-GO: Vermelho e Branco (Bicolor).
      3. Brusque-SC: Amarelo, Verde, Vermelho, Branco (Quadricolor).
      4. Verifique se há time feminino ativo (profissional/base).
      
      Retorne APENAS um JSON puro: 
      {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX ou null", "cor_quarta": "#HEX ou null", "mascote": "NOME", "tem_feminino": boolean}`;

      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
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
        try {
          const parsed = JSON.parse(sanitizeJson(rawText));
          aiData = { ...aiData, ...parsed };
        } catch (parseError) {
          console.error("[PARSE ERROR]: Falha ao processar JSON da IA", parseError);
        }
      }
    }

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 3: PERSISTÊNCIA (MAPEAMENTO TÉCNICO COMPLETO)
       ═══════════════════════════════════════════════════════════ */
    const payload = {
      nome: club_name,
      api_id: teamInfo?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: teamInfo?.team?.logo || null,
      fundado: teamInfo?.team?.founded || null,
      cidade: teamInfo?.venue?.city || teamInfo?.team?.country || "Brasil",
      pais: teamInfo?.team?.country || "Brasil",
      estadio_nome: teamInfo?.venue?.name || null,
      estadio_cidade: teamInfo?.venue?.city || null,
      estadio_capacidade: teamInfo?.venue?.capacity || null,
      division: division,
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
