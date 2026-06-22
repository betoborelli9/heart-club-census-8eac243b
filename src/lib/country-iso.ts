/**
 * [CAMINHO]: src/lib/country-iso.ts
 * [MÓDULO]: Mapeamento de nomes de países (PT/EN) para ISO_A3, usado pelo Heatmap
 *           para colorir o mapa-múndi (world-atlas usa ISO_A3 como chave).
 */

const RAW_MAP: Record<string, string> = {
  // Brasil & vizinhos
  "brasil": "BRA", "brazil": "BRA",
  "argentina": "ARG", "uruguai": "URY", "uruguay": "URY",
  "paraguai": "PRY", "paraguay": "PRY", "chile": "CHL",
  "bolivia": "BOL", "peru": "PER", "colombia": "COL",
  "venezuela": "VEN", "equador": "ECU", "ecuador": "ECU",
  "guiana": "GUY", "suriname": "SUR",

  // América do Norte
  "eua": "USA", "estados unidos": "USA", "estados unidos da america": "USA",
  "united states": "USA", "united states of america": "USA", "usa": "USA",
  "canada": "CAN", "mexico": "MEX",

  // Europa
  "portugal": "PRT", "espanha": "ESP", "spain": "ESP",
  "franca": "FRA", "france": "FRA", "italia": "ITA", "italy": "ITA",
  "alemanha": "DEU", "germany": "DEU",
  "inglaterra": "GBR", "reino unido": "GBR", "united kingdom": "GBR", "england": "GBR",
  "irlanda": "IRL", "holanda": "NLD", "paises baixos": "NLD", "netherlands": "NLD",
  "belgica": "BEL", "suica": "CHE", "austria": "AUT",
  "suecia": "SWE", "noruega": "NOR", "dinamarca": "DNK", "finlandia": "FIN",
  "polonia": "POL", "russia": "RUS", "ucrania": "UKR",
  "grecia": "GRC", "turquia": "TUR",

  // Ásia
  "china": "CHN", "japao": "JPN", "japan": "JPN",
  "coreia do sul": "KOR", "coreia": "KOR", "south korea": "KOR",
  "india": "IND", "indonesia": "IDN", "vietna": "VNM",
  "tailandia": "THA", "filipinas": "PHL",
  "arabia saudita": "SAU", "emirados arabes unidos": "ARE", "ira": "IRN", "israel": "ISR",

  // Oceania
  "australia": "AUS", "nova zelandia": "NZL", "nauru": "NRU",
  "fiji": "FJI", "papua nova guine": "PNG",

  // África
  "africa do sul": "ZAF", "south africa": "ZAF",
  "marrocos": "MAR", "egito": "EGY", "nigeria": "NGA",
  "angola": "AGO", "mocambique": "MOZ", "cabo verde": "CPV",
  "quenia": "KEN", "etiopia": "ETH",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Retorna o ISO_A3 (3 letras) de um país pelo nome, ou null se desconhecido. */
export function countryNameToIso3(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = normalize(name);
  if (RAW_MAP[n]) return RAW_MAP[n];
  // Se já vier como ISO_A3 (ex: "BRA")
  if (/^[A-Z]{3}$/.test(name.trim())) return name.trim().toUpperCase();
  return null;
}
