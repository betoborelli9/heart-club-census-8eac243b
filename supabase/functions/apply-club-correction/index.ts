/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/apply-club-correction/index.ts
 * [MÓDULO]: CORREÇÃO DE DADOS DO CLUBE PELO TORCEDOR
 * [DESCRIÇÃO]:
 *  - Recebe sugestão do torcedor (cor, mascote, fundação, feminino, cidade,
 *    estádio etc.) para o SEU clube do coração.
 *  - Valida via Lovable AI Gateway (Gemini 2.5 Flash) com Google Search:
 *      * Se o torcedor errar (ex.: diz "Tigre" mas é "Raposa"),
 *        a IA corrige antes de gravar.
 *      * Se a sugestão for plausível e confirmada, grava como veio.
 *      * Se for absurdo, rejeita.
 *  - Atualiza clubes_cache (service role) e registra em club_corrections.
 *  - Garante que o user_id só pode corrigir o próprio clube do coração.
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

const ALLOWED_FIELDS = new Set([
  "cor_primaria",
  "cor_secundaria",
  "cor_terciaria",
  "cor_quarta",
  "mascote",
  "tem_feminino",
  "fundado",
  "cidade",
  "pais",
  "estadio_nome",
  "estadio_cidade",
  "estadio_capacidade",
  "nome_curto",
  "division",
  "rivais",
]);

// Campos onde a palavra do torcedor SOBREPÕE a IA (apenas log, sem validação)
const USER_OVERRIDE_FIELDS = new Set(["rivais"]);

const COLOR_FIELDS = new Set([
  "cor_primaria",
  "cor_secundaria",
  "cor_terciaria",
  "cor_quarta",
]);

const NUMERIC_FIELDS = new Set(["fundado", "estadio_capacidade"]);
const BOOL_FIELDS = new Set(["tem_feminino"]);

function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(HEX_RE);
  return m ? `#${m[1].toUpperCase()}` : null;
}

