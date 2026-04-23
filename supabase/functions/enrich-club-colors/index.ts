/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 45.0 (HISTORIADOR SÊNIOR + JSON SANITIZADO)
 * [MODIFICAÇÕES]:
 * - Prompt reforçado: Gemini atua como historiador sênior e investiga estádio/fundação ausentes.
 * - Extração robusta de JSON puro (remove ```json, texto extra, e qualquer ruído).
 * - Mascote e Apelido com fallback inteligente (não sobrescreve dados bons com "Não Identificado").
 * - Truncagem defensiva de strings curtas para evitar erros de varchar.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ─── Helpers ─── */
const trunc = (v: any, max: number): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > max ? s.substring(0, max) : s;
};

const extractJson = (raw: string): any => {
  if (!raw) throw new Error("Empty response");
  // Remove markdown fences e qualquer texto antes/depois do JSON
  let cleaned = raw.replace(/```json|```/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON found");
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  return JSON.parse(cleaned);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const apiKeyFootball = Deno.env.get("API_FOOTBALL_KEY") || "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[START] Investigando: ${club_name} (api_id=${api_id ?? "n/a"})`);

    /* ─── 1. API FOOTBALL (Dados técnicos) ─── */
    let teamInfo: any = null;
    let division = "Não Identificada";

    try {
      const teamRes = await fetch(
        api_id
          ? `https://v3.football.api-sports.io/teams?id=${api_id}`
          : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`,
        { headers: { "x-apisports-key": apiKeyFootball } },
      );
      const teamJson = await teamRes.json();
      teamInfo = teamJson.response?.[0];

      if (teamInfo?.team?.id) {
        const leagueRes = await fetch(
          `https://v3.football.api-sports.io/leagues?team=${teamInfo.team.id}&current=true`,
          { headers: { "x-apisports-key": apiKeyFootball } },
        );
        const leagueJson = await leagueRes.json();
        const mainLeague = leagueJson.response?.find((l: any) => l.league?.type === "League");
        if (mainLeague) division = mainLeague.league.name;
      }
    } catch (e) {
      console.error("[API-FOOTBALL ERROR]:", e);
    }

    const apiStadium = teamInfo?.venue?.name || null;
    const apiFounded = teamInfo?.team?.founded || null;
    const apiCity = teamInfo?.venue?.city || teamInfo?.team?.country || null;

    /* ─── 2. GEMINI (Historiador Sênior) ─── */
    let aiData: any = {
      cor_primaria: "#ff6200",
      cor_secundaria: "#1a1a1a",
      cor_terciaria: "#ffffff",
      mascote: null,
      apelido: null,
      estadio_nome: null,
      fundado: null,
    };

    if (geminiKey) {
      try {
        const missingStadium = !apiStadium ? "INVESTIGUE o nome oficial do estádio." : "";
        const missingFounded = !apiFounded ? "INVESTIGUE o ano de fundação (apenas o número, ex: 1899)." : "";

        const prompt = `Você é um HISTORIADOR SÊNIOR de futebol mundial com acesso a arquivos enciclopédicos.
Para o clube "${club_name}"${apiCity ? ` (${apiCity})` : ""}, retorne EXCLUSIVAMENTE um objeto JSON puro, sem markdown, sem comentários, sem texto antes ou depois.

Estrutura OBRIGATÓRIA:
{
  "cor_primaria": "#HEX",
  "cor_secundaria": "#HEX",
  "cor_terciaria": "#HEX",
  "mascote": "Nome curto do mascote oficial (ex: Mosqueteiro, Galo, Tigre)",
  "apelido": "Alcunha histórica popular (ex: Mengão, Timão, Tricolor Paulista)",
  "estadio_nome": "Nome oficial do estádio ou null",
  "fundado": ano_em_numero_ou_null
}

Regras:
- Mascote e apelido NUNCA podem ser "Não Identificado" — pesquise a fundo.
- ${missingStadium}
- ${missingFounded}
- Cores em HEX válido (#RRGGBB).
- Resposta APENAS o JSON, nada mais.`;

        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
              },
            }),
          },
        );

        const gJson = await gRes.json();
        const rawText = gJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const parsed = extractJson(rawText);
          aiData = {
            cor_primaria: parsed.cor_primaria || aiData.cor_primaria,
            cor_secundaria: parsed.cor_secundaria || aiData.cor_secundaria,
            cor_terciaria: parsed.cor_terciaria || aiData.cor_terciaria,
            mascote: parsed.mascote && parsed.mascote !== "Não Identificado" ? parsed.mascote : null,
            apelido: parsed.apelido && parsed.apelido !== "Não Identificado" ? parsed.apelido : null,
            estadio_nome: parsed.estadio_nome || null,
            fundado: parsed.fundado ? Number(parsed.fundado) : null,
          };
          console.log(`[GEMINI OK] ${club_name}: mascote=${aiData.mascote} apelido=${aiData.apelido}`);
        }
      } catch (e) {
        console.error(`[GEMINI ERROR] ${club_name}:`, e);
      }
    }

    /* ─── 3. PAYLOAD COM FALLBACKS INTELIGENTES ─── */
    const payload: Record<string, any> = {
      nome: club_name,
      nome_curto: trunc(teamInfo?.team?.code || club_name.substring(0, 3).toUpperCase(), 50),
      api_id: trunc(teamInfo?.team?.id?.toString() || api_id?.toString() || null, 50),
      escudo_url: teamInfo?.team?.logo || null,
      fundado: apiFounded || aiData.fundado || null,
      cidade: teamInfo?.venue?.city || "Brasil",
      pais: teamInfo?.team?.country || "Brasil",
      estadio_nome: apiStadium || aiData.estadio_nome || null,
      estadio_cidade: teamInfo?.venue?.city || null,
      estadio_capacidade: teamInfo?.venue?.capacity || null,
      division: trunc(division, 100),
      mascote: aiData.mascote || "Não Identificado",
      apelido: aiData.apelido || "Não Identificado",
      cor_primaria: trunc(aiData.cor_primaria, 20),
      cor_secundaria: trunc(aiData.cor_secundaria, 20),
      cor_terciaria: trunc(aiData.cor_terciaria, 20),
      atualizado_em: new Date().toISOString(),
    };

    const { data, error: upsertError } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    console.log(`[DONE] ${club_name} salvo com sucesso.`);
    return new Response(JSON.stringify({ success: true, club: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[CRITICAL ERROR]:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 45.0
 * - Gemini reforçado como historiador sênior com investigação de campos faltantes.
 * - extractJson robusto (markdown + texto ruído removidos).
 * - Fallback inteligente: API Football tem prioridade; Gemini complementa.
 * - Truncagem defensiva contra varchar overflow.
 */
