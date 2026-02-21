export interface Club {
  id: string;
  name: string;
  shortName: string;
  state: string;
  primaryColor: string; // HSL
  secondaryColor: string; // HSL
  emoji: string; // placeholder for crest
}

export const clubs: Club[] = [
  // Série A
  { id: "flamengo", name: "Flamengo", shortName: "FLA", state: "RJ", primaryColor: "0 80% 45%", secondaryColor: "0 0% 10%", emoji: "🔴" },
  { id: "palmeiras", name: "Palmeiras", shortName: "PAL", state: "SP", primaryColor: "140 60% 30%", secondaryColor: "0 0% 98%", emoji: "🟢" },
  { id: "corinthians", name: "Corinthians", shortName: "COR", state: "SP", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "sao-paulo", name: "São Paulo", shortName: "SAO", state: "SP", primaryColor: "0 80% 40%", secondaryColor: "0 0% 10%", emoji: "🔴" },
  { id: "fluminense", name: "Fluminense", shortName: "FLU", state: "RJ", primaryColor: "345 70% 35%", secondaryColor: "140 50% 35%", emoji: "🟤" },
  { id: "vasco", name: "Vasco da Gama", shortName: "VAS", state: "RJ", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "botafogo", name: "Botafogo", shortName: "BOT", state: "RJ", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⭐" },
  { id: "atletico-mg", name: "Atlético Mineiro", shortName: "CAM", state: "MG", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "cruzeiro", name: "Cruzeiro", shortName: "CRU", state: "MG", primaryColor: "220 70% 45%", secondaryColor: "0 0% 95%", emoji: "🔵" },
  { id: "gremio", name: "Grêmio", shortName: "GRE", state: "RS", primaryColor: "210 60% 40%", secondaryColor: "0 0% 10%", emoji: "🔵" },
  { id: "internacional", name: "Internacional", shortName: "INT", state: "RS", primaryColor: "0 80% 42%", secondaryColor: "0 0% 95%", emoji: "🔴" },
  { id: "santos", name: "Santos", shortName: "SAN", state: "SP", primaryColor: "0 0% 95%", secondaryColor: "0 0% 10%", emoji: "⚪" },
  { id: "bahia", name: "Bahia", shortName: "BAH", state: "BA", primaryColor: "220 70% 50%", secondaryColor: "0 80% 45%", emoji: "🔵" },
  { id: "fortaleza", name: "Fortaleza", shortName: "FOR", state: "CE", primaryColor: "220 70% 40%", secondaryColor: "0 80% 45%", emoji: "🔵" },
  { id: "athletico-pr", name: "Athletico Paranaense", shortName: "CAP", state: "PR", primaryColor: "0 80% 35%", secondaryColor: "0 0% 10%", emoji: "🔴" },
  { id: "coritiba", name: "Coritiba", shortName: "CFC", state: "PR", primaryColor: "140 60% 30%", secondaryColor: "0 0% 95%", emoji: "🟢" },
  { id: "ceara", name: "Ceará", shortName: "CEA", state: "CE", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "sport", name: "Sport", shortName: "SPT", state: "PE", primaryColor: "0 80% 40%", secondaryColor: "0 0% 10%", emoji: "🔴" },
  { id: "vitoria", name: "Vitória", shortName: "VIT", state: "BA", primaryColor: "0 80% 40%", secondaryColor: "0 0% 10%", emoji: "🔴" },
  { id: "cuiaba", name: "Cuiabá", shortName: "CUI", state: "MT", primaryColor: "50 80% 45%", secondaryColor: "140 60% 30%", emoji: "🟡" },
  { id: "goias", name: "Goiás", shortName: "GOI", state: "GO", primaryColor: "140 60% 35%", secondaryColor: "0 0% 95%", emoji: "🟢" },
  { id: "america-mg", name: "América Mineiro", shortName: "AME", state: "MG", primaryColor: "140 60% 30%", secondaryColor: "0 0% 10%", emoji: "🟢" },
  { id: "bragantino", name: "Red Bull Bragantino", shortName: "BRA", state: "SP", primaryColor: "0 80% 45%", secondaryColor: "0 0% 95%", emoji: "🔴" },
  { id: "juventude", name: "Juventude", shortName: "JUV", state: "RS", primaryColor: "140 60% 30%", secondaryColor: "0 0% 95%", emoji: "🟢" },
  // Série B + Tradicionais
  { id: "nautico", name: "Náutico", shortName: "NAU", state: "PE", primaryColor: "0 80% 40%", secondaryColor: "0 0% 95%", emoji: "🔴" },
  { id: "santa-cruz", name: "Santa Cruz", shortName: "STC", state: "PE", primaryColor: "0 80% 40%", secondaryColor: "0 0% 10%", emoji: "🔴" },
  { id: "ponte-preta", name: "Ponte Preta", shortName: "PON", state: "SP", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "guarani", name: "Guarani", shortName: "GUA", state: "SP", primaryColor: "140 60% 30%", secondaryColor: "0 0% 95%", emoji: "🟢" },
  { id: "criciuma", name: "Criciúma", shortName: "CRI", state: "SC", primaryColor: "50 80% 50%", secondaryColor: "0 0% 10%", emoji: "🟡" },
  { id: "chapecoense", name: "Chapecoense", shortName: "CHA", state: "SC", primaryColor: "140 60% 30%", secondaryColor: "0 0% 95%", emoji: "🟢" },
  { id: "avai", name: "Avaí", shortName: "AVA", state: "SC", primaryColor: "220 70% 45%", secondaryColor: "0 0% 95%", emoji: "🔵" },
  { id: "figueirense", name: "Figueirense", shortName: "FIG", state: "SC", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "paysandu", name: "Paysandu", shortName: "PAY", state: "PA", primaryColor: "210 60% 45%", secondaryColor: "0 0% 95%", emoji: "🔵" },
  { id: "remo", name: "Remo", shortName: "REM", state: "PA", primaryColor: "220 70% 35%", secondaryColor: "0 0% 95%", emoji: "🔵" },
  { id: "abc", name: "ABC", shortName: "ABC", state: "RN", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "csa", name: "CSA", shortName: "CSA", state: "AL", primaryColor: "220 70% 45%", secondaryColor: "0 0% 95%", emoji: "🔵" },
  { id: "sampaio-correa", name: "Sampaio Corrêa", shortName: "SAM", state: "MA", primaryColor: "50 80% 45%", secondaryColor: "140 60% 30%", emoji: "🟡" },
  { id: "operario", name: "Operário", shortName: "OPE", state: "PR", primaryColor: "0 0% 10%", secondaryColor: "0 0% 95%", emoji: "⚫" },
  { id: "vila-nova", name: "Vila Nova", shortName: "VIL", state: "GO", primaryColor: "0 80% 40%", secondaryColor: "0 0% 95%", emoji: "🔴" },
  { id: "ituano", name: "Ituano", shortName: "ITU", state: "SP", primaryColor: "0 80% 40%", secondaryColor: "0 0% 10%", emoji: "🔴" },
];

export function getClubById(id: string): Club | undefined {
  return clubs.find((c) => c.id === id);
}
