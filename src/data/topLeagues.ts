/**
 * [CAMINHO]: src/data/topLeagues.ts
 * [MÓDULO]: Campeonatos que aparecem primeiro na aba "Jogos" (ids da API-Football), em ordem de destaque.
 * Os demais campeonatos do mundo aparecem em "Mais campeonatos" (lista completa vinda do nosso banco).
 */
export const TOP_LEAGUE_IDS: number[] = [
  // Brasil
  71, 72, 73, 75, 76, 13, 11,
  // Mundo / seleções
  1, 4, 9, 15, 5, 34, 32, 10,
  // Europa — Champions e grandes ligas
  2, 3, 848, 39, 40, 45, 48, 140, 143, 135, 137, 78, 81, 61, 66, 94, 88, 203, 179, 144,
  // Américas e outros
  253, 262, 128, 130, 239, 265, 268, 242, 299, 281, 307,
];

const RANK = new Map(TOP_LEAGUE_IDS.map((id, i) => [id, i]));
export const isTopLeague = (id: number) => RANK.has(id);
/** Menor = mais destaque. Campeonatos fora da lista ficam depois de todos. */
export const leagueRank = (id: number) => RANK.get(id) ?? 10_000;
