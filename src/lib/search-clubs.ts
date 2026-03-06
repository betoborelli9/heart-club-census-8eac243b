/* src/lib/search-clubs.ts
   Busca local-first no arquivo mestre clubs-data.ts
   Case-insensitive + Unaccent (NFD) */

import { CLUBS_DATA } from "@/clubes-data";

const removeAccents = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CLUB_LOGO_OVERRIDES: Record<string, string> = {
  "Vila Nova": "https://media.api-football.com/teams/1062.png",
  "Anápolis": "https://upload.wikimedia.org/wikipedia/pt/8/85/An%C3%A1polis-GO_%28BRA%29.png",
  "Athletico-PR": "https://media.api-football.com/teams/154.png",
};

export const resolveClubLogo = (clubName: string, apiId: number) => {
  return CLUB_LOGO_OVERRIDES[clubName] || `https://media.api-football.com/teams/${apiId}.png`;
};

export interface ClubSearchResult {
  id: string;
  api_id: number;
  name: string;
  shortName: string;
  location: string;
  logo: string;
  city: string;
  state: string;
  country: string;
  mascote: string;
}

export function searchClubsLocal(query: string, limit = 10): ClubSearchResult[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = removeAccents(query.toLowerCase().trim());

  const matches = CLUBS_DATA.filter((c) =>
    removeAccents(c.nome.toLowerCase()).includes(normalizedQuery) ||
    removeAccents(c.cidade.toLowerCase()).includes(normalizedQuery)
  );

  return matches.slice(0, limit).map((c) => ({
    id: String(c.api_id),
    api_id: c.api_id,
    name: c.nome,
    shortName: c.nome_curto,
    location: `${c.cidade}, ${c.estado}, ${c.pais}`,
    logo: resolveClubLogo(c.nome, c.api_id),
    city: c.cidade,
    state: c.estado,
    country: c.pais,
    mascote: c.mascote,
  }));
}
