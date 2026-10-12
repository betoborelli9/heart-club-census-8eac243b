/**
 * [CAMINHO]: supabase/functions/_shared/standings-projection.ts
 * [MÓDULO]: CLASSIFICAÇÃO AO VIVO — pega a tabela OFICIAL da API e projeta o que ela fica com os jogos em andamento,
 * sem contar nenhum jogo duas vezes e sem errar o desempate. LÓGICA PURA (sem rede, sem banco) para ser testada.
 *
 * Regras de segurança (para "não errar"):
 *  1. Só mexe em tabela de pontos corridos por grupo; cada grupo é projetado separado.
 *  2. Jogos já encerrados que a API ainda não contou (ela atualiza com atraso) são somados UMA vez: comparamos os
 *     jogos da temporada com a coluna "J" oficial de cada time; se não bater de forma limpa (0 a 2 jogos de diferença,
 *     coerente nos dois times), NÃO ajusta nada e confia na oficial.
 *  3. O critério de desempate de cada campeonato é validado contra a própria tabela oficial: se a regra escolhida não
 *     reproduz a ordem oficial, cai para "ordem oficial nos empates" (nunca inventa uma ordem).
 */
export type StRow = {
  teamId: number;
  position: number;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  group?: string | null;
  isLive?: boolean;
  provisional?: boolean;
  [k: string]: any;
};

export type SeasonGame = { id: number; date: string; st: string; h: number; a: number; gh: number | null; ga: number | null };
export type LiveGame = { id: number; h: number; a: number; gh: number | null; ga: number | null };

export const FINISHED = new Set(["FT", "AET", "PEN"]);
export const LIVE_NOW = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);

export type Rule = "br" | "gd" | "h2h" | "official";
const BR = new Set([71, 72, 75, 76]); // Brasileirão A/B/C/D: pontos, vitórias, saldo, gols pró
const H2H = new Set([140, 135, 94]); // Espanha, Itália, Portugal: confronto direto antes do saldo
export const ruleFor = (leagueId: number): Rule => (BR.has(leagueId) ? "br" : H2H.has(leagueId) ? "h2h" : "gd");

const clone = (r: StRow): StRow => ({ ...r });

function addResult(r: StRow, gf: number, ga: number) {
  r.played += 1;
  r.goalsFor += gf;
  r.goalsAgainst += ga;
  r.goalsDiff += gf - ga;
  if (gf > ga) {
    r.points += 3;
    r.win += 1;
  } else if (gf === ga) {
    r.points += 1;
    r.draw += 1;
  } else {
    r.lose += 1;
  }
  r.provisional = true;
}

type Mini = { pts: number; gd: number; gf: number };
function miniTable(ids: number[], games: { h: number; a: number; gh: number; ga: number }[]): Map<number, Mini> {
  const set = new Set(ids);
  const m = new Map<number, Mini>(ids.map((i) => [i, { pts: 0, gd: 0, gf: 0 }]));
  for (const g of games) {
    if (!set.has(g.h) || !set.has(g.a)) continue;
    const H = m.get(g.h)!;
    const A = m.get(g.a)!;
    H.gf += g.gh;
    A.gf += g.ga;
    H.gd += g.gh - g.ga;
    A.gd += g.ga - g.gh;
    if (g.gh > g.ga) H.pts += 3;
    else if (g.gh < g.ga) A.pts += 3;
    else {
      H.pts += 1;
      A.pts += 1;
    }
  }
  return m;
}

/** Ordena as linhas pela regra. Empate total mantém a posição oficial original (`pos0`). */
export function orderRows(rows: StRow[], rule: Rule, games: { h: number; a: number; gh: number; ga: number }[]): StRow[] {
  const pos0 = (r: StRow) => (r as any).pos0 ?? r.position;
  const byPoints = [...rows].sort((a, b) => b.points - a.points || pos0(a) - pos0(b));
  if (rule === "official") return byPoints;

  const out: StRow[] = [];
  for (let i = 0; i < byPoints.length; ) {
    let j = i;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;
    const seg = byPoints.slice(i, j);
    if (seg.length > 1) {
      const mini = rule === "h2h" ? miniTable(seg.map((r) => r.teamId), games) : null;
      seg.sort((a, b) => {
        if (mini) {
          const ma = mini.get(a.teamId)!;
          const mb = mini.get(b.teamId)!;
          if (mb.pts !== ma.pts) return mb.pts - ma.pts;
          if (mb.gd !== ma.gd) return mb.gd - ma.gd;
          if (mb.gf !== ma.gf) return mb.gf - ma.gf;
        }
        if (rule === "br" && b.win !== a.win) return b.win - a.win;
        if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return pos0(a) - pos0(b);
      });
    }
    out.push(...seg);
    i = j;
  }
  return out;
}

