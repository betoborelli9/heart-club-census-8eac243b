/**
 * [CAMINHO]: src/lib/color-names.ts
 * [MÓDULO]: Conversão de nomes de cor (PT-BR + CSS) para HEX.
 * Aceita "vermelho", "preto", "azul marinho" etc. Retorna #RRGGBB ou null.
 */

const PT_TO_HEX: Record<string, string> = {
  branco: "#FFFFFF",
  preto: "#000000",
  vermelho: "#E32636",
  vinho: "#722F37",
  bordo: "#722F37",
  bordô: "#722F37",
  rosa: "#FF66B2",
  pink: "#FF66B2",
  laranja: "#FF6200",
  amarelo: "#FFD500",
  ouro: "#D4AF37",
  dourado: "#D4AF37",
  prata: "#C0C0C0",
  prateado: "#C0C0C0",
  cinza: "#808080",
  cinzento: "#808080",
  "cinza-claro": "#D3D3D3",
  "cinza claro": "#D3D3D3",
  "cinza-escuro": "#404040",
  "cinza escuro": "#404040",
  azul: "#1E40AF",
  "azul claro": "#3B82F6",
  "azul-claro": "#3B82F6",
  "azul escuro": "#0B1E4A",
  "azul-escuro": "#0B1E4A",
  "azul marinho": "#0B1E4A",
  "azul-marinho": "#0B1E4A",
  "azul royal": "#1E3A8A",
  "azul-royal": "#1E3A8A",
  "azul celeste": "#7CB9E8",
  "azul-celeste": "#7CB9E8",
  ciano: "#00BCD4",
  turquesa: "#1ABC9C",
  verde: "#138808",
  "verde claro": "#7AC74F",
  "verde-claro": "#7AC74F",
  "verde escuro": "#055D2C",
  "verde-escuro": "#055D2C",
  "verde bandeira": "#009C3B",
  "verde-bandeira": "#009C3B",
  "verde limão": "#A8E55C",
  "verde-limao": "#A8E55C",
  marrom: "#654321",
  bege: "#F5F5DC",
  roxo: "#6A0DAD",
  púrpura: "#6A0DAD",
  purpura: "#6A0DAD",
  lilás: "#C8A2C8",
  lilas: "#C8A2C8",
  violeta: "#8A2BE2",
  salmão: "#FA8072",
  salmao: "#FA8072",
  coral: "#FF7F50",
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function cssNameToHex(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const el = document.createElement("div");
    el.style.color = "";
    el.style.color = name;
    if (!el.style.color) return null;
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).color;
    document.body.removeChild(el);
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return null;
    const toHex = (n: string) => parseInt(n, 10).toString(16).padStart(2, "0").toUpperCase();
    return `#${toHex(m[0])}${toHex(m[1])}${toHex(m[2])}`;
  } catch {
    return null;
  }
}

/**
 * Resolve qualquer entrada (HEX, nome PT-BR, nome CSS) para HEX #RRGGBB.
 * Retorna null se não conseguir interpretar.
 */
export function resolveColorToHex(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  // já é HEX
  const hex = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (hex) return `#${hex[1].toUpperCase()}`;
  const hex3 = raw.match(/^#?([0-9a-fA-F]{3})$/);
  if (hex3) {
    const [r, g, b] = hex3[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const key = norm(raw);
  if (PT_TO_HEX[key]) return PT_TO_HEX[key];
  // tenta CSS named
  const cssHex = cssNameToHex(raw);
  if (cssHex) return cssHex;
  return null;
}
