/**
 * [CAMINHO]: src/lib/readable-color.ts
 * [MÓDULO]: Cor de clube LEGÍVEL sobre fundo escuro. Cores escuras (azul-marinho do Cruzeiro, vinho, preto, verde-escuro...)
 * somem no fundo preto do app quando usadas como cor de TEXTO. `readableOnDark` clareia a cor, mantendo o matiz,
 * só até atingir contraste mínimo (WCAG 4,5:1). Cores que já são legíveis ficam exatamente como são.
 * Use em texto, números e bordas finas. Fundos e gradientes podem continuar com a cor original do clube.
 */
const DARK_BG = "#0a0a0a";

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** Contraste (1 a 21) entre duas cores hexadecimais; 21 = preto no branco. */
export function contrastRatio(a: string, b: string = DARK_BG): number {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return 21;
  const la = luminance(ra);
  const lb = luminance(rb);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const toHex = (rgb: [number, number, number]) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** Devolve uma cor legível sobre o fundo escuro do app. Valores que não são hexadecimais (rgba, var(...)) passam sem mudança. */
export function readableOnDark(hex: string, min = 4.5, bg: string = DARK_BG): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const base = toHex(rgb);
  if (contrastRatio(base, bg) >= min) return base;
  for (let t = 0.08; t <= 1.0001; t += 0.04) {
    const mixed: [number, number, number] = [rgb[0] + (255 - rgb[0]) * t, rgb[1] + (255 - rgb[1]) * t, rgb[2] + (255 - rgb[2]) * t];
    const out = toHex(mixed);
    if (contrastRatio(out, bg) >= min) return out;
  }
  return "#ffffff";
}
