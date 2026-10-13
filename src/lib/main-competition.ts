/**
 * [CAMINHO]: src/lib/main-competition.ts
 * [MÓDULO]: Escolhe o campeonato "de casa" de um clube (liga nacional de pontos corridos), para abrir a página do clube
 * quando o torcedor pesquisa outro time. Copas e torneios continentais ficam por último.
 */
export type CompetitionLite = { leagueId: number; season: number; leagueName?: string | null; country?: string | null; standings?: unknown[] | null };

const CUP_WORDS = /\b(cup|copa|coppa|pokal|taca|champions|libertadores|sudamericana|europa|conference|supercup|supercopa|supercoppa|trophy|presidents|king'?s|recopa|playoffs?|friendl)/i;

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function pickMainCompetition<T extends CompetitionLite>(competitions: T[]): T | null {
  if (!competitions?.length) return null;
  const isCup = (c: T) => CUP_WORDS.test(strip(c.leagueName || "")) || (c.country || "").toLowerCase() === "world";
  const hasTable = (c: T) => (c.standings?.length ?? 0) >= 8;
  return (
    competitions.find((c) => !isCup(c) && hasTable(c)) ||
    competitions.find((c) => !isCup(c)) ||
    competitions.find((c) => hasTable(c)) ||
    competitions[0]
  );
}
