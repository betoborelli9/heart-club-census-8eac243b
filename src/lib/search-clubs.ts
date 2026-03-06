/* src/lib/search-clubs.ts
   Busca 100% local usando clubs-data.ts como fonte ÚNICA.
   Logos vêm exclusivamente do campo logoUrl de cada clube. */

import { CLUBS_DATA } from "@/clubes-data";

const removeAccents = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export interface ClubSearchResult {
  id: string;
  api_id: number;
  name: string;
  shortName: string;
  location: string;
  logo: string;          // ← sempre clube.logoUrl
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
    logo: c.logoUrl,      // ← direto do dado mestre, sem construção manual
    city: c.cidade,
    state: c.estado,
    country: c.pais,
    mascote: c.mascote,
  }));
}
