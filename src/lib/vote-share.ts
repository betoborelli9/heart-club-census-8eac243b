/**
 * [CAMINHO]: src/lib/vote-share.ts
 * [MÓDULO]: Fatia de votos de um clube dentro do Heart Club ("15% dos votos"). É a parte dos votos do recorte
 * (mundo, país, estado, cidade...) que o clube tem — NUNCA a porcentagem da torcida do futebol.
 * Só calcula quando o total do recorte é conhecido (a lista do ranking tem limite: se encher, o total real é maior e o % seria falso).
 */

/** Soma dos votos do recorte, ou null se a lista veio cheia (pode haver mais clubes fora dela). */
export function scopeTotal(rows: { votes: number }[], limit: number): number | null {
  if (!rows.length || rows.length >= limit) return null;
  const sum = rows.reduce((a, r) => a + (Number(r.votes) || 0), 0);
  return sum > 0 ? sum : null;
}

/** Texto da fatia: "15%", "<1%" ou null quando não há como calcular. */
export function shareText(votes: number, total: number | null | undefined): string | null {
  if (!total || total <= 0 || !(votes > 0)) return null;
  const p = (votes / total) * 100;
  if (p < 1) return "<1%";
  return `${Math.round(p)}%`;
}
