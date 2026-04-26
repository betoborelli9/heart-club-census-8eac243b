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

type NewsHit = {
  title: string;
  snippet: string;
  source: string;
  link: string;
};

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

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value: string) => decodeXml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const readTag = (item: string, tag: string) => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
};

const fetchGoogleNewsHits = async (clubName: string): Promise<NewsHit[]> => {
  const queries = [
    `"${clubName}" "futebol feminino"`,
    `"${clubName}" "Brasileirão Feminino"`,
    `"${clubName}" "time feminino"`,
  ];
  const hits: NewsHit[] = [];

  for (const query of queries) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const response = await fetch(url, { headers: { "User-Agent": "HeartClubBot/1.0" } });
    if (!response.ok) continue;
    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    for (const item of items.slice(0, 6)) {
      hits.push({
        title: stripHtml(readTag(item, "title")),
        snippet: stripHtml(readTag(item, "description")),
        source: stripHtml(readTag(item, "source")) || "Google News",
        link: stripHtml(readTag(item, "link")),
      });
    }
  }

  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = `${hit.title}-${hit.source}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return hit.title || hit.snippet;
  });
};

const competitionFromText = (text: string) => {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/brasileir(?:a|o) feminino[^.]{0,30}a-?1|serie a-?1 feminina/.test(normalized)) return "Brasileirão Feminino A1";
  if (/brasileir(?:a|o) feminino[^.]{0,30}a-?2|serie a-?2 feminina/.test(normalized)) return "Brasileirão Feminino A2";
  if (/brasileir(?:a|o) feminino[^.]{0,30}a-?3|serie a-?3 feminina/.test(normalized)) return "Brasileirão Feminino A3";
  if (/campeonato goiano feminino|goianao feminino/.test(normalized)) return "Campeonato Goiano Feminino";
  if (/paulista feminino/.test(normalized)) return "Campeonato Paulista Feminino";
  if (/carioca feminino/.test(normalized)) return "Campeonato Carioca Feminino";
  if (/mineiro feminino/.test(normalized)) return "Campeonato Mineiro Feminino";
  if (/gauchao feminino|gaucho feminino/.test(normalized)) return "Campeonato Gaúcho Feminino";
  if (/libertadores feminina/.test(normalized)) return "Libertadores Feminina";
  if (/champions feminina|women'?s champions league/.test(normalized)) return "Champions League Feminina";
  return "Competição feminina oficial";
};

const resultFromSearchHits = (clubName: string, hits: NewsHit[]) => {
  const positive = hits.find((hit) => {
    const text = `${hit.title} ${hit.snippet}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const adultCompetition = /brasileir(?:a|o) feminino|serie a-?[123] feminina|campeonato .* feminino|goianao feminino|paulista feminino|libertadores feminina|champions feminina/.test(text);
    const genericTeam = /time feminino|equipe feminina|futebol feminino/.test(text);
    const youthOnly = /sub-?1[57]|sub-?20|base/.test(text) && !adultCompetition;
    return !youthOnly && (adultCompetition || genericTeam);
  });

  if (!positive) return null;

  const fullText = `${positive.title}. ${positive.snippet}`;
  return {
    nome_confirmado: clubName,
    tem_feminino: true,
    competicao_principal: competitionFromText(fullText),
    observacao: `Busca automática encontrou indício ativo: ${positive.title}`,
    fonte: positive.source || "Google News",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clubName } = await req.json();
    if (!clubName || typeof clubName !== "string" || clubName.trim().length < 2) {
      return json({ error: "clubName inválido" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY não configurada" }, 500);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(clubName.trim()) }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.05,
          topP: 0.2,
          maxOutputTokens: 1200,
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
      console.error("Gemini error:", res.status, errText);
      return json({ error: "Falha na consulta Gemini + Google", detail: errText.slice(0, 300) }, 502);
    }

    const data = await res.json();
    const text = extractText(data);
    if (!text) return json({ error: "Gemini não retornou conteúdo" }, 502);

    const parsed = extractJson(text);
    return json(normalizeResult(parsed, clubName.trim()));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("check-club-feminino error:", message);
    return json({ error: message }, 500);
  }
});
