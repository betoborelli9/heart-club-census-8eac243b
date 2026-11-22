/**
 * [CAMINHO]: supabase/functions/_shared/tv-web.ts
 * [MÓDULO]: ONDE ASSISTIR — PESQUISA NA INTERNET (qualquer jogo do mundo). Funções puras (sem rede/banco).
 * Quando a grade de TV não traz o jogo, o Heart Club faz o que o torcedor faz no Google: pesquisa "onde assistir
 * <Time A> x <Time B>", abre as reportagens (Goal, ge, ESPN…) e lê quais canais elas dizem que transmitem.
 *
 * REGRA DE OURO (a IA já inventou canal antes): nada entra se não estiver ESCRITO na reportagem.
 *  - a manchete precisa citar os DOIS times e falar de transmissão;
 *  - a reportagem precisa citar o DIA do jogo;
 *  - cada canal que a IA devolve precisa aparecer palavra por palavra no texto da página (senão é descartado);
 *  - com 2 ou mais reportagens, só ficam os canais que a maioria confirma.
 * Se nada disso for provado, o jogo continua "a confirmar".
 */
import { normTeam, normalizeChannel, toBrt } from "./tv-listing.ts";
import { marketFor } from "./club-news-local.ts";

const norm = (s: string): string =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// Nome do mês de cada mês (1–12), sem acento, nas línguas de escrita latina mais comuns (para achar o dia do jogo no texto).
const MONTH_NAMES: string[][] = [
  ["janeiro", "enero", "january", "jan", "gennaio", "janvier", "januar", "januari", "ocak", "stycznia", "ledna", "ianuarie", "tammikuuta", "januarie"],
  ["fevereiro", "febrero", "february", "feb", "febbraio", "fevrier", "februar", "februari", "subat", "lutego", "unora", "februarie", "helmikuuta"],
  ["marco", "marzo", "march", "mar", "mars", "marz", "maart", "mart", "marca", "brezna", "martie", "maaliskuuta"],
  ["abril", "april", "apr", "aprile", "avril", "nisan", "kwietnia", "dubna", "aprilie", "huhtikuuta"],
  ["maio", "mayo", "may", "maggio", "mai", "mei", "mayis", "maja", "kvetna", "mai", "toukokuuta"],
  ["junho", "junio", "june", "jun", "giugno", "juin", "juni", "haziran", "czerwca", "cervna", "iunie", "kesakuuta"],
  ["julho", "julio", "july", "jul", "luglio", "juillet", "juli", "temmuz", "lipca", "cervence", "iulie", "heinakuuta"],
  ["agosto", "august", "aug", "aout", "augustus", "agustos", "sierpnia", "srpna", "elokuuta"],
  ["setembro", "septiembre", "setiembre", "september", "sep", "sept", "settembre", "septembre", "eylul", "wrzesnia", "zari", "septembrie", "syyskuuta"],
  ["outubro", "octubre", "october", "oct", "ottobre", "octobre", "oktober", "ekim", "pazdziernika", "rijna", "octombrie", "lokakuuta"],
  ["novembro", "noviembre", "november", "nov", "novembre", "kasim", "listopada", "listopadu", "noiembrie", "marraskuuta", "studenoga"],
  ["dezembro", "diciembre", "december", "dec", "dicembre", "decembre", "dezember", "aralik", "grudnia", "prosince", "decembrie", "joulukuuta", "prosinca"],
];

export type Fx = { date: string; home?: { name?: string }; away?: { name?: string } };

/** Onde e em que língua pesquisar: Brasil (português) ou o país do jogo (língua de lá, escrita latina). */
export type WebMarket = { cc: string; lang: string; scope: string; phrase: string; local: boolean };
export type WebQuery = { q: string; cc: string; lang: string };

export const BRAZIL_MARKET: WebMarket = { cc: "br", lang: "pt-BR", scope: "Brasil", phrase: "onde assistir", local: false };

// "onde assistir" na língua de cada país (só escritas latinas: o casamento é pelo nome do time em letras latinas)
const PHRASES: Record<string, string> = {
  es: "dónde ver", en: "where to watch", it: "dove vedere", fr: "où regarder", de: "wo sehen Übertragung", nl: "waar kijken", tr: "hangi kanalda canlı",
  pl: "gdzie oglądać", cs: "kde sledovat", sk: "kde sledovať", ro: "unde vezi", sv: "var kan man se", nb: "hvor se", da: "hvor kan man se", fi: "missä katsoa",
  hu: "hol nézhető", hr: "gdje gledati", sr: "gde gledati", sl: "kje gledati", id: "nonton di mana", vi: "xem ở đâu", ms: "tonton di mana", pt: "onde assistir",
};

