/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO ASSERTIVO DE CLUBES (Cores · Divisão · Mascote · Feminino · Escudo)
 * [STATUS]: PRODUÇÃO — BLINDAGEM ANTI-CONFUSÃO + GEMINI 2.5 FLASH + GOOGLE SEARCH
 * [VERSÃO]: 5.0.0
 * [CORREÇÃO]: Impede contaminação por clube homônimo/rival e grava exatamente:
 *   • bicolor      → cor_primaria + cor_secundaria; cor_terciaria/cor_quarta = null
 *   • tricolor     → 3 campos; cor_quarta = null
 *   • quadricolor  → 4 campos obrigatórios
 * ═══════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════
   MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ═══════════════════════════════════════════════════════════
   MÓDULO: CORS E CONSTANTES
   ═══════════════════════════════════════════════════════════ */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_COUNTRY = "Brasil";
const DEFAULT_CITY = "—";
const HEX_RE = /^#[0-9A-F]{6}$/;

/* ═══════════════════════════════════════════════════════════
   MÓDULO: INTERFACES
   ═══════════════════════════════════════════════════════════ */
interface TechnicalData {
  api_id: string | null;
  escudo_url: string | null;
  pais: string | null;
  cidade: string | null;
  official_name: string | null;
}

interface AIInvestigationRaw {
  clube_confirmado?: string;
  cidade_confirmada?: string | null;
  estado_confirmado?: string | null;
  pais_confirmado?: string | null;
  quantidade_cores?: number | string;
  cores_tecido?: string[];
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_terciaria?: string | null;
  cor_quarta?: string | null;
  mascote?: string | null;
  tem_feminino?: boolean | string;
  division?: string | null;
}

interface AIEnrichment {
  cor_primaria: string;
  cor_secundaria: string;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  mascote: string;
  tem_feminino: boolean;
  division: string;
}

interface PersistedClub extends AIEnrichment {
  nome: string;
  pais: string;
  cidade: string;
  api_id: string | null;
  escudo_url: string | null;
  atualizado_em: string;
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: UTILITÁRIOS DE TEXTO E CORES
   ═══════════════════════════════════════════════════════════ */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(futebol|football|clube|club|esporte|sport|associacao|associação|fc|sc|ec|ac)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHex(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null") return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const normalized = withHash.toUpperCase();
  return HEX_RE.test(normalized) ? normalized : null;
}

function uniqueHex(colors: Array<unknown>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const color of colors) {
    const normalized = normalizeHex(color);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "sim", "yes", "1"].includes(value.toLowerCase().trim());
  return false;
}

