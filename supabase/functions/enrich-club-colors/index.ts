/**

 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts

 * [STATUS]: PRODUÇÃO - VERSÃO 58.0 (HIERARQUIA VISUAL AVANÇADA + FEMININO)

 * [CONTEXTO]: Enriquecimento de dados com foco em Alfaiataria Visual (Jersey Design).

 * [DESCRIÇÃO]:

 * - cor_primaria: Cor de fundo/base (Geralmente a mais escura/preta para contraste do escudo).

 * - cor_secundaria: Cor predominante que encerra o banner (A "cor da camisa").

 * - cor_terciaria: Cor de detalhe/faixa diagonal.

 * - tem_feminino: Identificação obrigatória de departamento profissional ativo.

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

    console.log(`[LOG]: Investigando design de ${club_name}...`);

    /* ═══════════════════════════════════════════════════════════

        MÓDULO 1: BUSCA TÉCNICA (API FOOTBALL)

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

      const tiers = ["Série A", "Série B", "Série C", "Série D", "Brasileirão"];

      const nationalLeague = leagues.find(
        (l: any) => l.league.country === "Brazil" && tiers.some((tier) => l.league.name.includes(tier)),
      );

      const mainLeague = nationalLeague || leagues.find((l: any) => l.league.type === "League") || leagues[0];

      if (mainLeague) division = mainLeague.league.name;
    }

    /* ═══════════════════════════════════════════════════════════

        MÓDULO 2: ENGENHARIA DE PROMPT (BRANDING & FEMININO)

       ═══════════════════════════════════════════════════════════ */

    let aiData = {
      cor_primaria: "#000000",

      cor_secundaria: "#ff0000",

      cor_terciaria: "#ffffff",

      mascote: "Não Identificado",

      tem_feminino: false,
    };

    if (geminiKey) {
      try {
        const prompt = `Atue como Designer de Branding Esportivo e Historiador. 

        Para o clube "${club_name}", analise as cores oficiais e retorne EXCLUSIVAMENTE um JSON puro.

        

        REGRAS DE MAPEAMENTO PARA O BANNER:

        1. "cor_primaria": Deve ser a cor de FUNDO do escudo (Lado esquerdo). Para clubes como São Paulo, Santa Cruz ou Flamengo, deve ser PRETO (#000000) para dar contraste ao círculo branco. Para bicolores como Palmeiras ou Vila Nova, pode ser a cor principal (Verde ou Vermelho).

        2. "cor_secundaria": Deve ser a cor que FINALIZA o banner no lado direito. É a cor mais forte da camisa (Ex: Vermelho para Santa Cruz/Vila Nova, Verde para Palmeiras).

        3. "cor_terciaria": Cor de contraste para as faixas diagonais centrais (Geralmente Branco #FFFFFF).

        4. "tem_feminino": Verifique se o clube possui time de futebol feminino profissional ou sub-20 ativo em competições oficiais (true/false).

        5. "mascote": Nome do mascote oficial.



        FORMATO EXIGIDO: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX", "mascote": "NOME", "tem_feminino": boolean}`;

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

      tem_feminino: aiData.tem_feminino,

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

 * Versão: 58.0

 * - Lógica de Cores: Primária (Início/Contraste), Secundária (Fim/Predominante), Terciária (Meio/Faixas).

 * - Identificação de Futebol Feminino integrada ao fluxo principal.

 * - JSON parse blindado com cleaner de markdown.

 */
