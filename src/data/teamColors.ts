// Mapeamento de cores dos principais clubes brasileiros
// Usado para tematização dinâmica do Dashboard

export interface TeamTheme {
  primary: string;    // HSL values for CSS variable
  primaryHex: string; // Hex for inline styles
  glow: string;       // RGBA for glow effects
}

export const teamColors: Record<string, TeamTheme> = {
  "Palmeiras":       { primary: "145 100% 20%", primaryHex: "#006437", glow: "rgba(0, 100, 55, 0.35)" },
  "Flamengo":        { primary: "0 100% 39%",   primaryHex: "#C40000", glow: "rgba(196, 0, 0, 0.35)" },
  "Corinthians":     { primary: "0 0% 10%",     primaryHex: "#1A1A1A", glow: "rgba(26, 26, 26, 0.5)" },
  "São Paulo":       { primary: "0 100% 35%",   primaryHex: "#B20000", glow: "rgba(178, 0, 0, 0.35)" },
  "Santos":          { primary: "0 0% 15%",     primaryHex: "#262626", glow: "rgba(38, 38, 38, 0.5)" },
  "Fluminense":      { primary: "340 70% 35%",  primaryHex: "#970045", glow: "rgba(151, 0, 69, 0.35)" },
  "Vasco":           { primary: "0 0% 8%",      primaryHex: "#141414", glow: "rgba(20, 20, 20, 0.5)" },
  "Botafogo":        { primary: "0 0% 7%",      primaryHex: "#121212", glow: "rgba(18, 18, 18, 0.5)" },
  "Grêmio":          { primary: "210 80% 35%",  primaryHex: "#0F52BA", glow: "rgba(15, 82, 186, 0.35)" },
  "Internacional":   { primary: "0 85% 42%",    primaryHex: "#C4161C", glow: "rgba(196, 22, 28, 0.35)" },
  "Atlético-MG":     { primary: "0 0% 10%",     primaryHex: "#1A1A1A", glow: "rgba(26, 26, 26, 0.5)" },
  "Cruzeiro":        { primary: "220 85% 40%",  primaryHex: "#003DA5", glow: "rgba(0, 61, 165, 0.35)" },
  "Athletico-PR":    { primary: "0 80% 35%",    primaryHex: "#A30000", glow: "rgba(163, 0, 0, 0.35)" },
  "Bahia":           { primary: "215 80% 45%",  primaryHex: "#1758A6", glow: "rgba(23, 88, 166, 0.35)" },
  "Fortaleza":       { primary: "0 75% 40%",    primaryHex: "#B30000", glow: "rgba(179, 0, 0, 0.35)" },
  "Ceará":           { primary: "0 0% 10%",     primaryHex: "#1A1A1A", glow: "rgba(26, 26, 26, 0.5)" },
  "Sport":           { primary: "0 100% 30%",   primaryHex: "#990000", glow: "rgba(153, 0, 0, 0.35)" },
  "Vitória":         { primary: "0 100% 35%",   primaryHex: "#B20000", glow: "rgba(178, 0, 0, 0.35)" },
  "Coritiba":        { primary: "130 90% 25%",  primaryHex: "#066B06", glow: "rgba(6, 107, 6, 0.35)" },
  "Ponte Preta":     { primary: "0 0% 10%",     primaryHex: "#1A1A1A", glow: "rgba(26, 26, 26, 0.5)" },
  "Guarani":         { primary: "140 80% 30%",  primaryHex: "#0F7D0F", glow: "rgba(15, 125, 15, 0.35)" },
  "Chapecoense":     { primary: "130 85% 28%",  primaryHex: "#0A6E0A", glow: "rgba(10, 110, 10, 0.35)" },
  "Goiás":           { primary: "130 80% 30%",  primaryHex: "#0F7D0F", glow: "rgba(15, 125, 15, 0.35)" },
  "Bragantino":      { primary: "0 80% 35%",    primaryHex: "#A30000", glow: "rgba(163, 0, 0, 0.35)" },
  "Cuiabá":          { primary: "45 90% 45%",   primaryHex: "#DAA520", glow: "rgba(218, 165, 32, 0.35)" },
  "Juventude":       { primary: "130 80% 28%",  primaryHex: "#0A7D0A", glow: "rgba(10, 125, 10, 0.35)" },
  "América-MG":      { primary: "130 80% 30%",  primaryHex: "#0F7D0F", glow: "rgba(15, 125, 15, 0.35)" },
  "Náutico":         { primary: "0 90% 35%",    primaryHex: "#AA0000", glow: "rgba(170, 0, 0, 0.35)" },
  "Santa Cruz":      { primary: "0 85% 35%",    primaryHex: "#A30000", glow: "rgba(163, 0, 0, 0.35)" },
  "ABC":             { primary: "0 0% 12%",     primaryHex: "#1F1F1F", glow: "rgba(31, 31, 31, 0.5)" },
  "CSA":             { primary: "215 80% 40%",  primaryHex: "#0D4FA3", glow: "rgba(13, 79, 163, 0.35)" },
  "CRB":             { primary: "0 85% 38%",    primaryHex: "#B40000", glow: "rgba(180, 0, 0, 0.35)" },
  "Remo":            { primary: "215 75% 35%",  primaryHex: "#163F8C", glow: "rgba(22, 63, 140, 0.35)" },
  "Paysandu":        { primary: "210 70% 40%",  primaryHex: "#1F5CB0", glow: "rgba(31, 92, 176, 0.35)" },
};

// Default fallback — laranja Heart Club
export const defaultTeamTheme: TeamTheme = {
  primary: "24 100% 50%",
  primaryHex: "#FF6600",
  glow: "rgba(255, 102, 0, 0.3)",
};

export function getTeamTheme(clubName: string | null | undefined): TeamTheme {
  if (!clubName) return defaultTeamTheme;
  return teamColors[clubName] ?? defaultTeamTheme;
}
