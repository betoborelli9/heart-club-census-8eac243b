/* src/lib/search-clubs.ts
   Busca local-first no arquivo mestre clubs-data.ts
   Case-insensitive + Unaccent (NFD) */

import { CLUBS_DATA } from "@/clubes-data";

const removeAccents = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function serieToLocation(serie: string): string {
  switch (serie) {
    case "A": return "Brasil • Série A";
    case "B": return "Brasil • Série B";
    case "C": return "Brasil • Série C";
    case "D": return "Brasil • Série D";
    case "EUR": return "Europa";
    case "INT": return "América do Sul";
    default: return "Internacional";
  }
}

export interface ClubSearchResult {
  id: string;
  api_id: number;
  name: string;
  shortName: string;
  location: string;
  logo: string;
  city: string | null;
  country: string | null;
}

export function searchClubsLocal(query: string, limit = 10): ClubSearchResult[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = removeAccents(query.toLowerCase().trim());

  const matches = CLUBS_DATA.filter((c) =>
    removeAccents(c.nome.toLowerCase()).includes(normalizedQuery)
  );

  return matches.slice(0, limit).map((c) => ({
    id: String(c.api_id),
    api_id: c.api_id,
    name: c.nome,
    shortName: c.nome_curto,
    location: serieToLocation(c.serie),
    logo: `https://media.api-sports.io/football/teams/${c.api_id}.png`,
    city: null,
    country: serieToLocation(c.serie),
  }));
}