/** Mercado de pesquisa do país do jogo. País desconhecido, continental ("World", "Europe") ou de escrita não latina → Brasil. */
export function marketForGame(country?: string | null): WebMarket {
  const c = (country || "").trim();
  if (!c || ["brazil", "brasil", "world"].includes(norm(c))) return BRAZIL_MARKET;
  const mk = marketFor(c);
  if (!mk.known || !mk.latin) return BRAZIL_MARKET;
  const lang2 = mk.lang.split("-")[0].toLowerCase();
  if (mk.cc === "br") return BRAZIL_MARKET;
  return { cc: mk.cc, lang: mk.lang, scope: c, phrase: PHRASES[lang2] ?? "where to watch", local: true };
}

/** Buscas na internet para um jogo no mercado dado (padrão: Brasil, em português). */
export function webQueries(fx: Fx, market: WebMarket = BRAZIL_MARKET): WebQuery[] {
  const h = (fx.home?.name || "").trim();
  const a = (fx.away?.name || "").trim();
  if (!h || !a) return [];
  // sem pontos nem letra solta ("U. Catolica" → "Catolica"): a imprensa escreve "Universidad Católica", e a busca solta acha mais
  const bare = (s: string) => s.replace(/[.\-]/g, " ").split(/\s+/).filter((t) => t.length > 1).join(" ");
  const base = { cc: market.cc, lang: market.lang };
  const qs = market.local
    ? [`"${h}" "${a}" ${market.phrase}`, `${bare(h)} ${bare(a)} ${market.phrase}`]
    : [`"${h}" "${a}" onde assistir`, `${h} x ${a} onde assistir ao vivo transmissão`, `${bare(h)} ${bare(a)} onde assistir`];
  return qs.map((q) => ({ q, ...base }));
}

// Palavras de "transmissão" nas línguas de escrita latina mais comuns (a manchete de "onde assistir" é assim em todo lugar).
const BROADCAST_RX = new RegExp(
  "\\b(" +
    [
      "assistir", "assista", "transmiss\\w*", "transmite", "transmitir", "canal", "canais", "tv", "streaming", "ao vivo", "horario", "passa", "passar",
      "watch", "stream", "live", "channel", "channels", "broadcast", "kick off", "kick-off", "how to watch", "tv channel",
      "donde ver", "ver", "en vivo", "en directo", "transmision", "emision", "canal de tv",
      "dove vedere", "come vedere", "diretta", "dove", "streaming",
      "regarder", "diffusion", "direct", "chaine", "comment regarder",
      "wo sehen", "wo laeuft", "ubertragung", "livestream", "sendung",
      "waar kijken", "uitzending", "zender", "kijken",
      "izle", "canli", "yayin", "hangi kanalda", "kanal", "kanali",
      "gdzie ogladac", "ogladac", "transmisja", "kde sledovat", "sledovat", "prenos", "unde vezi", "unde", "urmareste",
      "var kan man se", "hvor se", "hvor kan", "katso", "nonton", "tonton",
    ].join("|") +
    ")\\b",
);

/** A manchete fala de transmissão? ("onde assistir", "where to watch", "dónde ver", "wo sehen", "canal", "ao vivo"…) */
export function isBroadcastTitle(title: string): boolean {
  return BROADCAST_RX.test(norm(title));
}

/** O nome do time aparece no texto (também com a forma curta do apelido: "Atlético-GO" ≈ "Atlético Goianiense"). */
export function teamInText(teamName: string, text: string): boolean {
  const words = new Set(norm(text).split(" "));
  const has = (toks: string[]) => toks.length > 0 && toks.every((t) => words.has(t));
  const raw = norm(teamName).split(" ").filter((t) => t.length > 1 && !["fc", "ec", "sc", "ac", "cf", "cd", "de", "do", "da", "clube", "club"].includes(t));
  return has(normTeam(teamName)) || has(raw);
}

/** A manchete é sobre ESTE jogo (os dois times) e fala de transmissão. */
export function titleIsAboutGame(title: string, fx: Fx): boolean {
  if (!fx.home?.name || !fx.away?.name) return false;
  return isBroadcastTitle(title) && teamInText(fx.home.name, title) && teamInText(fx.away.name, title);
}

/** O texto cita o DIA do jogo (dia/mês em Brasília): "22/11", "22 de novembro", "dia 22", "domingo (22)". */
export function mentionsGameDay(text: string, kickoffIso: string): boolean {
  const { date } = toBrt(kickoffIso);
  const day = Number(date.slice(8, 10));
  const month = Number(date.slice(5, 7));
  const year = date.slice(0, 4);
  const t = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ı/g, "i");
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const names = MONTH_NAMES[month - 1].join("|");
  return (
    new RegExp(`(?<!\\d)0?${day}\\s*/\\s*(0?${month}|${mm})(?!\\d)`).test(t) || // 22/11
    new RegExp(`(?<!\\d)0?${day}(?:st|nd|rd|th|\\.|o|º)?\\s+(?:de\\s+|of\\s+)?(?:${names})(?![a-z])`).test(t) || // 22 de novembro, 22 November, 22. November
    new RegExp(`(?:${names})\\.?\\s+0?${day}(?:st|nd|rd|th)?(?!\\d)`).test(t) || // November 22
    new RegExp(`\\b(?:dia|el dia|el|le|il|am|op|den|dnia)\\s+0?${day}(?!\\d)`).test(t) || // dia 22, el 22, le 22
    new RegExp(`\\(\\s*0?${day}\\s*\\)`).test(t) || // domingo (22)
    new RegExp(`(?<!\\d)${dd}[.\\-]${mm}(?![\\d])`).test(t) || // 22.11 / 22-11
    new RegExp(`(?<!\\d)${year}-${mm}-${dd}(?!\\d)`).test(t) // 2026-11-22
  );
}