function safeString(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function parseColorCount(value: unknown, colors: string[]): 2 | 3 | 4 {
  const numeric = Number(value);
  if (numeric === 4) return 4;
  if (numeric === 3) return 3;
  if (numeric === 2) return 2;
  if (colors.length >= 4) return 4;
  if (colors.length === 3) return 3;
  return 2;
}

function validateClubIdentity(requestedName: string, confirmedName: string | undefined): void {
  if (!confirmedName) return;

  const requested = normalizeName(requestedName);
  const confirmed = normalizeName(confirmedName);
  if (!requested || !confirmed) return;

  const requestedTokens = requested.split(" ").filter((token) => token.length > 2);
  const confirmedTokens = confirmed.split(" ").filter((token) => token.length > 2);
  const shared = requestedTokens.filter((token) => confirmedTokens.includes(token));

  if (shared.length === 0 && !confirmed.includes(requested) && !requested.includes(confirmed)) {
    throw new Error(`Clube confirmado não corresponde ao solicitado: ${confirmedName}`);
  }
}

function buildEnrichmentFromRaw(requestedClubName: string, raw: AIInvestigationRaw): AIEnrichment {
  validateClubIdentity(requestedClubName, raw.clube_confirmado);

  const colors = uniqueHex([
    ...(Array.isArray(raw.cores_tecido) ? raw.cores_tecido : []),
    raw.cor_primaria,
    raw.cor_secundaria,
    raw.cor_terciaria,
    raw.cor_quarta,
  ]);

  if (colors.length < 2) {
    throw new Error("IA retornou menos de duas cores válidas de uniforme");
  }

  const colorCount = parseColorCount(raw.quantidade_cores, colors);
  const selected = colors.slice(0, colorCount);

  if (colorCount === 4 && selected.length < 4) {
    throw new Error("Clube quadricolor detectado sem quatro cores válidas");
  }

  if (colorCount === 3 && selected.length < 3) {
    throw new Error("Clube tricolor detectado sem três cores válidas");
  }

  return {
    cor_primaria: selected[0],
    cor_secundaria: selected[1],
    cor_terciaria: colorCount >= 3 ? selected[2] : null,
    cor_quarta: colorCount >= 4 ? selected[3] : null,
    mascote: safeString(raw.mascote, "—"),
    tem_feminino: asBoolean(raw.tem_feminino),
    division: safeString(raw.division, "Indefinida"),
  };
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: fetchTechnicalData
   Busca ID, escudo, país e cidade na API-Football, priorizando o
   melhor match pelo nome solicitado para evitar homônimos.
   ═══════════════════════════════════════════════════════════ */
async function fetchTechnicalData(clubName: string): Promise<TechnicalData> {
  const apiKey = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY");
  const fallback: TechnicalData = {
    api_id: null,
    escudo_url: null,
    pais: null,
    cidade: null,
    official_name: null,
  };

  if (!apiKey) return fallback;

  try {
    const url = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(clubName)}`;
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!res.ok) return fallback;

    const json = await res.json();
    const response = Array.isArray(json?.response) ? json.response : [];
    if (response.length === 0) return fallback;

    const requested = normalizeName(clubName);
    const ranked = response
      .map((item: any) => {
        const teamName = String(item?.team?.name ?? "");
        const normalized = normalizeName(teamName);
        const exact = normalized === requested ? 100 : 0;
        const contains = normalized.includes(requested) || requested.includes(normalized) ? 50 : 0;
        const tokenHits = requested
          .split(" ")
          .filter((token) => token.length > 2 && normalized.includes(token)).length;
        const brazilBoost = item?.team?.country === "Brazil" || item?.team?.country === "Brasil" ? 5 : 0;
        return { item, score: exact + contains + tokenHits * 10 + brazilBoost };
      })
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    const best = ranked[0]?.item;
    if (!best) return fallback;

    return {
      api_id: best.team?.id ? String(best.team.id) : null,
      escudo_url: best.team?.logo ?? null,
      pais: best.team?.country ?? null,
      cidade: best.venue?.city ?? null,
      official_name: best.team?.name ?? null,
    };
  } catch (err) {
    console.error("[fetchTechnicalData] erro:", err);
    return fallback;
  }
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: investigateClubWithAI
   Inteligência de busca cruzada com Gemini 2.5 Flash + Google
   Search, com prompt rígido para não copiar cores de clube errado
   nem incluir borda/estrela/patrocínio como cor de tecido.
   ═══════════════════════════════════════════════════════════ */
async function investigateClubWithAI(clubName: string, technical: TechnicalData): Promise<AIEnrichment> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY ausente");
  }

  const country = technical.pais ?? DEFAULT_COUNTRY;
  const officialName = technical.official_name ?? clubName;
  const city = technical.cidade ?? "cidade não informada";

  const systemPrompt = `Você é um auditor sênior de dados de futebol. Responda somente JSON válido, sem markdown.
Nunca misture clubes homônimos. Nunca copie cores de rival ou de outro estado. Se houver ambiguidade, use o clube cujo nome oficial, cidade, país e escudo batem com o alvo.`;

  const userPrompt = `
ALVO EXATO PARA INVESTIGAÇÃO:
- Nome solicitado: "${clubName}"
- Nome técnico/API-Football: "${officialName}"
- País técnico/API-Football: "${country}"
- Cidade técnica/API-Football: "${city}"

FONTES OBRIGATÓRIAS VIA GOOGLE SEARCH:
1) Wikipedia
2) OGOL
3) Site oficial do clube
4) CBF quando o clube for brasileiro

REGRAS ANTI-CONFUSÃO:
- Antes das cores, confirme que o clube investigado é exatamente o alvo acima.
- NÃO confundir Vila Nova-GO com Santa Cruz-PE ou qualquer outro clube rubro/preto/branco.
- NÃO usar cores de borda do escudo, estrelas, contornos, patrocinadores, números ou sombras.
- Usar apenas cores principais do TECIDO do uniforme/camisa titular e identidade oficial.

REGRAS DE QUANTIDADE DE CORES:
- Se o clube é BICOLOR, quantidade_cores = 2 e apenas duas cores em cores_tecido. cor_terciaria e cor_quarta devem ser null.
- Se o clube é TRICOLOR, quantidade_cores = 3 e exatamente três cores em cores_tecido. cor_quarta deve ser null.
- Se o clube é QUADRICOLOR, quantidade_cores = 4 e exatamente quatro cores em cores_tecido. Exemplo: Brusque = amarelo, verde, vermelho e branco.
- A ordem deve refletir força visual/identidade do uniforme: mais dominante primeiro.

DIVISÃO:
- Brasil em 2026: verificar Série A, Série B, Série C, Série D; se não houver nacional, Estadual 1ª a 5ª Divisão.
- Internacional: campeonato nacional principal primeiro, depois divisões inferiores.

