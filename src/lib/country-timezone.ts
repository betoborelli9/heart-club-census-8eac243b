/**
 * [CAMINHO]: src/lib/country-timezone.ts
 * [MÓDULO]: Fuso horário oficial por país — usado no painel de Acessos pra
 * mostrar cada acesso no horário local do torcedor (Brasília pros
 * brasileiros, horário oficial do país pros estrangeiros). Isso ajuda o
 * Beto a saber em que horário cada torcedor costuma estar "ao vivo" pra
 * mandar mensagens/banners com mais chance de serem vistos.
 *
 * Países com múltiplos fusos (EUA, Rússia, Canadá, Austrália...) usam um
 * fuso representativo (capital/maior polo) — aproximação aceitável pro
 * objetivo aqui (timing de campanha, não precisão cartorial).
 */
import { countryNameToIso2 } from "@/lib/country-iso";

const DEFAULT_TZ = "America/Sao_Paulo";

const ISO2_TO_TZ: Record<string, string> = {
  BR: "America/Sao_Paulo",
  PT: "Europe/Lisbon",
  US: "America/New_York",
  GB: "Europe/London",
  IE: "Europe/Dublin",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  IT: "Europe/Rome",
  CH: "Europe/Zurich",
  NL: "Europe/Amsterdam",
  BE: "Europe/Brussels",
  AT: "Europe/Vienna",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  PL: "Europe/Warsaw",
  CZ: "Europe/Prague",
  GR: "Europe/Athens",
  TR: "Europe/Istanbul",
  RU: "Europe/Moscow",
  UA: "Europe/Kyiv",
  RO: "Europe/Bucharest",
  HU: "Europe/Budapest",
  LU: "Europe/Luxembourg",
  JP: "Asia/Tokyo",
  CN: "Asia/Shanghai",
  KR: "Asia/Seoul",
  IN: "Asia/Kolkata",
  IL: "Asia/Jerusalem",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  SG: "Asia/Singapore",
  HK: "Asia/Hong_Kong",
  TH: "Asia/Bangkok",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  CA: "America/Toronto",
  MX: "America/Mexico_City",
  AR: "America/Argentina/Buenos_Aires",
  PY: "America/Asuncion",
  UY: "America/Montevideo",
  CL: "America/Santiago",
  BO: "America/La_Paz",
  PE: "America/Lima",
  CO: "America/Bogota",
  VE: "America/Caracas",
  EC: "America/Guayaquil",
  ZA: "Africa/Johannesburg",
  AO: "Africa/Luanda",
  MZ: "Africa/Maputo",
  CV: "Atlantic/Cape_Verde",
  GW: "Africa/Bissau",
  ST: "Africa/Sao_Tome",
  TL: "Asia/Dili",
  EG: "Africa/Cairo",
  MA: "Africa/Casablanca",
  NG: "Africa/Lagos",
};

/** Retorna o fuso IANA "oficial" de um país (nome livre, ISO2 ou ISO3). */
export function countryToTimezone(pais: string | null | undefined): string {
  const iso2 = countryNameToIso2(pais);
  if (iso2 && ISO2_TO_TZ[iso2]) return ISO2_TO_TZ[iso2];
  return DEFAULT_TZ;
}

/** Formata um timestamp no fuso local do país do torcedor + rótulo do fuso. */
export function formatLocalDateTime(iso: string, pais: string | null | undefined): string {
  const tz = countryToTimezone(pais);
  const date = new Date(iso);
  const formatted = date.toLocaleString("pt-BR", { timeZone: tz });
  const tzLabel = tz.split("/").pop()?.replace(/_/g, " ") || tz;
  return `${formatted} (${tzLabel})`;
}
