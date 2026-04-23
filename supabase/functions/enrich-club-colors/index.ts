/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 50.0 (BRAZIL NATIONAL PRIORITY)
 * [CONTEXTO]: Enriquecimento de dados com hierarquia de ligas (Nacional > Estadual).
 * [DESCRIÇÃO]: Prioriza Séries A, B, C e D do Brasileirão. Caso não encontre, usa a liga atual disponível.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limpa Markdown e garante que o JSON seja processável
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

    console.log(`[LOG]: Investigando ${club_name}...`);

    // 1. BUSCA TÉCNICA (API FOOTBALL)
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

    // Lógica de Hierarquia de Liga (Divisão)
    if (teamInfo?.team?.id) {
      const leagueRes = await fetch(`https://v3.football.api-sports.io/leagues?team=${teamInfo.team.id}&current=true`, {
        headers: { "x-apisports-key": apiKeyFootball },
      });
      const leagueJson = await leagueRes.json();
      const leagues = leagueJson.response || [];

      // Filtra prioritariamente ligas brasileiras nacionais (A, B, C e D)
      const tiers = ["Série A", "Série B", "Série C", "Série D", "Brasileirão"];

      const nationalLeague = leagues.find(
        (l: any) => l.league.country === "Brazil" && tiers.some((tier) => l.league.name.includes(tier)),
      );

      // Se achou Nacional, usa. Se não, usa a primeira disponível (Estadual)
      const selectedLeague = nationalLeague || leagues.find((l: any) => l.league.type === "League") || leagues[0];

      if (selectedLeague) {
        division = selectedLeague.league.name;
      }
    }

    // 2. BUSCA CRIATIVA (GEMINI)
    let aiData = {
      cor_primaria: "#ff6200",
      cor_secundaria: "#1a1a1a",
      cor_terciaria: "#ffffff",
      mascote: "Não Identificado",
    };

    if (geminiKey) {
      try {
        const prompt = `Atue como Historiador de Futebol Sênior. Para o clube "${club_name}", retorne EXCLUSIVAMENTE este JSON: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX", "mascote": "NOME"}. 
        REGRA: O campo "mascote" deve ser o animal ou personagem oficial. Se não houver registro oficial, use a alcunha do mascote mais famosa. Nunca retorne vazio.`;

        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
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
          if (parsed.mascote && parsed.mascote.trim().length > 2) {
            aiData = { ...aiData, ...parsed };
          }
        }
      } catch (e) {
        console.error("[GEMINI ERROR]:", e);
      }
    }

    // 3. SALVAMENTO FINAL (UPSERT)
    const payload = {
      nome: club_name,
      nome_curto: teamInfo?.team?.code || club_name.substring(0, 3).toUpperCase(),
      api_id: teamInfo?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: teamInfo?.team?.logo || null,
      fundado: teamInfo?.team?.founded || null,
      cidade: teamInfo?.venue?.city || "Brasil",
      pais: teamInfo?.team?.country || "Brasil",
      estadio_nome: teamInfo?.venue?.name || null,
      estadio_cidade: teamInfo?.venue?.city || null,
      estadio_capacidade: teamInfo?.venue?.capacity || null,
      division: division,
      mascote: aiData.mascote,
      cor_primaria: aiData.cor_primaria,
      cor_secundaria: aiData.cor_secundaria,
      cor_terciaria: aiData.cor_terciaria,
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
 * Versão: 45.0
 * - Inclusão de Alcunha (apelido) e Mascote via Gemini.
 * - Limpeza de Markdown robusta para evitar erro 500.
 * - Sincronizado com colunas TEXT do banco de dados.
 */
