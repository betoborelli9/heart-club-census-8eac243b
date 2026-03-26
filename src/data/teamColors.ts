/**
 * ARQUIVO: src/data/teamColors.ts
 * MÓDULO: MOTOR DE CONVERSÃO DE CORES (HEX -> THEME)
 * STATUS: SUPORTE A 3 CORES + FAIXAS DINÂMICAS
 */

export interface TeamTheme {
  name: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex?: string;
  textClass: "text-white" | "text-black";
  glow: string;
  stripeColors: string[];
}

// Configuração padrão (Caso tudo falhe)
export const defaultTeamTheme: TeamTheme = {
  name: "Heart Club",
  primaryHex: "#ff6200",
  secondaryHex: "#ffffff",
  textClass: "text-white",
  glow: "rgba(255, 98, 0, 0.5)",
  stripeColors: ["#ff6200", "#ffffff"],
};

/**
 * MÓDULO: GERADOR DE TEMA DINÂMICO
 * Transforma cores HEX do Supabase em um objeto de tema completo.
 */
export const hexToTeamTheme = (primary: string, secondary: string, accent?: string): TeamTheme => {
  const p = primary || "#1a1a1a";
  const s = secondary || "#ffffff";
  const a = accent || p;

  // Lógica simples para decidir se o texto sobre a cor primária deve ser branco ou preto
  const isLight = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  return {
    name: "Dynamic",
    primaryHex: p,
    secondaryHex: s,
    accentHex: a,
    textClass: isLight(p) ? "text-black" : "text-white",
    glow: `${p}80`,
    // Aqui geramos as faixas que aparecerão no banner
    stripeColors: [p, s, a],
  };
};

// Mapeamento Estático (Opcional - Cache Local para os Gigantes)
export const teamColors: Record<string, TeamTheme> = {
  "Sao Paulo": {
    name: "São Paulo",
    primaryHex: "#FFFFFF",
    secondaryHex: "#FF0000",
    accentHex: "#000000",
    textClass: "text-black",
    glow: "rgba(255, 0, 0, 0.3)",
    stripeColors: ["#FF0000", "#000000", "#FFFFFF"],
  },
  "Vila Nova": {
    name: "Vila Nova",
    primaryHex: "#FF0000",
    secondaryHex: "#FFFFFF",
    textClass: "text-white",
    glow: "rgba(255, 255, 255, 0.3)",
    stripeColors: ["#FFFFFF", "#FF0000"],
  },
};

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/data/teamColors.ts
 * MÓDULO: MOTOR DE CONVERSÃO DE CORES
 * VERIFICAÇÃO: SE VOCÊ ESTÁ VENDO ISSO, O ARQUIVO ESTÁ COMPLETO.
 */
