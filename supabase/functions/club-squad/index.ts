/**
 * [CAMINHO]: supabase/functions/club-squad/index.ts
 * [MÓDULO]: ELENCO DO CLUBE — jogadores (posição, camisa, idade, foto), técnico e movimentações (chegadas e saídas).
 * Qualquer time do mundo: o torcedor abre o clube e o servidor busca/atualiza (cache de 12 h, compartilhado por todos).
 * A rotina de hora em hora (modo `refreshTracked`) mantém sempre fresco o elenco dos clubes que já têm torcedor.
 * Proteções: só times que o site conhece, limite de buscas novas por hora e reaproveitamento do cache se a API falhar.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";
const API_BASE = "https://v3.football.api-sports.io";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const TTL_MS = 12 * 60 * 60 * 1000;
const ON_DEMAND_PER_HOUR = 30; // buscas novas por hora disparadas por torcedores
const TRACKED_PER_RUN = 4; // clubes com torcedor renovados a cada rodada da rotina
const MOVE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function af(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": API_KEY } });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return await res.json();
}

type Move = { dir: "in" | "out"; player: string; playerId: number; date: string; type: string; club: { id: number; name: string; logo: string | null } | null };

/** Tipo da transferência sem valores em dinheiro: só "Empréstimo", "Fim de empréstimo" ou "Contratação". */
export function moveKind(type: string | null | undefined): string {
  const t = (type || "").toLowerCase();
  if (t.includes("loan")) return t.includes("back") ? "return" : "loan";
  return "signing";
}

