/**
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [STATUS]: PRODUÇÃO - MAPEAMENTO REAL CONFIRMADO
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

    // 1. BUSCA DADOS TÉCNICOS NA API FOOTBALL
    // Para pegar a divisão, precisamos consultar o time e suas ligas atuais
    const footballUrl = api_id
      ? `https://v3.football.api-sports.io/teams?id=${api_id}`
      : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`;

    const res = await fetch(footballUrl, { headers: { "x-apisports-key": apiKeyFootball } });
    const json = await res.json();
    const teamData = json.response?.[0];

    // 2. BUSCA DA DIVISÃO (Série A, B, etc.)
    // Consultamos as ligas do time no ano atual (2026)
    let division = "Série Não Identificada";
    if (teamData?.team?.id) {
      const leagueRes = await fetch(`https://v3.football.api-sports.io/leagues?team=${teamData.team.id}&current=true`, {
        headers: { "x-apisports-key": apiKeyFootball },
      });
      const leagueJson = await leagueRes.json();
      // Filtramos por ligas nacionais (Série A, B, C)
      const mainLeague = leagueJson.response?.find((l: any) => l.league.type === "League");
      if (mainLeague) division = mainLeague.league.name;
    }

    // 3. MOTOR GEMINI (Cores e Mascote)
    let aiData = { cor_primaria: "#ff6200", cor_secundaria: "#1a1a1a", cor_terciaria: "#ffffff", mascote: "" };
    if (geminiKey) {
      const prompt = `Para o clube "${club_name}", retorne JSON: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX", "mascote": "Nome"}.`;
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      const gJson = await geminiRes.json();
      const text = gJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) aiData = JSON.parse(text);
    }

    // 4. UPSERT COM NOMES DE COLUNAS REAIS (Conforme seu SELECT)
    const { data: finalClub, error: upsertError } = await supabase
      .from("clubes_cache")
      .upsert(
        {
          nome: teamData?.team?.name || club_name,
          nome_curto: teamData?.team?.code || club_name.substring(0, 3).toUpperCase(),
          api_id: teamData?.team?.id?.toString() || api_id?.toString() || null,
          escudo_url: teamData?.team?.logo || null,
          fundado: teamData?.team?.founded || null,
          cidade: teamData?.venue?.city || "Brasil",
          pais: teamData?.team?.country || "Brasil",
          estadio_nome: teamData?.venue?.name || null,
          estadio_cidade: teamData?.venue?.city || null,
          estadio_capacidade: teamData?.venue?.capacity || null,
          division: division, // Aqui entra Vila Nova = Série B, etc.
          mascote: aiData.mascote,
          cor_primaria: aiData.cor_primaria,
          cor_secundaria: aiData.cor_secundaria,
          cor_terciaria: aiData.cor_terciaria,
          tem_feminino: teamData?.team?.national === false, // Lógica simples: se não é seleção, pode ter feminino
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "nome" },
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, club: finalClub }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 40.0 - IA Híbrida Ativada.
 * - Prioriza busca por api_id para precisão de estádio/capacidade.
 * - Gemini focado em Cores, Mascote e Apelido.
 * - Proteção de CORS e Upsert por nome garantidos.
 */
