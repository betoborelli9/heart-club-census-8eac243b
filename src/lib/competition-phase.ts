/**
 * [CAMINHO]: src/lib/competition-phase.ts
 * [MÓDULO]: Em que FASE está a competição do clube, pela rodada do jogo que vem aí (texto da API-Football).
 * Regra geral, para qualquer competição do mundo:
 *  • "knockout" (final, semifinal, quartas, oitavas, play-off…): NÃO existe tabela de classificação — quem perde sai.
 *  • "group" (fase de grupos / fase de liga): mostra só o grupo do clube, nunca todos os grupos misturados.
 *  • "league" (pontos corridos): tabela normal.
 *  • "unknown": sem informação; mantém o comportamento de sempre.
 */
export type Phase = "knockout" | "group" | "league" | "unknown";

const LEAGUE_RE = /regular season|pontos corridos/i;
const GROUP_RE = /(^|\b)(group stage|group|league phase|league stage|fase de grupos|fase de liga|grupo)\b/i;
const KNOCKOUT_RE =
  /(\bfinal\b|finals?\b|semi-?finals?|quarter-?finals?|round of \d+|1\/\d+|play-?offs?|knockout|elimination|eliminat|preliminary|qualif|3rd place|third place|repechage|round-of)/i;

export function competitionPhase(round: string | null | undefined): Phase {
  const r = (round || "").trim();
  if (!r) return "unknown";
  if (LEAGUE_RE.test(r)) return "league";
  if (GROUP_RE.test(r)) return "group";
  if (KNOCKOUT_RE.test(r)) return "knockout";
  return "unknown";
}

type Lang = "pt" | "en" | "es" | string;

const T: Record<string, [RegExp, Record<"pt" | "es", string>]> = {
  r32: [/round of 32|1\/16/i, { pt: "16-avos de final", es: "Dieciseisavos de final" }],
  r16: [/round of 16|1\/8/i, { pt: "Oitavas de final", es: "Octavos de final" }],
  qf: [/quarter-?finals?|1\/4/i, { pt: "Quartas de final", es: "Cuartos de final" }],
  sf: [/semi-?finals?|1\/2/i, { pt: "Semifinal", es: "Semifinal" }],
  third: [/3rd place|third place/i, { pt: "Disputa do 3º lugar", es: "Tercer puesto" }],
  final: [/^\s*final\s*$/i, { pt: "Final", es: "Final" }],
};

/** Nome da fase para o torcedor ("Round of 16" → "Oitavas de final"; "Regular Season - 38" → "Rodada 38"). */
export function roundLabel(round: string | null | undefined, lang: Lang): string {
  const r = (round || "").trim();
  if (!r) return "";
  const l = lang === "es" ? "es" : lang === "en" ? "en" : "pt";
  if (l === "en") return r;
  const num = /(\d+)\s*$/.exec(r)?.[1];
  if (/^regular season/i.test(r) && num) return l === "pt" ? `Rodada ${num}` : `Jornada ${num}`;
  if (/^group stage/i.test(r) && num) return l === "pt" ? `Fase de grupos · Rodada ${num}` : `Fase de grupos · Jornada ${num}`;
  for (const key of ["third", "final", "r32", "r16", "qf", "sf"]) {
    const [re, names] = T[key];
    if (re.test(r)) return names[l];
  }
  if (/play-?offs?/i.test(r)) return l === "pt" ? "Play-offs" : "Play-offs";
  return r;
}
