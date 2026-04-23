/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 46.0 (FIX MASCOTE)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extrai o primeiro objeto JSON válido de uma string (lida com ```json, texto extra, etc.)
function extractJson(text: string): string | null {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return cleaned.substring(start, end + 1);
}

async function callGemini(geminiKey: string, prompt: string, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`[Gemini ${model}] HTTP ${res.status}:`, JSON.stringify(json).substring(0, 400));
    return null;
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error(`[Gemini ${model}] sem texto na resposta:`, JSON.stringify(json).substring(0, 400));
    return null;
  }
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const apiKeyFootball = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    console.log(`[enrich] Iniciando enriquecimento: club_name="${club_name}", api_id="${api_id}"`);

    // 1. DADOS TÉCNICOS (API FOOTBALL)
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
      const mainLeague = leagueJson.response?.find((l: any) => l.league.type === "League");
      if (mainLeague) division = mainLeague.league.name;
    }

    // 2. IA HISTORIADORA (GEMINI) - Mascote + Cores
    let aiData: {
      cor_primaria: string | null;
      cor_secundaria: string | null;
      cor_terciaria: string | null;
      mascote: string | null;
    } = {
      cor_primaria: null,
      cor_secundaria: null,
      cor_terciaria: null,
      mascote: null,
    };

    if (!geminiKey) {
      console.error("[enrich] GEMINI_API_KEY não configurada!");
    } else {
      const prompt = `Você é um Historiador Esportivo Sênior especialista em futebol mundial.
Para o clube de futebol "${club_name}"${teamInfo?.team?.country ? ` (${teamInfo.team.country})` : ""}, retorne APENAS um JSON puro com esta estrutura exata:
{"cor_primaria":"#HEX","cor_secundaria":"#HEX","cor_terciaria":"#HEX","mascote":"nome do mascote ou símbolo do clube"}

Regras obrigatórias:
- "mascote" NUNCA pode ficar vazio. Se o clube não tiver mascote oficial, use o símbolo/animal/figura mais associado a ele (ex: "Águia", "Leão", "Tricolor", "Mosqueteiro", "Galo").
- Cores em HEX válido (#RRGGBB).
- Sem markdown, sem explicações, apenas o JSON.`;

      // Tenta gemini-1.5-flash, depois gemini-1.5-flash-latest como fallback
      let rawText = await callGemini(geminiKey, prompt, "gemini-1.5-flash");
      if (!rawText) rawText = await callGemini(geminiKey, prompt, "gemini-1.5-flash-latest");

      if (rawText) {
        const jsonStr = extractJson(rawText);
        if (!jsonStr) {
          console.error("[enrich] Não foi possível extrair JSON do Gemini. Texto bruto:", rawText.substring(0, 300));
        } else {
          try {
            const parsed = JSON.parse(jsonStr);
            aiData = {
              cor_primaria: typeof parsed.cor_primaria === "string" && parsed.cor_primaria.trim() ? parsed.cor_primaria.trim() : null,
              cor_secundaria: typeof parsed.cor_secundaria === "string" && parsed.cor_secundaria.trim() ? parsed.cor_secundaria.trim() : null,
              cor_terciaria: typeof parsed.cor_terciaria === "string" && parsed.cor_terciaria.trim() ? parsed.cor_terciaria.trim() : null,
              mascote: typeof parsed.mascote === "string" && parsed.mascote.trim() ? parsed.mascote.trim() : null,
            };
            console.log(`[enrich] Gemini OK para "${club_name}": mascote="${aiData.mascote}", cor_primaria="${aiData.cor_primaria}"`);
          } catch (e) {
            console.error("[enrich] Falha ao parsear JSON do Gemini:", (e as Error).message, "JSON:", jsonStr.substring(0, 300));
          }
        }
      }
    }

    // 3. SALVAMENTO FINAL — só sobrescreve mascote/cores se o Gemini retornou valor real
    // Lê registro existente para preservar dados quando o Gemini falhar
    const { data: existing } = await supabase
      .from("clubes_cache")
      .select("mascote, cor_primaria, cor_secundaria, cor_terciaria")
      .eq("nome", club_name)
      .maybeSingle();

    const payload: Record<string, any> = {
      nome: club_name,
      nome_curto: teamInfo?.team?.code || club_name.substring(0, 3).toUpperCase(),
      api_id: teamInfo?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: teamInfo?.team?.logo || null,
      fundado: teamInfo?.team?.founded || null,
      cidade: teamInfo?.venue?.city || existing?.cidade || "Brasil",
      pais: teamInfo?.team?.country || "Brasil",
      estadio_nome: teamInfo?.venue?.name || null,
      estadio_cidade: teamInfo?.venue?.city || null,
      estadio_capacidade: teamInfo?.venue?.capacity || null,
      division: division,
      // Anti-NULL: usa novo valor → existente → fallback final
      mascote: aiData.mascote || existing?.mascote || "Símbolo Não Identificado",
      cor_primaria: aiData.cor_primaria || existing?.cor_primaria || "#ff6200",
      cor_secundaria: aiData.cor_secundaria || existing?.cor_secundaria || "#1a1a1a",
      cor_terciaria: aiData.cor_terciaria || existing?.cor_terciaria || "#ffffff",
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" })
      .select()
      .single();
    if (error) {
      console.error("[enrich] Erro upsert:", error.message);
      throw error;
    }

    console.log(`[enrich] ✓ Salvo "${club_name}" — mascote="${payload.mascote}"`);
    return new Response(JSON.stringify({ success: true, club: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[enrich] ERRO FATAL:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 46.0
 * - Fix mascote: prompt reforçado proibindo valor vazio.
 * - responseMimeType: application/json para JSON garantido.
 * - Fallback de modelo (flash → flash-latest).
 * - Logs detalhados em cada etapa para debug.
 * - Preserva dados existentes quando Gemini falha (não sobrescreve com vazio).
 */
