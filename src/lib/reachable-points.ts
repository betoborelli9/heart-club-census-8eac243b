/**
 * [CAMINHO]: src/lib/reachable-points.ts
 * [MÓDULO]: Pontos que um clube REALMENTE pode somar. Cada jogo vale 0, 1 ou 3 pontos; com 1 jogo restante, quem tem 68
 * só pode terminar com 68, 69 ou 71 — nunca com 70. As telas de "Chances" usam isto para nunca mostrar ao torcedor
 * um total de pontos impossível (as médias das simulações, como 69,9, servem só para ordenar a tabela).
 */

/** Quanto se pode ganhar com `games` jogos (ordem crescente, sem repetir). Ex.: 1 jogo → [0, 1, 3]; 2 jogos → [0, 1, 2, 3, 4, 6]. */
export function reachableGains(games: number): number[] {
  const g = Math.max(0, Math.min(Math.floor(games) || 0, 60));
  let gains = new Set<number>([0]);
  for (let i = 0; i < g; i++) {
    const next = new Set<number>();
    gains.forEach((s) => {
      next.add(s);
      next.add(s + 1);
      next.add(s + 3);
    });
    gains = next;
  }
  return [...gains].sort((a, b) => a - b);
}

/** O total de pontos possível mais perto da média esperada (em empate, o menor). */
export function nearestReachableTotal(points: number, expected: number, games: number): number {
  const target = Math.max(0, expected - points);
  let best = 0;
  let bestDist = Infinity;
  for (const gain of reachableGains(games)) {
    const d = Math.abs(gain - target);
    if (d < bestDist) {
      best = gain;
      bestDist = d;
    }
  }
  return points + best;
}

/** Menor ganho possível que alcança `need` pontos (null se nem vencendo tudo dá). Ex.: precisa de 2 com 1 jogo → 3 (só vencendo). */
export function minReachableGain(need: number, games: number): number | null {
  if (need <= 0) return 0;
  return reachableGains(games).find((g) => g >= need) ?? null;
}

export type PointsRow = { points: number; remaining: number; exp: number };

/**
 * Pontos mostrados na "tabela provável no fim", na ordem da tabela: cada clube com o total POSSÍVEL mais perto da sua média.
 * Os números nunca podem "subir" ao descer a tabela (ex.: 65 acima de 66): se o mais perto passar do clube de cima,
 * usa o maior total possível que não passe dele. Assim todo número é um total que o clube realmente pode somar.
 */
export function displayTablePoints(rows: PointsRow[]): number[] {
  const out: number[] = [];
  rows.forEach((r, i) => {
    let v = nearestReachableTotal(r.points, r.exp, r.remaining);
    if (i > 0 && v > out[i - 1]) {
      const cap = out[i - 1];
      const options = reachableGains(r.remaining)
        .map((gain) => r.points + gain)
        .filter((total) => total <= cap);
      v = options.length ? Math.max(...options) : r.points;
    }
    out.push(v);
  });
  return out;
}
