/**
 * [CAMINHO]: supabase/functions/fixture-watch/index.ts
 * [MÓDULO]: ONDE ASSISTIR — o robô do Heart Club lê a grade de transmissão de um site de programação de TV
 * (futebolnatv.com.br) e grava os canais dos jogos dos clubes já votados. SEM IA: só leitura de página + conferência
 * de data, horário de Brasília e nome dos dois times (ver _shared/tv-listing.ts).
 * Roda de hora em hora pelo cron (sem parâmetros). Só busca na internet quando há jogo "velho" para atualizar
 * (com canal: 12 h; sem canal/não achado: 6 h), então são poucas páginas por dia, uma a uma, com intervalo.
 * Só olha jogos de clubes que já estão no team_fixtures_cache, nos próximos 8 dias, e NUNCA sobrescreve o que o
 * Beto definiu (fonte = 'admin'). Se a grade não traz o jogo, fica "a confirmar" — não inventa.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brtDate, matchGame, parseListing, type ListedGame } from "../_shared/tv-listing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://www.futebolnatv.com.br";
const USER_AGENT = "Mozilla/5.0 (compatible; HeartClubBot/1.0; +https://votenoseutime.com.br)";
const FALLBACK_LEAGUES = [`${SITE}/liga/brasileirao-serie-b-yphg5kufc2`];
const WINDOW_DAYS = 8;
const FRESH_WITH_CHANNELS_MS = 12 * 60 * 60 * 1000;
const FRESH_EMPTY_MS = 6 * 60 * 60 * 1000;
const PAUSE_MS = 1500; // intervalo entre páginas: leitura educada, uma por vez
const VERSAO = 3;

type Fx = {
  id: number;
  date: string;
  league?: { id?: number; name?: string; round?: string };
  home?: { name?: string };
  away?: { name?: string };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR,pt;q=0.9", Accept: "text/html,application/xml" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.error("[fixture-watch] página", url, res.status);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.error("[fixture-watch] página falhou", url, e);
    return null;
  }
}

async function leagueUrls(): Promise<string[]> {
  const xml = await fetchPage(`${SITE}/site-map.xml`);
  const urls = xml
    ? [...xml.matchAll(/<loc>\s*(https:\/\/www\.futebolnatv\.com\.br\/liga\/[^<\s/]+)\s*<\/loc>/g)].map((m) => m[1])
    : [];
  return urls.length ? [...new Set(urls)] : FALLBACK_LEAGUES;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
  if (!ids.length) return json({ ok: true, candidatos: 0, motivo: "sem jogos nos próximos dias" });

  const { data: existing } = await supabase.from("fixture_watch").select("fixture_id, canais, fonte, buscado_em, versao").in("fixture_id", ids);
  const prev = new Map<number, { canais: string[]; fonte: string }>();
  const skip = new Set<number>();
  for (const e of (existing || []) as any[]) {
    const id = Number(e.fixture_id);
    prev.set(id, { canais: Array.isArray(e.canais) ? e.canais : [], fonte: e.fonte });
    const age = now - new Date(e.buscado_em).getTime();
    const fresh = Number(e.versao) >= VERSAO && age < (e.canais?.length ? FRESH_WITH_CHANNELS_MS : FRESH_EMPTY_MS);
    if (e.fonte === "admin" || fresh) skip.add(id);
  }

  const todo = ids.filter((id) => !skip.has(id));
  if (!todo.length) return json({ ok: true, candidatos: ids.length, pulados: skip.size, paginas: 0, gravados: 0 });

  // 1) jogos de hoje e de amanhã (todas as ligas, uma página cada); 2) só se sobrar jogo sem canal: a página de cada liga
  const listing: ListedGame[] = [];
  let paginas = 0;
  const read = async (url: string, defaultDate?: string) => {
    if (paginas > 0) await sleep(PAUSE_MS);
    paginas++;
    const html = await fetchPage(url);
    if (html) listing.push(...parseListing(html, now, defaultDate));
    return html !== null;
  };
  const okHoje = await read(`${SITE}/jogos-hoje`, brtDate(now, 0));
  const okAmanha = await read(`${SITE}/jogos-amanha`, brtDate(now, 1));

  const pending = () => todo.filter((id) => !matchGame(listing, fixtures.get(id)!));
  if (pending().length) {
    if (paginas > 0) await sleep(PAUSE_MS);
    paginas++;
    const ligas = await leagueUrls();
    for (const url of ligas) await read(url);
  }

  if (!okHoje && !okAmanha && !listing.length) return json({ ok: false, erro: "grade fora do ar", paginas }, 502);

  let gravados = 0;
  let semJogo = 0;
  const exemplos: string[] = [];
  const buscado_em = new Date().toISOString();
  for (const id of todo) {
    const fx = fixtures.get(id)!;
    const hit = matchGame(listing, fx);
    const before = prev.get(id);
    let canais: string[];
    if (hit) canais = hit.channels;
    else {
      semJogo++;
      if (exemplos.length < 6) exemplos.push(`${fx.home?.name} x ${fx.away?.name} (${fx.date.slice(0, 10)})`);
      // a grade não traz o jogo: mantém só o que veio da própria grade; resposta antiga de IA é descartada ("a confirmar")
      canais = before?.fonte === "site" ? before.canais : [];
    }
    const { error: upErr } = await supabase.from("fixture_watch").upsert({ fixture_id: id, canais, fonte: "site", versao: VERSAO, buscado_em });
    if (!upErr) gravados++;
  }

  // Limpeza: some o que tem mais de 30 dias (nunca o que o Beto definiu para jogos futuros).
  await supabase.from("fixture_watch").delete().lt("buscado_em", new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());

  return json({ ok: true, candidatos: ids.length, pulados: skip.size, paginas, jogos_na_grade: listing.length, gravados, sem_jogo_na_grade: semJogo, ...(exemplos.length ? { exemplos } : {}) });
});
