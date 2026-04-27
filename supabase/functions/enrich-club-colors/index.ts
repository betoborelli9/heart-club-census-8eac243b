/* ─────────────────────────────────────────────────────────────
   MÓDULO: IA ENRICH (CORES + MASCOTE + FEMININO) — VERSÃO 2.0
   ALTERAÇÃO: Precisão máxima via prompt + normalização rígida
   NÃO AFETA: API-Football, banco, estrutura geral
───────────────────────────────────────────────────────────── */

async function aiEnrich(clubName: string, country: string | null): Promise<any> {
  const empty = {
    cor_primaria: null,
    cor_secundaria: null,
    cor_terciaria: null,
    cor_quarta: null,
    mascote: null,
    tem_feminino: null,
  };

  if (!LOVABLE_KEY) return empty;

  const system = `
  Você é um ESPECIALISTA MUNDIAL em futebol.
  Você utiliza dados reais da internet (Google Search implícito).
  Você NÃO ERRA cores de clubes.
  Você NÃO inventa.
  Você retorna SOMENTE JSON válido.
  `;

  const user = `
  Clube: "${clubName}" (${country || "Brasil"})

  REGRAS CRÍTICAS:

  1. CORES (OBRIGATÓRIO):
  - Retorne APENAS cores do UNIFORME TITULAR (jersey)
  - NÃO usar cores do escudo se não estiverem no uniforme
  - Formato HEX (#RRGGBB)
  - Máximo 4 cores
  - Ordem por predominância

  Exemplos:
  - Flamengo → ["#FF0000", "#000000"]
  - Santa Cruz → ["#000000", "#FF0000", "#FFFFFF"]
  - Brusque → ["#FFFF00", "#FF0000", "#008000", "#FFFFFF"]

  2. MASCOTE:
  - Nome oficial real
  - Se não tiver mascote oficial → null
  - NÃO inventar

  3. FUTEBOL FEMININO:
  - true = possui time profissional ativo
  - false = não possui

  FORMATO DE RESPOSTA (OBRIGATÓRIO):
  {
    "cor_primaria": "#HEX",
    "cor_secundaria": "#HEX",
    "cor_terciaria": "#HEX ou null",
    "cor_quarta": "#HEX ou null",
    "mascote": "string ou null",
    "tem_feminino": true ou false
  }
  `;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;

    if (!text) return empty;

    const parsed = JSON.parse(text);

    return {
      cor_primaria: normalizeHex(parsed.cor_primaria),
      cor_secundaria: normalizeHex(parsed.cor_secundaria),
      cor_terciaria: normalizeHex(parsed.cor_terciaria),
      cor_quarta: normalizeHex(parsed.cor_quarta),
      mascote: parsed.mascote || null,
      tem_feminino: typeof parsed.tem_feminino === "boolean" ? parsed.tem_feminino : null,
    };
  } catch (err) {
    console.error("Erro IA:", err);
    return empty;
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 92.0
 * - Fallback: Se a API Football não entregar fundação ou estádio, a IA agora os fornece.
 * - Mascote: Parâmetro 'mascote' agora é obrigatório no tool call para evitar nulos.
 * - Sync: Colunas 'feminino' e 'tem_feminino' agora são alimentadas pelo mesmo valor final.
 */
