/**
 * [CAMINHO]: src/data/leagueRules.ts
 * Registro estático de regras de acesso/rebaixamento por competição.
 * Cada entrada define as zonas (para colchetes/cabeçalhos coloridos na tabela)
 * e o painel textual de regras exibido abaixo da classificação.
 *
 * Fonte: regulamentos oficiais das federações/ligas consultadas (regras
 * vigentes na temporada 2026/26-27). Ao adicionar uma nova liga, valide
 * o número exato de vagas antes de commitar.
 */

export type ZoneStyle = { color: string; pulse: boolean };

export interface LeagueZone {
  key: string;
  header?: string; // subcabeçalho exibido logo antes da 1ª linha da zona
  legend: string;
  style: ZoneStyle;
  /** Zona neutra: exibe apenas o subcabeçalho, sem colchete/cor de fundo/legenda. */
  neutral?: boolean;
  /** Verdadeiro se a posição pertence à zona. `total` = nº de times. */
  match: (pos: number, total: number) => boolean;
}

export interface LeagueRuleSection {
  title: string;
  body?: string;
  bullets?: string[];
}

export interface LeagueRules {
  displayName: string;
  zones: LeagueZone[];
  rulesTitle: string;
  sections: LeagueRuleSection[];
}

/* Paleta reaproveitada para manter identidade visual coerente */
const C = {
  orange:  "#ff6200",
  orangeL: "#ff9147",
  green:   "#10b981",
  greenL:  "#34d399",
  blue:    "#3b82f6",
  blueD:   "#1e40af",
  red:     "#ef4444",
  redD:    "#991b1b",
  purple:  "#a855f7",
};

/* ---------------- BRASILEIRÃO SÉRIE A (leagueId 71) ---------------- */
const serieA: LeagueRules = {
  displayName: "Brasileirão Série A",
  zones: [
    { key: "lib_g",  header: "Fase de Grupos da Libertadores",  legend: "Libertadores (Grupos)",
      style: { color: C.blueD, pulse: true },
      match: (p) => p <= 4 },
    { key: "lib_p",  header: "Qualificatória da Libertadores",  legend: "Libertadores (Pré)",
      style: { color: C.blue, pulse: true },
      match: (p) => p >= 5 && p <= 6 },
    { key: "sul",    header: "Copa Sul-Americana",              legend: "Sul-Americana",
      style: { color: C.green, pulse: false },
      match: (p) => p >= 7 && p <= 12 },
    { key: "neutra_a", header: "Zona Neutra", legend: "Zona Neutra",
      style: { color: "rgba(255,255,255,0.35)", pulse: false }, neutral: true,
      match: (p, t) => p >= 13 && p <= t - 4 },
    { key: "reb_a",  header: "Rebaixamento",                    legend: "Rebaixamento",
      style: { color: C.red, pulse: false },
      match: (p, t) => p > t - 4 },
  ],
  rulesTitle: "Regras — Brasileirão Série A",
  sections: [
    { title: "Libertadores (6 vagas diretas)",
      body: "Os 4 primeiros colocados vão direto à fase de grupos da Copa Libertadores da América. 5º e 6º entram na fase preliminar do torneio." },
    { title: "Sul-Americana (6 vagas)",
      body: "Do 7º ao 12º garantem presença na fase de grupos da Copa Sul-Americana." },
    { title: "Zona Neutra",
      body: "Clubes entre 13º e 16º não disputam competições continentais nem correm risco de rebaixamento nesta faixa." },
    { title: "Rebaixamento",
      body: "Os 4 últimos colocados são rebaixados para a Série B da temporada seguinte." },
  ],
};

