/**
 * [CAMINHO]: supabase/functions/check-club-feminino/index.ts
 * [MÓDULO]: Verificação de existência de time FEMININO via Lovable AI Gateway
 * [STATUS]: PRODUÇÃO — v2.0 (Lovable AI - sem quota gratuita estourada)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `Você é um pesquisador especialista em futebol mundial. Sua missão é responder com PRECISÃO ABSOLUTA se um clube possui equipe de futebol FEMININO PROFISSIONAL ATIVA na temporada vigente.

REGRAS:
- "tem_feminino: true" APENAS se o clube tem elenco feminino principal ativo em competição oficial (Brasileirão Feminino A1/A2/A3, Paulista, Copa do Brasil Feminino, NWSL, WSL, Liga F, Champions Feminina, etc.).
- "tem_feminino: false" se o clube não possui departamento feminino, está inativo, ou tem apenas categorias de base (sub-17/sub-20).
- Use seu conhecimento atualizado sobre o futebol mundial.
- Seja honesto: se não tiver certeza, marque false e explique na observação.`;

const buildUserPrompt = (clubName: string) =>
  `Pesquise sobre o clube "${clubName}" e responda: ele possui equipe de futebol feminino profissional ativa atualmente?`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clubName } = await req.json();
    if (!clubName || typeof clubName !== "string" || clubName.trim().length < 2) {
      return json({ error: "clubName inválido" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(clubName.trim()) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "responder_futebol_feminino",
              description: "Retorna se o clube possui equipe feminina ativa.",
              parameters: {
                type: "object",
                properties: {
                  nome_confirmado: {
                    type: "string",
                    description: "Nome oficial completo do clube",
                  },
                  tem_feminino: {
                    type: "boolean",
                    description: "true se possui time feminino profissional ativo",
                  },
                  competicao_principal: {
                    type: "string",
                    description: "Principal competição feminina disputada (ex: Brasileirão Feminino A1). Use 'Nenhuma' se não tiver.",
                  },
                  observacao: {
                    type: "string",
                    description: "1-2 frases curtas com contexto (ano de fundação do dep. feminino, títulos, status atual, etc.)",
                  },
                  fonte: {
                    type: "string",
                    description: "Breve menção da fonte do conhecimento (CBF, site oficial, FIFA, etc.)",
                  },
                },
                required: [
                  "nome_confirmado",
                  "tem_feminino",
                  "competicao_principal",
                  "observacao",
                  "fonte",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "responder_futebol_feminino" },
        },
      }),
    });

    if (res.status === 429) {
      return json({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }, 429);
    }
    if (res.status === 402) {
      return json({ error: "Créditos esgotados. Adicione fundos no workspace Lovable AI." }, 402);
    }
    if (!res.ok) {
      const errText = await res.text();
      console.error("Lovable AI error:", res.status, errText);
      return json({ error: "Falha na consulta IA", detail: errText.slice(0, 300) }, 502);
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("Resposta sem tool_call:", JSON.stringify(data).slice(0, 500));
      return json({ error: "Resposta inesperada do modelo" }, 502);
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("check-club-feminino error:", message);
    return json({ error: message }, 500);
  }
});
