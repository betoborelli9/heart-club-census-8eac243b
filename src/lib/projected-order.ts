/**
 * [CAMINHO]: src/lib/projected-order.ts
 * [MÓDULO]: Ordem da "tabela provável no fim": pontos esperados (1 casa decimal, a mesma que o torcedor vê na tela);
 * se empatar nessa casa, vale o critério de desempate do campeonato (vitórias no Brasil, saldo de gols, gols pró), com os números
 * de hoje; por fim a posição média das simulações. Assim o que aparece na tela nunca contradiz a regra do campeonato.
 */
export type OrderTeam = { id: number; position: number; win?: number; gf?: number; ga?: number };

const r1 = (v: number) => Math.round(v * 10) / 10;

export function orderByExpected<T extends OrderTeam>(teams: T[], rule: string | undefined, exp: (t: T) => number, mean: (t: T) => number): T[] {
  return [...teams].sort(
    (a, b) =>
      r1(exp(b)) - r1(exp(a)) ||
      (rule === "br" ? (b.win ?? 0) - (a.win ?? 0) : 0) ||
      (b.gf ?? 0) - (b.ga ?? 0) - ((a.gf ?? 0) - (a.ga ?? 0)) ||
      (b.gf ?? 0) - (a.gf ?? 0) ||
      mean(a) - mean(b) ||
      a.position - b.position,
  );
}

/** Pontos esperados com 1 casa decimal no idioma do torcedor (ex.: 68,3). */
export const fmtExpPts = (v: number, lang: string) => v.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
