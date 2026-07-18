/**
 * [CAMINHO]: src/lib/rivalries.ts
 * [CONTEXTO]: Base de rivalidades históricas confiáveis (curada manualmente).
 * Fonte: Wikipedia (clássicos consagrados). Não inventar — só adicionar pares verificados.
 */

const PAIRS: [string, string][] = [
  // Brasil
  ["Flamengo", "Fluminense"],
  ["Flamengo", "Vasco da Gama"],
  ["Flamengo", "Botafogo"],
  ["Vasco da Gama", "Botafogo"],
  ["Fluminense", "Botafogo"],
  ["Corinthians", "Palmeiras"],
  ["Corinthians", "São Paulo"],
  ["Corinthians", "Santos"],
  ["Palmeiras", "São Paulo"],
  ["Palmeiras", "Santos"],
  ["São Paulo", "Santos"],
  ["Atlético-MG", "Cruzeiro"],
  ["Grêmio", "Internacional"],
  ["Athletico-PR", "Coritiba"],
  ["Bahia", "Vitória"],
  ["Sport", "Náutico"],
  ["Sport", "Santa Cruz"],
  ["Náutico", "Santa Cruz"],
  ["Ceará", "Fortaleza"],
  ["Goiás", "Vila Nova"],
  ["Goiás", "Atlético-GO"],
  ["Vila Nova", "Atlético-GO"],
  ["Remo", "Paysandu"],
  ["ABC", "América-RN"],
  // Europa
  ["Real Madrid", "Barcelona"],
  ["Real Madrid", "Atlético de Madrid"],
  ["Barcelona", "Espanyol"],
  ["Manchester United", "Liverpool"],
  ["Manchester United", "Manchester City"],
  ["Manchester United", "Leeds United"],
  ["Liverpool", "Everton"],
  ["Arsenal", "Tottenham Hotspur"],
  ["Chelsea", "Tottenham Hotspur"],
  ["Bayern Munich", "Borussia Dortmund"],
  ["Inter", "AC Milan"],
  ["Juventus", "Inter"],
  ["Juventus", "Torino"],
  ["Roma", "Lazio"],
  ["Napoli", "Roma"],
  ["Paris Saint-Germain", "Olympique de Marseille"],
  ["Porto", "Benfica"],
  ["Porto", "Sporting CP"],
  ["Benfica", "Sporting CP"],
  ["Celtic", "Rangers"],
  ["Ajax", "Feyenoord"],
  ["Galatasaray", "Fenerbahçe"],
  ["Galatasaray", "Beşiktaş"],
  ["Fenerbahçe", "Beşiktaş"],
  // América do Sul
  ["Boca Juniors", "River Plate"],
  ["Peñarol", "Nacional"],
  ["Colo-Colo", "Universidad de Chile"],
  ["Olimpia", "Cerro Porteño"],
  ["Alianza Lima", "Universitario"],
  ["Barcelona SC", "Emelec"],
  ["LDU Quito", "Barcelona SC"],
  ["Millonarios", "Santa Fe"],
  ["América de Cali", "Deportivo Cali"],
  ["Atlético Nacional", "Independiente Medellín"],
];

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function getHistoricalRival(clubName: string | null | undefined): string | null {
  return getHistoricalRivals(clubName)[0] || null;
}

export function getHistoricalRivals(clubName: string | null | undefined, max = 3): string[] {
  if (!clubName) return [];
  const n = norm(clubName);
  const rivals: string[] = [];
  for (const [a, b] of PAIRS) {
    if (norm(a) === n && !rivals.includes(b)) rivals.push(b);
    else if (norm(b) === n && !rivals.includes(a)) rivals.push(a);
    if (rivals.length >= max) break;
  }
  return rivals;
}

/**
 * Apelidos oficiais / variações que a API-Football (e outras fontes) usa
 * para o mesmo clube. Isso garante que a coloração de rivais na tabela
 * de classificação funcione mesmo quando o nome vem "Atletico Goianiense"
 * em vez de "Atlético-GO".
 */
const ALIASES: Record<string, string[]> = {
  "Atlético-GO": ["Atletico Goianiense", "Atlético Goianiense", "AC Goianiense"],
  "Atlético-MG": ["Atletico Mineiro", "Atlético Mineiro", "Clube Atletico Mineiro"],
  "Athletico-PR": ["Athletico Paranaense", "Atlético Paranaense", "Club Athletico Paranaense"],
  "América-RN": ["America de Natal", "América FC RN"],
  "Vila Nova": ["Vila Nova FC", "Vila Nova Goiania"],
  "Goiás": ["Goias EC", "Goias"],
  "Vasco da Gama": ["Vasco", "CR Vasco da Gama"],
  "Grêmio": ["Gremio", "Gremio FBPA"],
  "São Paulo": ["Sao Paulo", "Sao Paulo FC"],
  "Atlético de Madrid": ["Atletico Madrid", "Atletico de Madrid"],
  "Bayern Munich": ["Bayern Munchen", "FC Bayern Munich"],
  "Borussia Dortmund": ["BVB", "Dortmund"],
  "Manchester United": ["Man United", "Man Utd"],
  "Manchester City": ["Man City"],
  "Tottenham Hotspur": ["Tottenham", "Spurs"],
  "Paris Saint-Germain": ["PSG", "Paris SG"],
  "Olympique de Marseille": ["Marseille", "OM"],
  "Sporting CP": ["Sporting", "Sporting Lisbon"],
  "Boca Juniors": ["CA Boca Juniors"],
  "River Plate": ["CA River Plate"],
  "Cerro Porteño": ["Cerro Porteno"],
  "Fenerbahçe": ["Fenerbahce"],
  "Beşiktaş": ["Besiktas"],
  "Peñarol": ["Penarol", "CA Penarol"],
};

/**
 * Retorna todos os nomes/alias normalizados dos rivais para casar contra
 * qualquer string vinda de fonte externa (API-Football, cache, etc).
 */
export function getRivalMatchers(clubName: string | null | undefined, max = 8): string[] {
  const rivals = getHistoricalRivals(clubName, max);
  const out = new Set<string>();
  rivals.forEach((r) => {
    out.add(norm(r));
    (ALIASES[r] || []).forEach((a) => out.add(norm(a)));
  });
  return Array.from(out).filter(Boolean);
}

/**
 * Checa se o nome de um clube (vindo de qualquer fonte) representa um
 * rival histórico do time do coração. Usa contenção bidirecional após
 * normalização — casa "Atletico Goianiense" com o rival "Atlético-GO".
 */
export function isHistoricalRival(rowName: string, clubName: string | null | undefined): boolean {
  if (!rowName || !clubName) return false;
  const target = norm(rowName);
  if (!target) return false;
  const matchers = getRivalMatchers(clubName);
  return matchers.some((m) => m === target || target.includes(m) || m.includes(target));
}
