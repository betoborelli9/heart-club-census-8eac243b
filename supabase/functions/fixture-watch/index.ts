/**
 * [CAMINHO]: supabase/functions/fixture-watch/index.ts
 * [MÓDULO]: ONDE ASSISTIR — descobre os canais de TV/streaming dos jogos dos próximos dias.
 * Roda de hora em hora pelo cron (sem parâmetros: não dá para mandar o robô pesquisar "o que quiser").
 * Cada jogo é pesquisado de novo só depois de 20 h (≈ 1x/dia); a fila inicial esvazia em poucas horas.
 * Só pesquisa jogos de clubes que já estão no team_fixtures_cache, nos próximos 8 dias,
 * pula o que foi buscado há menos de 20 h e NUNCA sobrescreve o que o Beto definiu (fonte = 'admin').
 * Se a pesquisa não confirmar o canal, grava lista vazia (o card mostra "a confirmar") — não inventa.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const MAX_PER_RUN = 9; // lotes pequenos (a IA rigorosa demora); o cron roda de hora em hora
const PARALLEL = 3;
const WINDOW_DAYS = 8;
const FRESH_MS = 20 * 60 * 60 * 1000;

type Fx = {
  id: number;
  date: string;
  status?: string;
  league?: { name?: string; round?: string };
  home?: { name?: string };
  away?: { name?: string };
};

function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function cleanChannels(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const c of list) {
    const s = String(c ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= 5) break;
  }
  return out;
}

async function askChannels(fx: Fx): Promise<{ ok: boolean; canais: string[] }> {
  const when = new Date(fx.date);
  const brt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "short" }).format(when);
  const prompt = `Pesquise na web onde assistir ao jogo ${fx.home?.name} x ${fx.away?.name}, pelo campeonato "${fx.league?.name}" (${fx.league?.round || ""}), em ${brt} (horário de Brasília) — ${when.toISOString()} (UTC).
REGRAS (todas obrigatórias):
1. Só vale transmissão confirmada para ESTA partida (mesmos dois times e mesma data), em página de programação, notícia, site oficial do clube, da liga ou da emissora.
2. Liste apenas canais de TV e serviços de streaming, com o nome oficial.
3. NUNCA deduza pelo campeonato, pelo país ou por jogos anteriores.
4. Se houver qualquer dúvida, devolva a lista vazia e confirmado=false.
5. Em "fontes", coloque as URLs (https) das páginas que confirmam este jogo.
Responda APENAS com JSON, sem texto extra: {"canais": ["Canal 1"], "confirmado": true, "fontes": ["https://..."]}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "google_search" }],
      temperature: 0,
    }),
  });
  if (!res.ok) {
    console.error("[fixture-watch] IA erro", res.status, (await res.text()).slice(0, 200));
    return { ok: false, canais: [] };
  }
  const data = await res.json();
  const parsed = extractJson(data?.choices?.[0]?.message?.content || "");
  if (!parsed) return { ok: false, canais: [] };
  // Só aceita se a IA marcou como confirmado E apontou pelo menos uma fonte https. Senão: "a confirmar".
  const fontes = Array.isArray(parsed.fontes) ? parsed.fontes.filter((u: unknown) => typeof u === "string" && u.startsWith("https://")) : [];
  const confirmado = parsed.confirmado === true && fontes.length > 0;
  return { ok: true, canais: confirmado ? cleanChannels(parsed.canais) : [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!LOVABLE_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: caches, error } = await supabase.from("team_fixtures_cache").select("payload");
  if (error) return json({ error: error.message }, 500);

  const now = Date.now();
  const limit = now + WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const fixtures = new Map<number, Fx>();
  for (const row of caches || []) {
    const payload: any = (row as any).payload;
    for (const f of (payload?.next || []) as Fx[]) {
      const t = new Date(f.date).getTime();
      const finished = payload?.live_state?.[f.id]?.finished;
      if (f?.id && t > now - 3 * 60 * 60 * 1000 && t < limit && !finished) fixtures.set(f.id, f);
    }
  }

  const ids = [...fixtures.keys()];
  if (!ids.length) return json({ ok: true, buscados: 0, motivo: "sem jogos nos próximos dias" });

  const { data: existing } = await supabase.from("fixture_watch").select("fixture_id, fonte, buscado_em, versao").in("fixture_id", ids);
  const skip = new Set<number>();
  for (const e of existing || []) {
    const fresh = now - new Date((e as any).buscado_em).getTime() < FRESH_MS;
    if ((e as any).fonte === "admin" || (fresh && Number((e as any).versao) >= 2)) skip.add(Number((e as any).fixture_id));
  }

  const todo = ids
    .filter((id) => !skip.has(id))
    .sort((a, b) => new Date(fixtures.get(a)!.date).getTime() - new Date(fixtures.get(b)!.date).getTime())
    .slice(0, MAX_PER_RUN);

  let gravados = 0;
  let falhas = 0;
  const work = async (id: number) => {
    try {
      const r = await askChannels(fixtures.get(id)!);
      if (!r.ok) {
        falhas++;
        return;
      }
      const { error: upErr } = await supabase
        .from("fixture_watch")
        .upsert({ fixture_id: id, canais: r.canais, fonte: "ia", versao: 2, buscado_em: new Date().toISOString() });
      if (upErr) falhas++;
      else gravados++;
    } catch (e) {
      console.error("[fixture-watch] falhou", id, e);
      falhas++;
    }
  };
  for (let i = 0; i < todo.length; i += PARALLEL) {
    await Promise.all(todo.slice(i, i + PARALLEL).map(work));
  }

  // Limpeza: some o que tem mais de 30 dias (nunca o que o Beto definiu para jogos futuros).
  await supabase.from("fixture_watch").delete().lt("buscado_em", new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());

  return json({ ok: true, candidatos: ids.length, pulados: skip.size, gravados, falhas });
});