/* ---------------- BRASILEIRÃO SÉRIE B (leagueId 72) ---------------- */
const serieB: LeagueRules = {
  displayName: "Brasileirão Série B",
  zones: [
    { key: "promocao", header: "Acesso Direto",       legend: "Acesso Direto",
      style: { color: C.orange, pulse: true },
      match: (p) => p <= 2 },
    { key: "playoff",  header: "Play-off de Acesso",  legend: "Play-off de Acesso",
      style: { color: C.orangeL, pulse: true },
      match: (p) => p >= 3 && p <= 6 },
    { key: "neutra_b", header: "Zona Neutra", legend: "Zona Neutra",
      style: { color: "rgba(255,255,255,0.35)", pulse: false }, neutral: true,
      match: (p, t) => p >= 7 && p <= t - 4 },
    { key: "reb_c",    header: "Rebaixamento",        legend: "Rebaixamento",
      style: { color: C.red, pulse: false },
      match: (p, t) => p > t - 4 },
  ],
  rulesTitle: "Regras de Acesso — Campeonato Brasileiro Série B 2026",
  sections: [
    { title: "1. Acesso Direto (Apenas 2 vagas)",
      body: "O formato de pontos corridos com turno e returno (38 rodadas) continua sendo a base. No entanto, apenas o Campeão e o Vice-campeão garantem vaga automática na Série A de 2027." },
    { title: "2. O Novo Playoff (Mata-Mata)",
      body: "As outras duas vagas restantes para a elite serão decididas em um torneio eliminatório pós-fase de grupos. Os clubes que terminarem entre o 3º e o 6º lugar na tabela se enfrentam em jogos de ida e volta:",
      bullets: [
        "Semifinais do Acesso: 3º × 6º e 4º × 5º",
        "Vantagem: os times de melhor campanha (3º e 4º) decidem a segunda partida jogando em casa",
        "Desfecho: os dois vencedores desses confrontos conquistam o acesso à Série A — não há uma final entre eles",
      ] },
    { title: "3. Zona Neutra",
      body: "Clubes posicionados entre a 7ª e a 16ª colocação não disputam playoffs de acesso e permanecem garantidos na Série B para a próxima temporada, sem risco de rebaixamento nesta faixa." },
    { title: "4. Rebaixamento",
      body: "Os 4 últimos colocados caem para a Série C da temporada seguinte." },
  ],
};

/* ---------------- PREMIER LEAGUE (leagueId 39) ---------------- */
const premier: LeagueRules = {
  displayName: "Premier League",
  zones: [
    { key: "ucl", header: "Champions League",   legend: "Champions League",
      style: { color: C.blueD, pulse: true },
      match: (p) => p <= 4 },
    { key: "uel", header: "Europa League",      legend: "Europa League",
      style: { color: C.orange, pulse: false },
      match: (p) => p === 5 },
    { key: "uecl", header: "Conference League", legend: "Conference League",
      style: { color: C.green, pulse: false },
      match: (p) => p === 6 },
    { key: "neutra_pl", header: "Zona Neutra", legend: "Zona Neutra",
      style: { color: "rgba(255,255,255,0.35)", pulse: false }, neutral: true,
      match: (p, t) => p >= 7 && p <= t - 3 },
    { key: "reb_pl", header: "Rebaixamento",    legend: "Rebaixamento",
      style: { color: C.red, pulse: false },
      match: (p, t) => p > t - 3 },
  ],
  rulesTitle: "Regras — Premier League",
  sections: [
    { title: "Champions League (4 vagas diretas)",
      body: "Os 4 primeiros vão à fase de liga da UEFA Champions League. Vagas extras podem surgir via coeficiente UEFA/campeão europeu." },
    { title: "Europa League (1) e Conference (1)",
      body: "5º colocado vai à Europa League; 6º disputa a UEFA Conference League (podendo mudar conforme vencedores das copas domésticas)." },
    { title: "Rebaixamento",
      body: "Os 3 últimos são rebaixados para a EFL Championship." },
  ],
};

/* ---------------- LA LIGA (leagueId 140) ---------------- */
const laLiga: LeagueRules = {
  displayName: "LaLiga",
  zones: [
    { key: "ucl_es", header: "Champions League", legend: "Champions League",
      style: { color: C.blueD, pulse: true }, match: (p) => p <= 4 },
    { key: "uel_es", header: "Europa League",    legend: "Europa League",
      style: { color: C.orange, pulse: false }, match: (p) => p === 5 },
    { key: "uecl_es", header: "Conference League", legend: "Conference League",
      style: { color: C.green, pulse: false }, match: (p) => p === 6 },
    { key: "neutra_es", header: "Zona Neutra", legend: "Zona Neutra",
      style: { color: "rgba(255,255,255,0.35)", pulse: false }, neutral: true,
      match: (p, t) => p >= 7 && p <= t - 3 },
    { key: "reb_es", header: "Rebaixamento", legend: "Rebaixamento",
      style: { color: C.red, pulse: false }, match: (p, t) => p > t - 3 },
  ],
  rulesTitle: "Regras — LaLiga",
  sections: [
    { title: "Champions League (4)", body: "Do 1º ao 4º garantem a fase de liga da UCL." },
    { title: "Europa League / Conference", body: "5º à Europa League; 6º à Conference League (pode variar por vencedor da Copa do Rei)." },
    { title: "Rebaixamento", body: "Os 3 últimos descem para a LaLiga Hypermotion (2ª divisão)." },
  ],
};