type ProjectInput = {
  rows: StRow[]; // UM grupo da tabela oficial
  leagueId: number;
  seasonGames: SeasonGame[]; // jogos da temporada (qualquer status; só os encerrados contam)
  liveGames: LiveGame[]; // jogos em andamento agora
};

export type ProjectOutput = { rows: StRow[]; rule: Rule; reconciled: number; liveApplied: number };

export function projectGroup({ rows, leagueId, seasonGames, liveGames }: ProjectInput): ProjectOutput {
  const base = rows.map((r) => ({ ...clone(r), pos0: r.position }) as StRow);
  const ids = new Set(base.map((r) => r.teamId));
  const finished = seasonGames
    .filter((g) => FINISHED.has(g.st) && ids.has(g.h) && ids.has(g.a) && g.gh != null && g.ga != null)
    .map((g) => ({ ...g, gh: g.gh as number, ga: g.ga as number }));
  const h2hGames = finished.map((g) => ({ h: g.h, a: g.a, gh: g.gh, ga: g.ga }));

  // 1) A regra de desempate precisa reproduzir a ordem OFICIAL; senão, "oficial nos empates".
  let rule: Rule = ruleFor(leagueId);
  const officialOrder = [...base].sort((a, b) => a.position - b.position).map((r) => r.teamId);
  const test = orderRows(base, rule, h2hGames).map((r) => r.teamId);
  if (test.join(",") !== officialOrder.join(",")) rule = "official";

  const byId = new Map(base.map((r) => [r.teamId, r]));

  // 2) Jogos encerrados que a API ainda não contou (compara jogos da temporada com a coluna "J" oficial)
  let reconciled = 0;
  const calc = new Map<number, number>(base.map((r) => [r.teamId, 0]));
  for (const g of finished) {
    calc.set(g.h, (calc.get(g.h) || 0) + 1);
    calc.set(g.a, (calc.get(g.a) || 0) + 1);
  }
  const missing = new Map<number, number>();
  let consistent = true;
  for (const r of base) {
    const d = (calc.get(r.teamId) || 0) - r.played;
    if (d < 0 || d > 2) consistent = false;
    missing.set(r.teamId, d);
  }
  if (consistent && [...missing.values()].some((d) => d > 0)) {
    const recent = [...finished].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const g of recent) {
      if ((missing.get(g.h) || 0) > 0 && (missing.get(g.a) || 0) > 0) {
        addResult(byId.get(g.h)!, g.gh, g.ga);
        addResult(byId.get(g.a)!, g.ga, g.gh);
        missing.set(g.h, missing.get(g.h)! - 1);
        missing.set(g.a, missing.get(g.a)! - 1);
        reconciled++;
      }
    }
  }

  // 3) Jogos em andamento (placar de agora)
  let liveApplied = 0;
  const liveForH2h: { h: number; a: number; gh: number; ga: number }[] = [];
  for (const g of liveGames) {
    if (!ids.has(g.h) || !ids.has(g.a)) continue;
    const gh = g.gh ?? 0;
    const ga = g.ga ?? 0;
    addResult(byId.get(g.h)!, gh, ga);
    addResult(byId.get(g.a)!, ga, gh);
    byId.get(g.h)!.isLive = true;
    byId.get(g.a)!.isLive = true;
    liveForH2h.push({ h: g.h, a: g.a, gh, ga });
    liveApplied++;
  }

  // 4) Reordena e numera
  const ordered = orderRows(base, rule, [...h2hGames, ...liveForH2h]);
  ordered.forEach((r, i) => {
    r.position = i + 1;
    delete (r as any).pos0;
  });
  return { rows: ordered, rule, reconciled, liveApplied };
}

/** Projeta a tabela inteira (vários grupos = cada um separado). Linhas sem grupo formam um grupo só. */
export function projectStandings(rows: StRow[], opts: { leagueId: number; seasonGames: SeasonGame[]; liveGames: LiveGame[] }) {
  const groups = new Map<string, StRow[]>();
  for (const r of rows) {
    const k = r.group || "";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const out: StRow[] = [];
  let reconciled = 0;
  let liveApplied = 0;
  const rules = new Set<Rule>();
  for (const [, g] of groups) {
    const p = projectGroup({ rows: g, ...opts });
    out.push(...p.rows);
    reconciled += p.reconciled;
    liveApplied += p.liveApplied;
    rules.add(p.rule);
  }
  return { rows: out, reconciled, liveApplied, rules: [...rules] };
}
