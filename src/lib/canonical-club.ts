/**
 * [CAMINHO]: src/lib/canonical-club.ts
 * [CONTEXTO]: Canonicalização de nomes de clube — espelho TS da função SQL
 *             `public.canonical_clube_key`. Usado para deduplicar resultados de
 *             busca antes de mostrar ao torcedor (ex.: "Sport Club Corinthians
 *             Paulista" e "Corinthians" devem virar um único item).
 */

const GENERIC_TOKENS = new RegExp(
  String.raw`\b(sport club|sport clube|football club|futebol clube|futbol club|clube de regatas|clube atletico|associacao atletica|esporte clube|esporte club|sociedade esportiva|club deportivo|atletico club|clube de futebol|sport recife|sport|club|clube|fc|sc|ec|ac|cr|cf|aa|se|cd|ca|paulista|paulistano|carioca|mineiro|gaucho|catarinense|baiano)\b`,
  "g",
);

// Stopwords PT/EN/ES que ficam após remover tokens genéricos
// (ex.: "clube de regatas do flamengo" -> "do flamengo" -> "flamengo").
const STOPWORDS = /\b(do|da|de|dos|das|of|the|el|la|los|las|del)\b/g;

export function canonicalClubKey(name: string | null | undefined): string {
  if (!name) return "";
  let s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  s = s.replace(/[^a-z0-9 ]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(GENERIC_TOKENS, " ");
  s = s.replace(STOPWORDS, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Tokens significativos da query (após canonicalização), úteis para
 * buscas ilike adicionais no cache. Ex.: "Clube de Regatas do Flamengo"
 * -> ["flamengo"]; "Atlético Mineiro" -> ["atletico"].
 */
export function canonicalTokens(name: string | null | undefined): string[] {
  const k = canonicalClubKey(name);
  if (!k) return [];
  return k.split(" ").filter((t) => t.length >= 3);
}