/* ---------------- SERIE A ITÁLIA (leagueId 135) ---------------- */
const serieAIt: LeagueRules = {
  displayName: "Serie A (Itália)",
  zones: [
    { key: "ucl_it", header: "Champions League", legend: "Champions League",
      style: { color: C.blueD, pulse: true }, match: (p) => p <= 4 },
    { key: "uel_it", header: "Europa League",    legend: "Europa League",
      style: { color: C.orange, pulse: false }, match: (p) => p === 5 },
    { key: "uecl_it", header: "Conference League", legend: "Conference League",
      style: { color: C.green, pulse: false }, match: (p) => p === 6 },
    { key: "reb_it", header: "Rebaixamento", legend: "Rebaixamento",
      style: { color: C.red, pulse: false }, match: (p, t) => p > t - 3 },
  ],
  rulesTitle: "Regras — Serie A (Itália)",
  sections: [
    { title: "Champions League (4)", body: "Do 1º ao 4º garantem a fase de liga da UCL." },
    { title: "Europa League / Conference", body: "5º à Europa League; 6º à Conference (ajustável pela Coppa Italia)." },
    { title: "Rebaixamento", body: "Os 3 últimos são rebaixados à Serie B." },
  ],
};

/* ---------------- BUNDESLIGA (leagueId 78) ---------------- */
const bundes: LeagueRules = {
  displayName: "Bundesliga",
  zones: [
    { key: "ucl_de", header: "Champions League", legend: "Champions League",
      style: { color: C.blueD, pulse: true }, match: (p) => p <= 4 },
    { key: "uel_de", header: "Europa League",    legend: "Europa League",
      style: { color: C.orange, pulse: false }, match: (p) => p === 5 },
    { key: "uecl_de", header: "Conference League", legend: "Conference League",
      style: { color: C.green, pulse: false }, match: (p) => p === 6 },
    { key: "playoff_de", header: "Play-off de Rebaixamento", legend: "Play-off Rebaixamento",
      style: { color: C.orangeL, pulse: true }, match: (p, t) => p === t - 2 },
    { key: "reb_de", header: "Rebaixamento", legend: "Rebaixamento",
      style: { color: C.red, pulse: false }, match: (p, t) => p > t - 2 },
  ],
  rulesTitle: "Regras — Bundesliga",
  sections: [
    { title: "Champions League (4)", body: "1º ao 4º garantem vaga na fase de liga da UCL." },
    { title: "Europa / Conference", body: "5º disputa a Europa League; 6º a Conference League." },
    { title: "Play-off e Rebaixamento",
      body: "16º disputa play-off de ida e volta com o 3º colocado da 2. Bundesliga; 17º e 18º são rebaixados diretamente." },
  ],
};

/* ---------------- LIGUE 1 (leagueId 61) ---------------- */
const ligue1: LeagueRules = {
  displayName: "Ligue 1",
  zones: [
    { key: "ucl_fr", header: "Champions League", legend: "Champions League",
      style: { color: C.blueD, pulse: true }, match: (p) => p <= 3 },
    { key: "ucl_p_fr", header: "Play-off Champions League", legend: "Play-off UCL",
      style: { color: C.blue, pulse: true }, match: (p) => p === 4 },
    { key: "uel_fr", header: "Europa League",    legend: "Europa League",
      style: { color: C.orange, pulse: false }, match: (p) => p === 5 },
    { key: "uecl_fr", header: "Conference League", legend: "Conference League",
      style: { color: C.green, pulse: false }, match: (p) => p === 6 },
    { key: "playoff_fr", header: "Play-off de Rebaixamento", legend: "Play-off Rebaixamento",
      style: { color: C.orangeL, pulse: true }, match: (p, t) => p === t - 2 },
    { key: "reb_fr", header: "Rebaixamento", legend: "Rebaixamento",
      style: { color: C.red, pulse: false }, match: (p, t) => p > t - 2 },
  ],
  rulesTitle: "Regras — Ligue 1",
  sections: [
    { title: "Champions League", body: "1º ao 3º direto para a fase de liga; 4º disputa play-off preliminar da UCL." },
    { title: "Europa / Conference", body: "5º vai à Europa League; 6º à Conference League." },
    { title: "Play-off e Rebaixamento",
      body: "16º disputa play-off contra o 3º da Ligue 2; 17º e 18º descem direto." },
  ],
};

export const LEAGUE_RULES: Record<number, LeagueRules> = {
  71: serieA,
  72: serieB,
  39: premier,
  140: laLiga,
  135: serieAIt,
  78: bundes,
  61: ligue1,
};

export function getLeagueRules(leagueId: number | undefined | null): LeagueRules | null {
  if (!leagueId) return null;
  return LEAGUE_RULES[leagueId] ?? null;
}

/** Retorna a zona à qual a posição pertence (ou null). */
export function getZoneForPosition(
  leagueId: number | undefined | null,
  pos: number,
  total: number,
): LeagueZone | null {
  const rules = getLeagueRules(leagueId);
  if (!rules) return null;
  return rules.zones.find((z) => z.match(pos, total)) ?? null;
}
