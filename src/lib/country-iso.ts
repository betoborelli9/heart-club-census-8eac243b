/**
 * [CAMINHO]: src/lib/country-iso.ts
 * [MÓDULO]: Mapeamento de nomes/códigos de países para ISO_A3, usado pelo Heatmap
 *           para colorir o mapa-múndi (world-atlas usa ISO_A3 / nome inglês).
 *           Aceita PT, EN, ISO2 (BR, US) e ISO3 (BRA, USA).
 */

const RAW_MAP: Record<string, string> = {
  // Brasil & vizinhos
  "brasil": "BRA", "brazil": "BRA", "br": "BRA",
  "argentina": "ARG", "ar": "ARG",
  "uruguai": "URY", "uruguay": "URY", "uy": "URY",
  "paraguai": "PRY", "paraguay": "PRY", "py": "PRY",
  "chile": "CHL", "cl": "CHL",
  "bolivia": "BOL", "bo": "BOL",
  "peru": "PER",
  "colombia": "COL", "co": "COL",
  "venezuela": "VEN", "ve": "VEN",
  "equador": "ECU", "ecuador": "ECU", "ec": "ECU",
  "guiana": "GUY", "gy": "GUY",
  "suriname": "SUR", "sr": "SUR",

  // América do Norte
  "eua": "USA", "estados unidos": "USA", "estados unidos da america": "USA",
  "united states": "USA", "united states of america": "USA", "usa": "USA", "us": "USA",
  "canada": "CAN", "ca": "CAN",
  "mexico": "MEX", "mx": "MEX",

  // Europa
  "portugal": "PRT", "pt": "PRT",
  "espanha": "ESP", "spain": "ESP", "es": "ESP",
  "franca": "FRA", "france": "FRA", "fr": "FRA",
  "italia": "ITA", "italy": "ITA", "it": "ITA",
  "alemanha": "DEU", "germany": "DEU", "de": "DEU",
  "inglaterra": "GBR", "reino unido": "GBR", "united kingdom": "GBR", "england": "GBR", "gb": "GBR", "uk": "GBR",
  "irlanda": "IRL", "ie": "IRL",
  "holanda": "NLD", "paises baixos": "NLD", "netherlands": "NLD", "nl": "NLD",
  "belgica": "BEL", "be": "BEL",
  "suica": "CHE", "ch": "CHE",
  "austria": "AUT", "at": "AUT",
  "suecia": "SWE",
  "noruega": "NOR", "no": "NOR",
  "dinamarca": "DNK", "dk": "DNK",
  "finlandia": "FIN", "fi": "FIN",
  "polonia": "POL", "pl": "POL",
  "russia": "RUS", "ru": "RUS",
  "ucrania": "UKR", "ua": "UKR",
  "grecia": "GRC", "gr": "GRC",
  "turquia": "TUR", "tr": "TUR",

  // Ásia
  "china": "CHN", "cn": "CHN",
  "japao": "JPN", "japan": "JPN", "jp": "JPN",
  "coreia do sul": "KOR", "coreia": "KOR", "south korea": "KOR", "kr": "KOR",
  "india": "IND",
  "indonesia": "IDN",
  "vietna": "VNM", "vn": "VNM",
  "tailandia": "THA", "th": "THA",
  "filipinas": "PHL", "ph": "PHL",
  "arabia saudita": "SAU", "sa": "SAU",
  "emirados arabes unidos": "ARE", "ae": "ARE",
  "ira": "IRN",
  "israel": "ISR", "il": "ISR",

  // Oceania
  "australia": "AUS", "au": "AUS",
  "nova zelandia": "NZL", "nz": "NZL",
  "nauru": "NRU", "nr": "NRU",
  "fiji": "FJI", "fj": "FJI",
  "papua nova guine": "PNG", "pg": "PNG",

  // África
  "africa do sul": "ZAF", "south africa": "ZAF", "za": "ZAF",
  "marrocos": "MAR",
  "egito": "EGY", "eg": "EGY",
  "nigeria": "NGA", "ng": "NGA",
  "angola": "AGO", "ao": "AGO",
  "mocambique": "MOZ", "mz": "MOZ",
  "cabo verde": "CPV", "cv": "CPV",
  "quenia": "KEN", "ke": "KEN",
  "etiopia": "ETH",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Retorna o ISO_A3 (3 letras) de um país pelo nome/código, ou null se desconhecido. */
export function countryNameToIso3(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = normalize(name);
  if (RAW_MAP[n]) return RAW_MAP[n];
  // Se já vier como ISO_A3 (ex: "BRA")
  if (/^[a-z]{3}$/.test(n)) return n.toUpperCase();
  return null;
}
