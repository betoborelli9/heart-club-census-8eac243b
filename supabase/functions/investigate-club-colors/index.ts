/**
 * [CAMINHO]: supabase/functions/investigate-club-colors/index.ts
 * [MÓDULO]: Investigação IA de cores via Lovable AI Gateway (Gemini)
 * [STATUS]: v1.0 — substitui chamada direta do front que retornava 403
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `
Você é um especialista em identidade visual de clubes de futebol.

FONTE PRIMÁRIA OBRIGATÓRIA: Wikipedia (pt e en). Leia a descrição textual
do uniforme/camisa (Jersey) — NÃO interprete o escudo.

REGRAS DE OURO:
1. VETO DE CONTORNO: É PROIBIDO incluir cores que existem APENAS no contorno
   do escudo, em estrelas ou em pequenos detalhes decorativos.
   Exemplo: Vila Nova-GO é BICOLOR (Vermelho e Branco). O preto é só contorno.
2. Brusque-SC é QUADRICOLOR (Amarelo, Verde, Vermelho e Branco).
3. Santa Cruz-PE é TRICOLOR (Vermelho, Preto e Branco).
4. Use SEMPRE as cores oficiais do uniforme titular descritas na Wikipedia.

COMPETIÇÃO 2026 (Data atual: Abril/2026):
- Brasil: Identifique a competição mais importante em ABRIL/2026.
  Hierarquia: Série A > Série B > Série C > Série D > Estadual.
- Estrangeiros: Liga Nacional Principal do país de origem.

ESTRUTURA: BICOLOR (2 cores) | TRICOLOR (3 cores) | QUADRICOLOR (4 cores).
Retorne APENAS via tool call "set_club_identity".
`.trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { clubName } = await req.json();
    if (!clubName || typeof clubName !== "string") {
      return new Response(JSON.stringify({ error: "clubName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Investigue: "${clubName}"` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "set_club_identity",
            description: "Retorna identidade visual e divisão do clube",
            parameters: {
              type: "object",
              properties: {
                nome_confirmado: { type: "string" },
                mascote: { type: "string" },
                divisao_2026: { type: "string" },
                estrutura: {
                  type: "string",
                  enum: ["BICOLOR", "TRICOLOR", "QUADRICOLOR"],
                },
                cores: {
                  type: "array",
                  items: { type: "string", description: "HEX #RRGGBB" },
                  minItems: 2,
                  maxItems: 4,
                },
              },
              required: [
                "nome_confirmado",
                "mascote",
                "divisao_2026",
                "estrutura",
                "cores",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "set_club_identity" },
      },
    };

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (res.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos esgotados na Lovable AI." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!res.ok) {
      const txt = await res.text();
      console.error("AI gateway error:", res.status, txt);
      return new Response(
        JSON.stringify({ error: `AI gateway ${res.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "Resposta sem tool call" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(call.function.arguments);
    const cores = (parsed.cores || [])
      .map((c: string) => String(c).trim().toUpperCase())
      .filter((c: string) => /^#[0-9A-F]{6}$/.test(c))
      .slice(0, 4);

    const estrutura =
      cores.length >= 4 ? "QUADRICOLOR" : cores.length === 3 ? "TRICOLOR" : "BICOLOR";

    return new Response(
      JSON.stringify({
        nome_confirmado: parsed.nome_confirmado || clubName,
        mascote: parsed.mascote || "—",
        divisao_2026: parsed.divisao_2026 || "—",
        estrutura,
        cores,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("investigate-club-colors:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