/* ═══════════════════════════════════════════════════════════
   IA — Validação por campo
═══════════════════════════════════════════════════════════ */
async function aiValidateField(
  clubName: string,
  country: string | null,
  field: string,
  suggested: string,
): Promise<{ verdict: "confirmed" | "corrected" | "rejected"; value: string | null; reasoning: string }> {
  if (!LOVABLE_KEY) {
    // sem IA: aceita como "confirmed" (fallback honesto)
    return { verdict: "confirmed", value: suggested, reasoning: "IA indisponível, aceito conforme sugestão." };
  }

  const fieldDescriptions: Record<string, string> = {
    cor_primaria: "cor PRIMÁRIA oficial (HEX 6 dígitos)",
    cor_secundaria: "cor SECUNDÁRIA oficial (HEX 6 dígitos)",
    cor_terciaria: "cor TERCIÁRIA oficial (HEX 6 dígitos), pode não existir",
    cor_quarta: "cor QUATERNÁRIA oficial (HEX 6 dígitos), pode não existir",
    mascote: "mascote oficial do clube (uma palavra, ex.: Raposa, Tigre, Leão)",
    tem_feminino: "se o clube possui equipe de futebol FEMININO oficial (true/false)",
    fundado: "ano de fundação (4 dígitos)",
    cidade: "cidade-sede oficial",
    pais: "país-sede",
    estadio_nome: "nome oficial do estádio principal",
    estadio_cidade: "cidade onde fica o estádio",
    estadio_capacidade: "capacidade do estádio (apenas número inteiro)",
    nome_curto: "nome/abreviação curta do clube",
    division: `divisão/competição que o clube DISPUTA NO MOMENTO (ano corrente ${new Date().getFullYear()}). Pesquise no Google a competição vigente OU a próxima imediata do calendário do clube. Para clubes brasileiros use exatamente: "Série A", "Série B", "Série C", "Série D", "Estadual" ou "Sem calendário" (se estiver fora de competição agora). Para estaduais regionais (ex.: Campeonato Goiano, Catarinense) use "Estadual - <UF>" (ex.: "Estadual - SC"). Nunca invente; se não houver competição ativa, responda "Sem calendário"`,
  };

  const desc = fieldDescriptions[field] || field;
  const ctx = country ? ` (${country})` : "";

  const prompt = `Você é um auditor de dados de clubes de futebol. Use Google Search para checar fatos atuais.

Clube: ${clubName}${ctx}
Campo: ${field} — ${desc}
Valor sugerido pelo torcedor: "${suggested}"

Sua tarefa:
1. Pesquise rapidamente a informação correta.
2. Compare com o valor sugerido.
3. Decida UMA das opções:
   - "confirmed": o valor sugerido está correto.
   - "corrected": o valor sugerido está errado, mas você sabe o correto.
   - "rejected": a sugestão é absurda ou impossível de verificar.

Responda APENAS em JSON válido, sem markdown, neste formato exato:
{"verdict":"confirmed|corrected|rejected","value":"<valor final ou null>","reasoning":"<frase curta em PT-BR>"}

Regras de formato do "value":
- Se for HEX (cores): formato "#RRGGBB" maiúsculo.
- Se for booleano (tem_feminino): "true" ou "false".
- Se for ano/capacidade: apenas dígitos.
- Caso contrário: texto limpo.
- Se "rejected": value = null.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "google_search" }],
        temperature: 0.05,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[apply-club-correction] AI error:", res.status, txt.slice(0, 200));
      return { verdict: "confirmed", value: suggested, reasoning: "Falha na IA, aceito conforme sugestão." };
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { verdict: "confirmed", value: suggested, reasoning: "Resposta da IA fora do formato, aceito conforme sugestão." };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const verdict = ["confirmed", "corrected", "rejected"].includes(parsed.verdict)
      ? parsed.verdict
      : "confirmed";
    const value = parsed.value === null || parsed.value === undefined ? null : String(parsed.value);
    const reasoning = String(parsed.reasoning || "").slice(0, 280);
    return { verdict, value, reasoning };
  } catch (e) {
    console.error("[apply-club-correction] AI exception:", e);
    return { verdict: "confirmed", value: suggested, reasoning: "Erro na IA, aceito conforme sugestão." };
  }
}

/* ═══════════════════════════════════════════════════════════
   Coerção do valor final pro tipo da coluna
═══════════════════════════════════════════════════════════ */
function coerceValue(field: string, raw: string | null): unknown {
  if (raw === null || raw === undefined || raw === "") return null;
  if (COLOR_FIELDS.has(field)) return normalizeHex(raw);
  if (BOOL_FIELDS.has(field)) {
    const v = String(raw).toLowerCase().trim();
    return v === "true" || v === "1" || v === "sim" || v === "yes";
  }
  if (NUMERIC_FIELDS.has(field)) {
    const n = parseInt(String(raw).replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  return String(raw).trim();
}

/* ═══════════════════════════════════════════════════════════
   HANDLER
═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const corrections: Array<{ field: string; value: string }> = Array.isArray(body?.corrections)
      ? body.corrections
      : [];

    if (corrections.length === 0) {
      return new Response(JSON.stringify({ error: "no corrections" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica clube do coração do usuário (apenas o original_vote)
    const { data: vote } = await admin
      .from("votos")
      .select("clube_nome")
      .eq("user_id", user.id)
      .eq("is_original_vote", true)
      .maybeSingle();

    if (!vote?.clube_nome) {
      return new Response(JSON.stringify({ error: "no heart club" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clubName = vote.clube_nome;

    // Carrega snapshot atual + nome de exibição
    const { data: cache } = await admin
      .from("clubes_cache")
      .select("*")
      .ilike("nome", clubName)
      .maybeSingle();

    const { data: profile } = await admin
      .from("profiles")
      .select("nome_exibicao")
      .eq("id", user.id)
      .maybeSingle();

    const country = cache?.pais || null;
    const results: any[] = [];
    const updatePayload: Record<string, unknown> = {};

    for (const c of corrections) {
      const field = String(c?.field || "").trim();
      const suggested = String(c?.value ?? "").trim();
      if (!ALLOWED_FIELDS.has(field) || suggested === "") continue;

      const oldValueRaw = cache ? (cache as any)[field] : null;
      const oldValue = oldValueRaw === null || oldValueRaw === undefined ? null : String(oldValueRaw);

      // se igual ao atual, pula
      if (oldValue !== null && oldValue.toLowerCase() === suggested.toLowerCase()) continue;

      const verdict = await aiValidateField(clubName, country, field, suggested);
      const finalValue = verdict.verdict === "rejected" ? null : coerceValue(field, verdict.value ?? suggested);
      const status = verdict.verdict === "rejected" ? "rejected" : "applied";

      if (status === "applied" && finalValue !== null) {
        updatePayload[field] = finalValue;
      }

      // Log da correção
      await admin.from("club_corrections").insert({
        user_id: user.id,
        user_display_name: profile?.nome_exibicao || user.email || null,
        clube_nome: clubName,
        field_name: field,
        old_value: oldValue,
        suggested_value: suggested,
        applied_value: finalValue !== null ? String(finalValue) : null,
        ai_verdict: verdict.verdict,
        ai_reasoning: verdict.reasoning,
        status,
      });

      results.push({
        field,
        suggested,
        applied: finalValue,
        verdict: verdict.verdict,
        reasoning: verdict.reasoning,
        status,
      });
    }

    if (Object.keys(updatePayload).length > 0 && cache?.id) {
      updatePayload["atualizado_em"] = new Date().toISOString();
      await admin.from("clubes_cache").update(updatePayload).eq("id", cache.id);
    }

    return new Response(JSON.stringify({ ok: true, clube: clubName, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[apply-club-correction] fatal:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
