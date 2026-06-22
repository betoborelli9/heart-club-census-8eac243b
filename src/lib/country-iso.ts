/**
 * [CAMINHO]: src/lib/country-iso.ts
 * [MÓDULO]: Mapeamento de nomes/códigos de países para ISO_A3, usado pelo Heatmap
 *           para colorir o mapa-múndi (world-atlas usa ISO_A3 / nome inglês).
 *           Aceita PT, EN, ISO2 (BR, US) e ISO3 (BRA, USA).
 */

const ISO2_TO_ISO3: Record<string, string> = {
  AD: "AND", AE: "ARE", AF: "AFG", AG: "ATG", AI: "AIA", AL: "ALB", AM: "ARM", AO: "AGO", AQ: "ATA", AR: "ARG", AS: "ASM", AT: "AUT", AU: "AUS", AW: "ABW", AX: "ALA", AZ: "AZE",
  BA: "BIH", BB: "BRB", BD: "BGD", BE: "BEL", BF: "BFA", BG: "BGR", BH: "BHR", BI: "BDI", BJ: "BEN", BL: "BLM", BM: "BMU", BN: "BRN", BO: "BOL", BQ: "BES", BR: "BRA", BS: "BHS", BT: "BTN", BV: "BVT", BW: "BWA", BY: "BLR", BZ: "BLZ",
  CA: "CAN", CC: "CCK", CD: "COD", CF: "CAF", CG: "COG", CH: "CHE", CI: "CIV", CK: "COK", CL: "CHL", CM: "CMR", CN: "CHN", CO: "COL", CR: "CRI", CU: "CUB", CV: "CPV", CW: "CUW", CX: "CXR", CY: "CYP", CZ: "CZE",
  DE: "DEU", DJ: "DJI", DK: "DNK", DM: "DMA", DO: "DOM", DZ: "DZA", EC: "ECU", EE: "EST", EG: "EGY", EH: "ESH", ER: "ERI", ES: "ESP", ET: "ETH", FI: "FIN", FJ: "FJI", FK: "FLK", FM: "FSM", FO: "FRO", FR: "FRA",
  GA: "GAB", GB: "GBR", GD: "GRD", GE: "GEO", GF: "GUF", GG: "GGY", GH: "GHA", GI: "GIB", GL: "GRL", GM: "GMB", GN: "GIN", GP: "GLP", GQ: "GNQ", GR: "GRC", GS: "SGS", GT: "GTM", GU: "GUM", GW: "GNB", GY: "GUY",
  HK: "HKG", HM: "HMD", HN: "HND", HR: "HRV", HT: "HTI", HU: "HUN", ID: "IDN", IE: "IRL", IL: "ISR", IM: "IMN", IN: "IND", IO: "IOT", IQ: "IRQ", IR: "IRN", IS: "ISL", IT: "ITA",
  JE: "JEY", JM: "JAM", JO: "JOR", JP: "JPN", KE: "KEN", KG: "KGZ", KH: "KHM", KI: "KIR", KM: "COM", KN: "KNA", KP: "PRK", KR: "KOR", KW: "KWT", KY: "CYM", KZ: "KAZ",
  LA: "LAO", LB: "LBN", LC: "LCA", LI: "LIE", LK: "LKA", LR: "LBR", LS: "LSO", LT: "LTU", LU: "LUX", LV: "LVA", LY: "LBY", MA: "MAR", MC: "MCO", MD: "MDA", ME: "MNE", MF: "MAF", MG: "MDG", MH: "MHL", MK: "MKD", ML: "MLI", MM: "MMR", MN: "MNG", MO: "MAC", MP: "MNP", MQ: "MTQ", MR: "MRT", MS: "MSR", MT: "MLT", MU: "MUS", MV: "MDV", MW: "MWI", MX: "MEX", MY: "MYS", MZ: "MOZ",
  NA: "NAM", NC: "NCL", NE: "NER", NF: "NFK", NG: "NGA", NI: "NIC", NL: "NLD", NO: "NOR", NP: "NPL", NR: "NRU", NU: "NIU", NZ: "NZL", OM: "OMN",
  PA: "PAN", PE: "PER", PF: "PYF", PG: "PNG", PH: "PHL", PK: "PAK", PL: "POL", PM: "SPM", PN: "PCN", PR: "PRI", PS: "PSE", PT: "PRT", PW: "PLW", PY: "PRY",
  QA: "QAT", RE: "REU", RO: "ROU", RS: "SRB", RU: "RUS", RW: "RWA", SA: "SAU", SB: "SLB", SC: "SYC", SD: "SDN", SE: "SWE", SG: "SGP", SH: "SHN", SI: "SVN", SJ: "SJM", SK: "SVK", SL: "SLE", SM: "SMR", SN: "SEN", SO: "SOM", SR: "SUR", SS: "SSD", ST: "STP", SV: "SLV", SX: "SXM", SY: "SYR", SZ: "SWZ",
  TC: "TCA", TD: "TCD", TF: "ATF", TG: "TGO", TH: "THA", TJ: "TJK", TK: "TKL", TL: "TLS", TM: "TKM", TN: "TUN", TO: "TON", TR: "TUR", TT: "TTO", TV: "TUV", TW: "TWN", TZ: "TZA",
  UA: "UKR", UG: "UGA", UM: "UMI", US: "USA", UY: "URY", UZ: "UZB", VA: "VAT", VC: "VCT", VE: "VEN", VG: "VGB", VI: "VIR", VN: "VNM", VU: "VUT", WF: "WLF", WS: "WSM",
  YE: "YEM", YT: "MYT", ZA: "ZAF", ZM: "ZMB", ZW: "ZWE",
};

