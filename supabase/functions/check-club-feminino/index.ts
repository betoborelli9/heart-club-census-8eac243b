/**
 * [CAMINHO]: supabase/functions/check-club-feminino/index.ts
 * [MÓDULO]: Verificação de existência de time FEMININO via Gemini + Google Search
 * [STATUS]: PRODUÇÃO — v1.0
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
Você é um pesquisador de futebol. Use Google Search para responder COM PRECISÃO.

PERGUNTA: O clube "${clubName}" possui equipe de FUTEBOL FEMININO PROFISSIONAL OU SEMI-PROFISSIONAL ATIVA atualmente (temporada vigente)?

REGRAS:
- Considere "SIM" apenas se houver elenco feminino ativo disputando alguma competição oficial (Brasileirão Feminino A1/A2/A3, Paulista Feminino, Copa do Brasil Feminino, ligas estrangeiras femininas, etc.).
- Considere "NÃO" se o clube não possui departamento feminino ou está inativo.
- Se houver categoria de base feminina apenas (sub-17/sub-20) sem time principal, marque como "NÃO".

Responda APENAS em JSON puro (sem \`\`\`json):
{
  "nome_confirmado": "Nome oficial do clube",
  "tem_feminino": true | false,
  "competicao_principal": "Nome da principal competição feminina disputada (ou null)",
  "fonte": "Breve menção da fonte (site oficial, CBF, FIFA, etc.)",
  "observacao": "1 frase curta com contexto (ex: campeão 2023, recém-criado em 2024, descontinuado em 2019, etc.)"
}
`.trim();

const extractJson = (text: string): any => {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON não encontrado");
  return JSON.parse(match[0].replace(/,(\s*[}\]])/g, "$1"));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clubName } = await req.json();
    if (!clubName || typeof clubName !== "string" || clubName.trim().length < 2) {
      return json({ error: "clubName inválido" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY ausente" }, 500);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(clubName.trim()) }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini error:", errText);
      return json({ error: "Falha na consulta Gemini", detail: errText.slice(0, 300) }, 502);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") ?? "";

    if (!text) return json({ error: "Resposta vazia do modelo" }, 502);

    const parsed = extractJson(text);
    return json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return json({ error: message }, 500);
  }
});