/** Texto visível da página inteira (sem menus, scripts e estilos). */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer|aside|form|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Só os trechos do texto que falam de transmissão (até ~6 mil caracteres), para a IA ler. */
export function transmissionWindows(text: string): string {
  const hits: number[] = [];
  const re =
    /onde assistir|como assistir|onde vai passar|vai passar|transmiss[aã]o|transmitido|canais?\b|passa na|where to watch|how to watch|tv channel|broadcast|live stream|d[oó]nde ver|c[oó]mo ver|transmisi[oó]n|dove vedere|come vedere|diretta|o[uù] regarder|diffus|wo sehen|[uü]bertragung|waar kijken|uitzending|hangi kanal|canl[ıi]|gdzie ogl[aą]da|transmisja|kde sledovat|unde vezi|var kan man se|hvor se|nonton|tonton/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && hits.length < 40) hits.push(m.index);
  if (!hits.length) return "";
  // junta janelas de 700 caracteres em volta de cada ocorrência, sem repetir trecho
  const parts: string[] = [];
  let lastEnd = -1;
  for (const i of hits) {
    const start = Math.max(i - 300, lastEnd > 0 ? lastEnd : 0);
    const end = Math.min(i + 700, text.length);
    if (end <= start) continue;
    parts.push(text.slice(start, end));
    lastEnd = end;
    if (parts.join(" … ").length > 6000) break;
  }
  return parts.join(" … ").slice(0, 6000);
}

/** O que a IA responde: {"mesmo_jogo": true|false, "canais": ["..."]} — aceita só esse formato. */
export function parseAiAnswer(raw: string): { sameGame: boolean; channels: string[] } | null {
  const braces = (raw || "").match(/\{[\s\S]*\}/);
  if (!braces) return null;
  try {
    const j = JSON.parse(braces[0]);
    if (typeof j?.mesmo_jogo !== "boolean") return null;
    const channels = Array.isArray(j.canais) ? j.canais.filter((c: unknown): c is string => typeof c === "string").slice(0, 12) : [];
    return { sameGame: j.mesmo_jogo, channels };
  } catch {
    return null;
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Só vale canal ESCRITO no texto da página, palavra por palavra (sem acento/maiúscula). A IA não pode inventar:
 * o que não estiver no texto cai fora. Devolve os nomes já arrumados ("DISNEY+" → "Disney+"), no máximo 6.
 */
export function groundChannels(candidates: string[], pageTextValue: string): string[] {
  const hay = pageTextValue.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const out: string[] = [];
  for (const raw of candidates) {
    const c = (raw || "").trim();
    if (!c || c.length > 40 || /https?:|www\.|@|[<>{}]/.test(c)) continue;
    const needle = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (!new RegExp(`(?<![a-z0-9])${escapeRe(needle)}(?![a-z0-9])`).test(hay)) continue; // não está escrito na página
    const pretty = normalizeChannel(c);
    if (pretty && !out.some((x) => x.toLowerCase() === pretty.toLowerCase())) out.push(pretty);
    if (out.length >= 6) break;
  }
  return out;
}

/** Com várias reportagens: ficam os canais que pelo menos metade delas confirma (uma só reportagem vale por si). */
export function voteChannels(perArticle: string[][]): string[] {
  const lists = perArticle.filter((l) => l.length > 0);
  if (!lists.length) return [];
  const need = Math.ceil(lists.length / 2);
  const count = new Map<string, { name: string; n: number }>();
  for (const l of lists)
    for (const c of new Set(l.map((x) => x.toLowerCase())))
      count.set(c, { name: l.find((x) => x.toLowerCase() === c)!, n: (count.get(c)?.n ?? 0) + 1 });
  return [...count.values()].filter((v) => v.n >= need).map((v) => v.name).slice(0, 6);
}

/** Endereço real da reportagem dentro do link de redirecionamento do Bing (?url=...). */
export function realUrl(link: string): string {
  try {
    const u = new URL(link);
    const inner = u.searchParams.get("url");
    return inner ? decodeURIComponent(inner) : link;
  } catch {
    return link;
  }
}
