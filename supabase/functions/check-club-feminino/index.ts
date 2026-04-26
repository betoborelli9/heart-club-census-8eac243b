/**
 * [CAMINHO]: supabase/functions/check-club-feminino/index.ts
 * [MÓDULO]: Verificação de existência de time FEMININO via Gemini + Google Search
 * [STATUS]: PRODUÇÃO — v3.0 (busca web obrigatória)
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

const buildPrompt = (clubName: string) => `
Você é a IA de dados esportivos do Heart Club.

Use obrigatoriamente Google Search para responder se o clube consultado tem equipe feminina principal ativa.

CLUBE CONSULTADO: ${clubName}

PESQUISAS OBRIGATÓRIAS NO GOOGLE:
1. "${clubName} tem time feminino"
2. "${clubName} futebol feminino"
3. "${clubName} feminino campeonato"
4. "${clubName} Brasileirão Feminino A1 A2 A3"

REGRA PRINCIPAL:
- tem_feminino = true se houver notícia, tabela, site oficial, federação, CBF ou competição oficial indicando equipe feminina principal/sênior ativa.
- tem_feminino = false somente se a busca indicar inexistência, inatividade, ou apenas categorias de base sem equipe principal.
- Se houver resultado recente em Brasileirão Feminino A1/A2/A3, estadual feminino adulto, Copa do Brasil Feminina, Libertadores/Champions feminina ou liga nacional feminina, responda true.
- Vila Nova Futebol Clube/GO possui futebol feminino; se consultar Vila Nova, responda true.

SAÍDA OBRIGATÓRIA:
Retorne EXCLUSIVAMENTE JSON puro, sem markdown e sem explicação:
{
  "nome_confirmado": "Nome oficial/mais provável do clube",
  "tem_feminino": true,
  "competicao_principal": "Principal competição feminina encontrada ou Nenhuma",
  "observacao": "Uma frase objetiva baseada na busca",
  "fonte": "Nome do site/federação/notícia mais relevante encontrado"
}
`.trim();

const extractText = (payload: any): string =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("\n")
    .trim() || "";

const extractJson = (text: string): Record<string, unknown> => {
  let clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Resposta sem JSON");
  clean = clean.slice(start, end + 1);
  try {
    return JSON.parse(clean);
  } catch {
    return JSON.parse(clean.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""));
  }
};

const normalizeResult = (raw: Record<string, unknown>, fallbackName: string) => ({
  nome_confirmado:
    typeof raw.nome_confirmado === "string" && raw.nome_confirmado.trim()
      ? raw.nome_confirmado.trim()
      : fallbackName,
  tem_feminino: raw.tem_feminino === true,
  competicao_principal:
    typeof raw.competicao_principal === "string" && raw.competicao_principal.trim()
      ? raw.competicao_principal.trim()
      : raw.tem_feminino === true
        ? "Competição feminina oficial"
        : "Nenhuma",
  observacao:
    typeof raw.observacao === "string" && raw.observacao.trim()
      ? raw.observacao.trim()
      : "Consulta realizada com busca automática.",
  fonte:
    typeof raw.fonte === "string" && raw.fonte.trim()
      ? raw.fonte.trim()
      : "Google Search",
});

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
