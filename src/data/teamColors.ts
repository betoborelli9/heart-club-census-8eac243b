// Mapeamento de cores dos principais clubes brasileiros
// Usado para tematização dinâmica do Dashboard

export interface TeamTheme {
  primary: string;       // HSL values for CSS variable
  primaryHex: string;    // Hex — cor principal da barra
  secondaryHex: string;  // Hex — cor do círculo do escudo
  stripeColors: string[];// Hex[] — cores das faixas diagonais
  glow: string;          // RGBA for glow effects
  textClass: string;     // Tailwind text class
}

export const teamColors: Record<string, TeamTheme> = {
  "Palmeiras":       { primary: "145 100% 20%", primaryHex: "#006437", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(0, 100, 55, 0.35)",   textClass: "text-white" },
  "Flamengo":        { primary: "0 100% 39%",   primaryHex: "#C40000", secondaryHex: "#000000", stripeColors: ["#000000"],                  glow: "rgba(196, 0, 0, 0.35)",    textClass: "text-white" },
  "Corinthians":     { primary: "0 0% 10%",     primaryHex: "#1A1A1A", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(26, 26, 26, 0.5)",    textClass: "text-white" },
  "São Paulo":       { primary: "0 0% 95%",     primaryHex: "#ffffff", secondaryHex: "#000000", stripeColors: ["#C1272D", "#000000"],       glow: "rgba(178, 0, 0, 0.35)",    textClass: "text-black" },
  "Santos":          { primary: "0 0% 15%",     primaryHex: "#262626", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(38, 38, 38, 0.5)",    textClass: "text-white" },
  "Fluminense":      { primary: "340 70% 35%",  primaryHex: "#970045", secondaryHex: "#006437", stripeColors: ["#ffffff", "#006437"],       glow: "rgba(151, 0, 69, 0.35)",   textClass: "text-white" },
  "Vasco":           { primary: "0 0% 8%",      primaryHex: "#141414", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(20, 20, 20, 0.5)",    textClass: "text-white" },
  "Botafogo":        { primary: "0 0% 7%",      primaryHex: "#121212", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(18, 18, 18, 0.5)",    textClass: "text-white" },
  "Grêmio":          { primary: "210 80% 35%",  primaryHex: "#0F52BA", secondaryHex: "#ffffff", stripeColors: ["#ffffff", "#000000"],       glow: "rgba(15, 82, 186, 0.35)",  textClass: "text-white" },
  "Internacional":   { primary: "0 85% 42%",    primaryHex: "#C4161C", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(196, 22, 28, 0.35)",  textClass: "text-white" },
  "Atlético-MG":     { primary: "0 0% 10%",     primaryHex: "#1A1A1A", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(26, 26, 26, 0.5)",    textClass: "text-white" },
  "Cruzeiro":        { primary: "220 85% 40%",  primaryHex: "#003DA5", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(0, 61, 165, 0.35)",   textClass: "text-white" },
  "Athletico-PR":    { primary: "0 80% 35%",    primaryHex: "#A30000", secondaryHex: "#000000", stripeColors: ["#000000"],                  glow: "rgba(163, 0, 0, 0.35)",    textClass: "text-white" },
  "Bahia":           { primary: "215 80% 45%",  primaryHex: "#1758A6", secondaryHex: "#ffffff", stripeColors: ["#ffffff", "#C1272D"],       glow: "rgba(23, 88, 166, 0.35)",  textClass: "text-white" },
  "Fortaleza":       { primary: "0 75% 40%",    primaryHex: "#B30000", secondaryHex: "#003DA5", stripeColors: ["#003DA5", "#ffffff"],       glow: "rgba(179, 0, 0, 0.35)",    textClass: "text-white" },
  "Ceará":           { primary: "0 0% 10%",     primaryHex: "#1A1A1A", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(26, 26, 26, 0.5)",    textClass: "text-white" },
  "Sport":           { primary: "0 100% 30%",   primaryHex: "#990000", secondaryHex: "#000000", stripeColors: ["#000000", "#FFD700"],       glow: "rgba(153, 0, 0, 0.35)",    textClass: "text-white" },
  "Vitória":         { primary: "0 100% 35%",   primaryHex: "#B20000", secondaryHex: "#000000", stripeColors: ["#000000"],                  glow: "rgba(178, 0, 0, 0.35)",    textClass: "text-white" },
  "Coritiba":        { primary: "130 90% 25%",  primaryHex: "#066B06", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(6, 107, 6, 0.35)",    textClass: "text-white" },
  "Ponte Preta":     { primary: "0 0% 10%",     primaryHex: "#1A1A1A", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(26, 26, 26, 0.5)",    textClass: "text-white" },
  "Guarani":         { primary: "140 80% 30%",  primaryHex: "#0F7D0F", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(15, 125, 15, 0.35)",  textClass: "text-white" },
  "Chapecoense":     { primary: "130 85% 28%",  primaryHex: "#0A6E0A", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(10, 110, 10, 0.35)",  textClass: "text-white" },
  "Goiás":           { primary: "130 80% 30%",  primaryHex: "#0F7D0F", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(15, 125, 15, 0.35)",  textClass: "text-white" },
  "Bragantino":      { primary: "0 80% 35%",    primaryHex: "#A30000", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(163, 0, 0, 0.35)",    textClass: "text-white" },
  "Cuiabá":          { primary: "45 90% 45%",   primaryHex: "#DAA520", secondaryHex: "#006437", stripeColors: ["#006437"],                  glow: "rgba(218, 165, 32, 0.35)", textClass: "text-black" },
  "Juventude":       { primary: "130 80% 28%",  primaryHex: "#0A7D0A", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(10, 125, 10, 0.35)",  textClass: "text-white" },
  "América-MG":      { primary: "130 80% 30%",  primaryHex: "#0F7D0F", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(15, 125, 15, 0.35)",  textClass: "text-white" },
  "Náutico":         { primary: "0 90% 35%",    primaryHex: "#AA0000", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(170, 0, 0, 0.35)",    textClass: "text-white" },
  "Santa Cruz":      { primary: "0 85% 35%",    primaryHex: "#A30000", secondaryHex: "#000000", stripeColors: ["#000000", "#ffffff"],       glow: "rgba(163, 0, 0, 0.35)",    textClass: "text-white" },
  "ABC":             { primary: "0 0% 12%",     primaryHex: "#1F1F1F", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(31, 31, 31, 0.5)",    textClass: "text-white" },
  "CSA":             { primary: "215 80% 40%",  primaryHex: "#0D4FA3", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(13, 79, 163, 0.35)",  textClass: "text-white" },
  "CRB":             { primary: "0 85% 38%",    primaryHex: "#B40000", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(180, 0, 0, 0.35)",    textClass: "text-white" },
  "Remo":            { primary: "215 75% 35%",  primaryHex: "#163F8C", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(22, 63, 140, 0.35)",  textClass: "text-white" },
  "Paysandu":        { primary: "210 70% 40%",  primaryHex: "#1F5CB0", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(31, 92, 176, 0.35)",  textClass: "text-white" },
  "Vila Nova":       { primary: "0 85% 38%",    primaryHex: "#B40000", secondaryHex: "#ffffff", stripeColors: ["#ffffff"],                  glow: "rgba(180, 0, 0, 0.35)",    textClass: "text-white" },
  "Sampaio Corrêa":  { primary: "50 100% 50%",  primaryHex: "#FFD700", secondaryHex: "#C1272D", stripeColors: ["#C1272D", "#006400"],       glow: "rgba(255, 215, 0, 0.35)",  textClass: "text-black" },
};

// Default fallback — laranja Heart Club
export const defaultTeamTheme: TeamTheme = {
  primary: "24 100% 50%",
  primaryHex: "#FF6200",
  secondaryHex: "#ffffff",
  stripeColors: ["#ffffff"],
  glow: "rgba(255, 98, 0, 0.3)",
  textClass: "text-white",
};

export function getTeamTheme(clubName: string | null | undefined): TeamTheme {
  if (!clubName) return defaultTeamTheme;
  return teamColors[clubName] ?? defaultTeamTheme;
}