const ISO3_TO_ISO2: Record<string, string> = Object.fromEntries(
  Object.entries(ISO2_TO_ISO3).map(([iso2, iso3]) => [iso3, iso2]),
);

const DIRECT_ALIASES: Record<string, string> = {
  eua: "USA",
  "estados unidos": "USA",
  "estados unidos da america": "USA",
  "estados unidos da américa": "USA",
  "united states": "USA",
  "united states of america": "USA",
  usa: "USA",
  uk: "GBR",
  england: "GBR",
  inglaterra: "GBR",
  "reino unido": "GBR",
  "united kingdom": "GBR",
  russia: "RUS",
  "rússia": "RUS",
  china: "CHN",
  brasil: "BRA",
  brazil: "BRA",
  "africa do sul": "ZAF",
  "áfrica do sul": "ZAF",
};

let intlCountryMap: Record<string, string> | null = null;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function getIntlCountryMap(): Record<string, string> {
  if (intlCountryMap) return intlCountryMap;
  const map: Record<string, string> = { ...DIRECT_ALIASES };
  for (const [iso2, iso3] of Object.entries(ISO2_TO_ISO3)) {
    map[normalize(iso2)] = iso3;
    map[normalize(iso3)] = iso3;
  }
  const locales = ["pt-BR", "pt", "en", "en-US", "es", "fr"];
  for (const locale of locales) {
    try {
      const DisplayNames = (Intl as any).DisplayNames;
      if (!DisplayNames) continue;
      const displayNames = new DisplayNames([locale], { type: "region" });
      for (const [iso2, iso3] of Object.entries(ISO2_TO_ISO3)) {
        const name = displayNames.of(iso2);
        if (name) map[normalize(name)] = iso3;
      }
    } catch {
      // Intl.DisplayNames pode não existir em ambientes antigos; códigos ISO continuam funcionando.
    }
  }
  intlCountryMap = map;
  return map;
}

/** Retorna o ISO_A3 (3 letras) de um país pelo nome/código, ou null se desconhecido. */
export function countryNameToIso3(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = normalize(name);
  const map = getIntlCountryMap();
  if (map[n]) return map[n];
  if (/^[a-z]{2}$/.test(n)) return ISO2_TO_ISO3[n.toUpperCase()] || null;
  if (/^[a-z]{3}$/.test(n)) return n.toUpperCase();
  return null;
}

/** Retorna o ISO_A2 (2 letras) de um país pelo nome/código, ou null se desconhecido. */
export function countryNameToIso2(name: string | null | undefined): string | null {
  const iso3 = countryNameToIso3(name);
  return iso3 ? ISO3_TO_ISO2[iso3] || null : null;
}
