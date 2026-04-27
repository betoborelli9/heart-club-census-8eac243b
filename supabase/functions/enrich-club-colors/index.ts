/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO DE CLUBES (STABLE FINAL)
 * [STATUS]: PRODUÇÃO — VERSÃO 80.0 (FIX: TOTAL MAPPING & AI SCHEMA)
 * [DESCRIÇÃO]:
 * - Mapeamento técnico exato da API Football (Fundação, Estádio, Capacidade).
 * - Inteligência Gemini 2.5 Flash com Schema JSON rigoroso.
 * - Wikipedia-First Grounding para cores de tecido e mascote.
 * - Veto de cores de contorno de escudo (Vila Nova Fix).
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Limpa e valida o JSON retornado pela IA.
 */
function sanitizeJson(text: string): any {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("[ERRO_SANITIZE]: Falha ao parsear JSON da IA", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const apiKeyFootball = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[SYNC 80.0]: Investigando ${club_name}...`);

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 1: DADOS TÉCNICOS (API FOOTBALL)
       ═══════════════════════════════════════════════════════════ */
    let teamInfo: any = null;
    let division = "Série Não Identificada";

    const teamUrl = api_id
      ? `https://v3.football.api-sports.io/teams?id=${api_id}`
      : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`;

    const teamRes = await fetch(teamUrl, { headers: { "x-apisports-key": apiKeyFootball } });
    const teamJson = await teamRes.json();
    teamInfo = teamJson.response?.[0];

    // Busca Divisão Atual/2026
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
        MÓDULO 2: INTELIGÊNCIA IA (GEMINI 2.5 FLASH + GROUNDING)
       ═══════════════════════════════════════════════════════════ */
    let aiData: any = {
      cor_primaria: "#000000",
      cor_secundaria: "#FFFFFF",
      cor_terciaria: null,
      cor_quarta: null,
      mascote: "Não Identificado",
      tem_feminino: false,
    };

    if (geminiKey) {
      const prompt = `Investigue o clube "${club_name}". Use Wikipedia e Search.
      REGRAS: 
      1. CORES: Use as cores do TECIDO titular. Vila Nova = Vermelho/Branco. Brusque = Quadricolor.
      2. VETO: Ignore contornos de escudo e estrelas.
      3. FEMININO: Verifique se há time profissional ativo em 2026.
      4. MASCOTE: Nome oficial.
      Retorne APENAS o JSON.`;

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
              responseSchema: {
                type: "OBJECT",
                properties: {
                  cor_primaria: { type: "STRING" },
                  cor_secundaria: { type: "STRING" },
                  cor_terciaria: { type: "STRING" },
                  cor_quarta: { type: "STRING" },
                  mascote: { type: "STRING" },
                  tem_feminino: { type: "BOOLEAN" },
                },
              },
            },
          }),
        },
      );

      const gJson = await gRes.json();
      const rawText = gJson.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = sanitizeJson(rawText);
      if (parsed) aiData = { ...aiData, ...parsed };
    }

    /* ═══════════════════════════════════════════════════════════
        MÓDULO 3: PERSISTÊNCIA (MAPEAMENTO RIGOROSO DE COLUNAS)
       ═══════════════════════════════════════════════════════════ */
    const payload = {
      nome: club_name,
      api_id: teamInfo?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: teamInfo?.team?.logo || null,
      fundado: teamInfo?.team?.founded || null, // API FOOTBALL
      cidade: teamInfo?.venue?.city || teamInfo?.team?.country || "Brasil", // API FOOTBALL
      pais: teamInfo?.team?.country || "Brasil", // API FOOTBALL
      estadio_nome: teamInfo?.venue?.name || null, // API FOOTBALL
      estadio_cidade: teamInfo?.venue?.city || null, // API FOOTBALL
      estadio_capacidade: teamInfo?.venue?.capacity || null, // API FOOTBALL
      division: division,
      mascote: aiData.mascote,
      tem_feminino: aiData.tem_feminino,
      cor_primaria: aiData.cor_primaria,
      cor_secundaria: aiData.cor_secundaria,
      cor_terciaria: aiData.cor_terciaria === "null" ? null : aiData.cor_terciaria,
      cor_quarta: aiData.cor_quarta === "null" ? null : aiData.cor_quarta,
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
 * Versão: 80.0
 * - Mapeamento: founded, venue.name, venue.city e venue.capacity mapeados diretamente da API Football.
 * - IA: Forçado uso de responseSchema para evitar alucinações de texto e garantir Mascote limpo.
 * - Fix: Tratamento de strings "null" vindas da IA para garantir persistência correta no banco.
 */
