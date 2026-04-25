/**
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: INTELLIGENCE & DATA ENRICHMENT
 * [STATUS]: PRODUÇÃO - VERSÃO 70.0 (MODULAR & SEARCH GROUNDING)
 * [CONTEXTO]: Enriquecimento de dados automatizado com foco em Jersey Accuracy e Divisões 2026.
 * [DESCRIÇÃO]:
 * - Modularização: Divisão em blocos de utilitários, busca técnica e inteligência.
 * - Google Search Grounding: Investigação obrigatória em Wikipedia, Ogol e sites oficiais.
 * - Anti-Borda: Instrução rígida para ignorar pretos/dourados de contorno de escudo.
 * - Rodapé Técnico: Log de versão e rastreabilidade injetado.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: UTILITÁRIOS E LIMPEZA
   ═══════════════════════════════════════════════════════════ */
function cleanResponse(text: string): string {
  // Remove qualquer resquício de markdown ou texto explicativo da IA
  return text.replace(/```json|```/g, "").trim();
}

async function fetchTechnicalData(club_name: string, api_id: string | null, apiKey: string) {
  try {
    const url = api_id
      ? `https://v3.football.api-sports.io/teams?id=${api_id}`
      : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`;

    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    const json = await res.json();
    return json.response?.[0] || null;
  } catch (e) {
    console.error("[MÓDULO TÉCNICO]: Falha na API Football", e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: INVESTIGAÇÃO IA (GROUNDING)
   ═══════════════════════════════════════════════════════════ */
async function investigateClubWithAI(club_name: string, geminiKey: string) {
  const prompt = `Investigue o clube brasileiro "${club_name}" com foco na temporada 2026.
  
  FONTES OBRIGATÓRIAS: Wikipedia, Ogol, Site Oficial do Clube e CBF.
  
  REGRAS DE CORES (IDENTIDADE DE TECIDO):
  1. IGNORE cores de detalhes de ESCUDO (bordas pretas, dourado de estrelas) se não forem as cores principais do uniforme.
  2. CLASSIFICAÇÃO:
     - BICOLOR (Vila Nova, Palmeiras): cor_terciaria e cor_quarta DEVEM ser null.
     - TRICOLOR (São Paulo, Santa Cruz): cor_quarta DEVE ser null.
     - QUADRICOLOR (Brusque): Amarelo, Verde, Vermelho e Branco.
  3. COR_PRIMARIA: Cor identitária de força (Vila=Vermelho, Palmeiras=Verde). JAMAIS use Preto se o clube não for Alvinegro.
  
  REGRAS DE NEGÓCIO:
  4. DIVISÃO 2026: Verifique a série (A, B, C ou D) no Brasileiro 2026.
  5. FEMININO: Confirme se há time profissional/base federado em 2026 (Wikipedia/Ogol).
  6. MASCOTE: Nome oficial histórico.

  RETORNE APENAS JSON: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX ou null", "cor_quarta": "#HEX ou null", "mascote": "NOME", "tem_feminino": boolean, "division": "Série X"}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }], // BUSCA AUTOMÁTICA ATIVA
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    },
  );

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(cleanResponse(text)) : null;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: SERVIÇO PRINCIPAL (ORQUESTRAÇÃO)
   ═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const footballKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[ORQUESTRAÇÃO 70.0]: Iniciando investigação para ${club_name}...`);

    // 1. Busca Dados Técnicos (Logo/ID)
    const technical = await fetchTechnicalData(club_name, api_id, footballKey);

    // 2. Investigação IA com Grounding (Cores/Divisão/Feminino)
    const aiData = await investigateClubWithAI(club_name, geminiKey);

    if (!aiData) throw new Error("Falha na investigação da IA");

    // 3. Persistência
    const payload = {
      nome: club_name,
      api_id: technical?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: technical?.team?.logo || null,
      division: aiData.division,
      mascote: aiData.mascote,
      tem_feminino: aiData.tem_feminino,
      cor_primaria: aiData.cor_primaria,
      cor_secundaria: aiData.cor_secundaria,
      cor_terciaria: aiData.cor_terciaria,
      cor_quarta: aiData.cor_quarta,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error: upsertError } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, club: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ERRO CRÍTICO]:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * VERSÃO: 70.0
 * MODIFICAÇÕES:
 * - Reestruturação modular completa.
 * - Injeção de 'google_search' tool no payload do Gemini.
 * - Regra de bloqueio de cor preta para clubes não-alvinegros (Fix Vila Nova).
 * - Persistência sincronizada com a coluna 'cor_quarta'.
 * PRÓXIMO PASSO: Testar um clube quadricolor (Brusque) para validar a quarta coluna.
 */