async function refreshTeam(teamId: number) {
  const { data: prev } = await supabase.from("team_squad_cache").select("*").eq("team_id", teamId).maybeSingle();

  const [squadRes, coachRes, trRes] = await Promise.all([
    af(`/players/squads?team=${teamId}`),
    af(`/coachs?team=${teamId}`).catch(() => ({ response: [] })),
    af(`/transfers?team=${teamId}`).catch(() => ({ response: [] })),
  ]);

  const players = ((squadRes?.response?.[0]?.players || []) as any[]).map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age ?? null,
    number: p.number ?? null,
    pos: p.position ?? null,
    photo: p.photo ?? null,
  }));
  // Resposta vazia momentânea da API: não apaga um elenco bom que já temos
  if (!players.length && prev?.players?.length) return prev;

  // Técnico atual: quem tem passagem aberta (sem data final) neste time
  // A API quase nunca fecha a data de saída de quem já foi embora: vários técnicos ficam com passagem "aberta".
  // O atual é o que ENTROU por último entre os que têm passagem aberta neste time.
  let coach: any = prev?.coach ?? null;
  let bestStart = "";
  for (const c of (coachRes?.response || []) as any[]) {
    const current = (c.career || []).find((k: any) => k?.team?.id === teamId && !k?.end);
    const start = String(current?.start || "");
    if (current && start >= bestStart) {
      bestStart = start;
      coach = { id: c.id, name: c.name, age: c.age ?? null, photo: c.photo ?? null, nationality: c.nationality ?? null };
    }
  }

  // Movimentações oficiais (últimos 12 meses)
  const now = Date.now();
  const moves: Move[] = [];
  for (const row of (trRes?.response || []) as any[]) {
    for (const t of (row.transfers || []) as any[]) {
      const when = new Date(t.date).getTime();
      if (!Number.isFinite(when) || now - when > MOVE_WINDOW_MS) continue;
      const inId = t.teams?.in?.id;
      const outId = t.teams?.out?.id;
      if (inId !== teamId && outId !== teamId) continue;
      const dir = inId === teamId ? "in" : "out";
      const other = dir === "in" ? t.teams?.out : t.teams?.in;
      moves.push({
        dir,
        player: row.player?.name,
        playerId: row.player?.id,
        date: t.date,
        type: moveKind(t.type),
        club: other?.id ? { id: other.id, name: other.name, logo: other.logo ?? null } : null,
      });
    }
  }
  moves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  // A API costuma registrar a mesma movimentação em dois dias seguidos: mantém só a mais recente de cada grupo
  const distinct: Move[] = [];
  for (const m of moves) {
    const dup = distinct.some((k) => k.playerId === m.playerId && k.dir === m.dir && Math.abs(new Date(k.date).getTime() - new Date(m.date).getTime()) < 7 * 24 * 3600 * 1000);
    if (!dup) distinct.push(m);
  }
  moves.length = 0;
  moves.push(...distinct);

  // "Visto pela 1ª vez": pega quem entrou no elenco mesmo antes da API registrar a transferência
  const seen: Record<string, string> = { ...(prev?.seen || {}) };
  const firstRun = !prev;
  const nowIso = new Date().toISOString();
  for (const p of players) if (!seen[p.id]) seen[p.id] = firstRun ? "2000-01-01T00:00:00.000Z" : nowIso;

  const row = { team_id: teamId, players, coach, moves: moves.slice(0, 60), seen, updated_at: nowIso };
  await supabase.from("team_squad_cache").upsert(row);
  return row;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!API_KEY) return json({ error: "chave da API ausente" }, 500);
    const body = await req.json().catch(() => ({}));

    // Rotina: renova os clubes que já têm torcedor (os mais antigos primeiro)
    if (body?.refreshTracked) {
      const { data: tracked } = await supabase.from("team_fixtures_cache").select("team_id");
      const ids = ((tracked || []) as any[]).map((r) => Number(r.team_id)).filter(Boolean);
      const { data: have } = ids.length ? await supabase.from("team_squad_cache").select("team_id, updated_at").in("team_id", ids) : { data: [] as any[] };
      const at = new Map<number, number>(((have || []) as any[]).map((r) => [Number(r.team_id), new Date(r.updated_at).getTime()]));
      const due = ids
        .filter((id) => !at.has(id) || Date.now() - (at.get(id) as number) > TTL_MS)
        .sort((a, b) => (at.get(a) ?? 0) - (at.get(b) ?? 0))
        .slice(0, TRACKED_PER_RUN);
      for (const id of due) {
        try {
          await refreshTeam(id);
        } catch (e) {
          console.error("[club-squad] refresh falhou", id, e);
        }
      }
      return json({ ok: true, renovados: due.length, acompanhados: ids.length });
    }

    const teamId = Number(body?.teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) return json({ error: "parâmetros inválidos" }, 400);

    const { data: cached } = await supabase.from("team_squad_cache").select("*").eq("team_id", teamId).maybeSingle();
    const fresh = cached && Date.now() - new Date(cached.updated_at).getTime() < TTL_MS;
    let row: any = cached;

    if (!fresh) {
      // Só times que o site conhece (calendário do mundo, cadastro de clubes ou clubes de torcedores)
      const [{ data: lf }, { data: cc }, { data: tf }] = await Promise.all([
        supabase.from("league_fixtures").select("fixture_id").or(`home_id.eq.${teamId},away_id.eq.${teamId}`).limit(1),
        supabase.from("clubes_cache").select("id").eq("api_id", String(teamId)).limit(1),
        supabase.from("team_fixtures_cache").select("team_id").eq("team_id", teamId).limit(1),
      ]);
      const known = (lf?.length ?? 0) + (cc?.length ?? 0) + (tf?.length ?? 0) > 0;
      if (!known && !cached) return json({ error: "time não encontrado" }, 404);

      const { count } = await supabase
        .from("team_squad_cache")
        .select("team_id", { count: "exact", head: true })
        .gte("updated_at", new Date(Date.now() - 3600 * 1000).toISOString());
      if ((count ?? 0) < ON_DEMAND_PER_HOUR || !cached) {
        try {
          row = await refreshTeam(teamId);
        } catch (e) {
          console.error("[club-squad] falhou, usando cache:", e);
          if (!cached) return json({ error: "elenco indisponível agora" }, 503);
        }
      }
    }
    if (!row) return json({ error: "elenco indisponível agora" }, 503);

    const NEW_MS = 120 * 24 * 60 * 60 * 1000;
    const movesIn = ((row.moves || []) as Move[]).filter((m) => m.dir === "in");
    const recentInIds = new Set(movesIn.filter((m) => Date.now() - new Date(m.date).getTime() < NEW_MS).map((m) => m.playerId));
    const players = ((row.players || []) as any[]).map((p) => ({
      ...p,
      isNew: recentInIds.has(p.id) || (row.seen?.[p.id] && Date.now() - new Date(row.seen[p.id]).getTime() < 30 * 24 * 60 * 60 * 1000),
    }));

    return json({ teamId, updatedAt: row.updated_at, coach: row.coach, players, moves: row.moves || [] });
  } catch (e) {
    console.error("club-squad error:", e);
    return json({ error: "internal" }, 500);
  }
});
