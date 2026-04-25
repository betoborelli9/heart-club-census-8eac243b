/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO ASSERTIVO (Wikipedia-First & April 2026)
 * [STATUS]: PRODUÇÃO — VERSÃO 72.0 (MODULAR & GROUNDING)
 * [DESCRIÇÃO]:
 * - Wikipedia-First: Âncora de verdade para cores de tecido (Jersey) e fundação.
 * - Hierarquia 2026: Prioridade Séries A, B, C e D (Abril/2026).
 * - Blindagem Visual: Ignora cores de bordas de escudo (Vila Nova = Bicolor).
 * - Suporte Quadricolor: Preenchimento obrigatório da 'cor_quarta' (Brusque).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: UTILITÁRIOS E NORMALIZAÇÃO
   ═══════════════════════════════════════════════════════════ */
function normalizeHex(value: unknown): string | null {
  if (!value || String(value).toLowerCase() === "null") return null;
  const raw = String(value).trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/i.test(withHash) ? withHash.toUpperCase() : null;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: INVESTIGAÇÃO IA (WIKIPEDIA GROUNDING)
   ═══════════════════════════════════════════════════════════ */
async function investigateClubWithAI(club_name: string, geminiKey: string) {
  const CURRENT_DATE = "Abril de 2026";

  const prompt = `Investigue o clube "${club_name}" para a temporada de ${CURRENT_DATE}.
  
  HIERARQUIA DE FONTES:
  1. Wikipedia (Busque estritamente as cores oficiais do uniforme titular/tecido descritas no texto).
  2. OGOL/Site Oficial (Para conferir participação em torneios e futebol feminino).

  REGRAS DE CORES (DESIGN JERSEY):
  - IGNORE cores de contorno de escudo, bordas de segurança ou detalhes de estrelas.
  - VETO: Se o clube for o Vila Nova-GO, ele é BICOLOR (Vermelho e Branco). Ignore preto de contorno.
  - VETO: Se o clube for o Brusque-SC, ele é QUADRICOLOR (Amarelo, Verde, Vermelho e Branco).
  - Se BICOLOR: cor_terciaria e cor_quarta DEVEM ser null.
  - Se TRICOLOR: cor_quarta DEVE ser null.
  
  REGRAS DE DIVISÃO (ABRIL 2026):
  - BRASIL: Verifique a série (A, B, C ou D) no Campeonato Brasileiro 2026. Se não houver, indique a divisão estadual ativa.
  - ESTRANGEIROS: Busque a liga nacional principal do país do clube.

  RETORNE APENAS JSON:
  {"clube_confirmado": "Nome", "quantidade_cores": 2|3|4, "cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX ou null", "cor_quarta": "#HEX ou null", "mascote": "Nome", "tem_feminino": boolean, "division": "Campeonato 2026"}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    },
  );

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = JSON.parse(text);

  const q = Number(data.quantidade_cores);
  return {
    cor_primaria: normalizeHex(data.cor_primaria) || "#000000",
    cor_secundaria: normalizeHex(data.cor_secundaria) || "#FFFFFF",
    cor_terciaria: q >= 3 ? normalizeHex(data.cor_terciaria) : null,
    cor_quarta: q >= 4 ? normalizeHex(data.cor_quarta) : null,
    mascote: data.mascote || "—",
    tem_feminino: !!data.tem_feminino,
    division: data.division || "Indefinida",
  };
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: ORQUESTRAÇÃO PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const { club_name } = await req.json();

    const aiData = await investigateClubWithAI(club_name, geminiKey);

    const { data, error } = await supabase
      .from("clubes_cache")
      .upsert(
        {
          nome: club_name,
          ...aiData,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "nome" },
      )
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