FUTEBOL FEMININO:
- tem_feminino = true somente com confirmação de equipe profissional ou base ativa no OGOL ou site oficial.

RETORNE EXCLUSIVAMENTE JSON PURO NESTE FORMATO:
{
  "clube_confirmado": "Nome oficial confirmado",
  "cidade_confirmada": "Cidade ou null",
  "estado_confirmado": "Estado/UF ou null",
  "pais_confirmado": "País",
  "quantidade_cores": 2,
  "cores_tecido": ["#HEX", "#HEX"],
  "cor_primaria": "#HEX",
  "cor_secundaria": "#HEX",
  "cor_terciaria": null,
  "cor_quarta": null,
  "mascote": "NOME",
  "tem_feminino": false,
  "division": "Série X ou Estadual Xª Divisão"
}`.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0,
        topP: 0.1,
        maxOutputTokens: 1400,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errorText.slice(0, 600)}`);
  }

  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Gemini não retornou JSON: ${text.slice(0, 300)}`);
  }

  const raw = JSON.parse(match[0]) as AIInvestigationRaw;
  return buildEnrichmentFromRaw(clubName, raw);
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: PERSISTÊNCIA
   UPSERT em clubes_cache, preservando nome/campos técnicos e
   preenchendo exatamente as colunas de cores conforme quantidade.
   ═══════════════════════════════════════════════════════════ */
async function persistClubData(clubName: string, technical: TechnicalData, ai: AIEnrichment): Promise<PersistedClub> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const payload: PersistedClub = {
    nome: clubName,
    pais: technical.pais ?? DEFAULT_COUNTRY,
    cidade: technical.cidade ?? DEFAULT_CITY,
    api_id: technical.api_id,
    escudo_url: technical.escudo_url,
    cor_primaria: ai.cor_primaria,
    cor_secundaria: ai.cor_secundaria,
    cor_terciaria: ai.cor_terciaria,
    cor_quarta: ai.cor_quarta,
    mascote: ai.mascote,
    tem_feminino: ai.tem_feminino,
    division: ai.division,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase.from("clubes_cache").upsert(payload, { onConflict: "nome" });
  if (error) {
    throw new Error(`Persistência falhou: ${error.message}`);
  }

  return payload;
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: ORQUESTRAÇÃO PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clubName = typeof body?.club_name === "string" ? body.club_name.trim() :
      typeof body?.clubName === "string" ? body.clubName.trim() : "";

    if (clubName.length < 2 || clubName.length > 120) {
      return jsonResponse({ error: "club_name inválido" }, 400);
    }

    console.info(`[enrich] Iniciando: ${clubName}`);

    const technical = await fetchTechnicalData(clubName);
    const ai = await investigateClubWithAI(clubName, technical);
    const persisted = await persistClubData(clubName, technical, ai);

    console.info(
      `[enrich] Salvo: ${clubName} | cores=${[
        persisted.cor_primaria,
        persisted.cor_secundaria,
        persisted.cor_terciaria,
        persisted.cor_quarta,
      ].filter(Boolean).length}`,
    );

    return jsonResponse({ success: true, club: clubName, data: persisted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[enrich] erro:", err);
    return jsonResponse({ error: message }, 500);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO — BLINDAGENS IMPLEMENTADAS v5.0.0]
 * ───────────────────────────────────────────────────────────────────
 * 1. Build Deno compatível com Supabase Edge Functions.
 * 2. `fetchTechnicalData` ranqueia resultados da API-Football por similaridade
 *    para reduzir homônimos e buscar escudo/ID oficiais.
 * 3. `investigateClubWithAI` usa Gemini 2.5 Flash + Google Search com fontes
 *    obrigatórias: Wikipedia, OGOL, Site Oficial e CBF.
 * 4. Prompt anti-confusão exige confirmar identidade do clube antes das cores.
 * 5. Regra explícita contra Vila Nova-GO receber cores de Santa Cruz-PE.
 * 6. Regra anti-borda remove contorno de escudo, estrelas, patrocínio e sombra.
 * 7. Normalização pós-IA força HEX maiúsculo e descarta valores inválidos.
 * 8. Bicolor grava somente `cor_primaria` e `cor_secundaria`.
 * 9. Tricolor grava `cor_primaria`, `cor_secundaria`, `cor_terciaria`.
 * 10. Quadricolor exige quatro HEX válidos antes de persistir.
 * 11. `persistClubData` faz UPSERT em `clubes_cache` com as colunas solicitadas.
 * 12. Service Role fica restrito ao servidor; nenhuma chave é exposta ao cliente.
 * ═══════════════════════════════════════════════════════════════════
 */
