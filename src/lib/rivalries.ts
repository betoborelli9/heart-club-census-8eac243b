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
  if (!clubName) return null;
  const n = norm(clubName);
  for (const [a, b] of PAIRS) {
    if (norm(a) === n) return b;
    if (norm(b) === n) return a;
  }
  return null;
}
