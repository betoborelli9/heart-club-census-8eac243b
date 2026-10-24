/**
 * [CAMINHO]: supabase/functions/_shared/tv-listing.ts
 * [MÓDULO]: ONDE ASSISTIR (robô sem IA) — lê a grade de transmissão de um site de programação de TV
 * e casa cada jogo da lista com os jogos do Heart Club (mesma data e horário de Brasília + nome dos times).
 * Funções puras (sem rede, sem Deno): a busca das páginas fica em fixture-watch/index.ts.
 * Se o jogo não aparece ou os times não batem, o chamador deixa "a confirmar" — nada é inventado.
 */

export type ListedGame = {
  /** AAAA-MM-DD no horário de Brasília */
  date: string;
  /** HH:MM no horário de Brasília */
  time: string;
  home: string;
  away: string;
  channels: string[];
};

const MAX_CHANNELS = 6;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function clean(s: string): string {
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

// Emissoras de fora do Brasil que o site lista junto (não ajudam o torcedor brasileiro).
const FOREIGN = new Set(["SPORTYNET", "XSPORTS"]);

const PRETTY: Record<string, string> = {
  "GLOBO": "Globo",
  "SPORTV": "SporTV",
  "SPORTV 2": "SporTV 2",
  "SPORTV 3": "SporTV 3",
  "PREMIERE": "Premiere",
  "CAZÉTV": "CazéTV",
  "CAZETV": "CazéTV",
  "YOUTUBE": "YouTube",
  "DISNEY+": "Disney+",
  "MAX": "Max",
  "HBO MAX": "HBO Max",
  "PRIME VIDEO": "Prime Video",
  "AMAZON PRIME VIDEO": "Prime Video",
  "PARAMOUNT+": "Paramount+",
  "REDETV!": "RedeTV!",
  "REDETV": "RedeTV!",
  "BAND": "Band",
  "BANDSPORTS": "BandSports",
  "SBT": "SBT",
  "RECORD": "Record",
  "TNT": "TNT",
  "TNT SPORTS": "TNT Sports",
  "ESPN": "ESPN",
  "GOAT": "Canal GOAT",
  "CANAL GOAT": "Canal GOAT",
  "TV BRASIL": "TV Brasil",
  "NOSSO FUTEBOL": "Nosso Futebol",
  "GLOBOPLAY": "Globoplay",
  "STAR+": "Star+",
  "APPLE TV": "Apple TV",
  "DAZN": "DAZN",
  "ONEFOOTBALL": "OneFootball",
  "PPV ONEFOOTBALL": "OneFootball (PPV)",
  "FANATIZ": "Fanatiz",
  "GE TV": "ge tv",
};

/** Nome do canal como o torcedor conhece ("DISNEY+" → "Disney+"). Devolve "" para o que deve ser ignorado. */
export function normalizeChannel(raw: string): string {
  const s = clean(raw);
  if (!s) return "";
  if (/^\(.*\)$/.test(s)) return ""; // "(SPORTYNET)": repetição entre parênteses
  const up = s.toUpperCase();
  if (FOREIGN.has(up)) return "";
  if (PRETTY[up]) return PRETTY[up];
  // "ESPN 2", "ESPN 4": mantém a sigla em maiúsculas e o número
  if (/^ESPN \d$/.test(up)) return up;
  // tudo em maiúsculas ("PREMIERE 7", "CANAL DO BENJA") → só a inicial de cada palavra em maiúscula
  if (s === up && s.length > 5) return s.toLowerCase().replace(/(^|\s)([a-zà-ú])/g, (_, sp, c) => sp + c.toUpperCase());
  return s;
}

function cleanChannelList(list: string[]): string[] {
  const out: string[] = [];
  for (const c of list) {
    const n = normalizeChannel(c).slice(0, 40);
    if (n && !out.some((x) => x.toLowerCase() === n.toLowerCase())) out.push(n);
    if (out.length >= MAX_CHANNELS) break;
  }
  return out;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** AAAA-MM-DD de "agora" no horário de Brasília somado de `plusDays` dias. */
export function brtDate(nowMs: number, plusDays = 0): string {
  const d = new Date(nowMs - 3 * 3600 * 1000 + plusDays * 24 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Data e hora de Brasília de um instante ISO/UTC. */
export function toBrt(iso: string): { date: string; time: string } {
  const t = new Date(iso).getTime() - 3 * 3600 * 1000;
  const d = new Date(t);
  return {
    date: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
    time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
  };
}

/** Cabeçalho de dia da página ("Hoje", "Amanhã", "Seg, 26/10") → AAAA-MM-DD; null se não for data. */
function headerToDate(text: string, nowMs: number): string | null {
  const t = text.toLowerCase();
  if (/^hoje/.test(t)) return brtDate(nowMs, 0);
  if (/^amanh/.test(t)) return brtDate(nowMs, 1);
  if (/^ontem/.test(t)) return brtDate(nowMs, -1);
  const m = t.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const today = brtDate(nowMs, 0);
  let year = Number(today.slice(0, 4));
  let candidate = `${year}-${pad2(month)}-${pad2(day)}`;
  // jogo de janeiro visto em dezembro (ou o inverso): ajusta o ano pela distância
  const diffDays = (new Date(candidate).getTime() - new Date(today).getTime()) / 86400000;
  if (diffDays < -200) year += 1;
  else if (diffDays > 200) year -= 1;
  candidate = `${year}-${pad2(month)}-${pad2(day)}`;
  return candidate;
}

/**
 * Lê uma página da grade (lista de uma liga ou "jogos de hoje/amanhã").
 * `defaultDate`: data usada quando a página não traz cabeçalho de dia antes do jogo (páginas "jogos-hoje"/"jogos-amanha").
 */
export function parseListing(html: string, nowMs: number, defaultDate?: string): ListedGame[] {
  const src = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\sclass="[^"]*"/g, "");

  const games: ListedGame[] = [];
  let currentDate: string | null = defaultDate ?? null;
  const token = /<h3[^>]*>([\s\S]*?)<\/h3>|<article[^>]*>([\s\S]*?)<\/article>/gi;
  let m: RegExpExecArray | null;
  while ((m = token.exec(src))) {
    if (m[1] !== undefined) {
      const d = headerToDate(clean(m[1].replace(/<[^>]+>/g, " ")), nowMs);
      if (d) currentDate = d;
      continue;
    }
    const art = m[2] || "";
    const time = art.match(/<time[^>]*>\s*(\d{1,2}):(\d{2})\s*<\/time>/i);
    const teamA = art.match(/id="[^"]*team-a[^"]*"[^>]*>\s*<img[^>]*alt="([^"]*)"/i);
    const teamB = art.match(/id="[^"]*team-b[^"]*"[^>]*>\s*<img[^>]*alt="([^"]*)"/i);
    if (!time || !teamA || !teamB || !currentDate) continue;
    // canais: "pílulas" <span><span></span><span>NOME</span></span> depois do bloco dos times
    const afterTeams = art.slice(Math.max(art.indexOf(teamB[0]), 0) + teamB[0].length);
    const pills = [...afterTeams.matchAll(/<span[^>]*>\s*<span[^>]*>\s*<\/span>\s*<span[^>]*>\s*([^<]+?)\s*<\/span>\s*<\/span>/gi)].map((p) => p[1]);
    games.push({
      date: currentDate,
      time: `${pad2(Number(time[1]))}:${time[2]}`,
      home: clean(teamA[1]),
      away: clean(teamB[1]),
      channels: cleanChannelList(pills),
    });
  }
  return games;
}

const STOP = new Set(["fc", "ec", "sc", "ac", "cf", "cd", "ca", "clube", "club", "de", "do", "da", "futebol", "esporte", "associacao", "atletica", "sociedade", "esportiva"]);

// Nomes que a base de jogos e o site escrevem de jeitos muito diferentes → forma comum
const ALIASES: Record<string, string> = {
  "atletico mineiro": "atletico mg",
  "atletico goianiense": "atletico go",
  "athletico paranaense": "athletico pr",
  "atletico paranaense": "athletico pr",
  "red bull bragantino": "bragantino",
  "botafogo sp": "botafogo sp",
  "botafogo ribeirao preto": "botafogo sp",
  "america mineiro": "america mg",
  "sport recife": "sport",
  "vasco da gama": "vasco",
  "chapecoense sc": "chapecoense",
  "ceara sc": "ceara",
  "avai fc": "avai",
  "gremio novorizontino": "novorizontino",
  "gremio fbpa": "gremio",
};

export function normTeam(name: string): string[] {
  let s = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (ALIASES[s]) s = ALIASES[s];
  return s.split(" ").filter((t) => t && !STOP.has(t));
}

function sideMatch(a: string, b: string): boolean {
  const ta = normTeam(a);
  const tb = normTeam(b);
  if (!ta.length || !tb.length) return false;
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return small.every((t) => big.includes(t));
}

/** Acha na grade o jogo do Heart Club (mesma data de Brasília e os dois times conferem). Sem certeza → null. */
export function matchGame(
  listing: ListedGame[],
  fx: { date: string; home?: { name?: string }; away?: { name?: string } },
): ListedGame | null {
  const { date, time } = toBrt(fx.date);
  const home = fx.home?.name || "";
  const away = fx.away?.name || "";
  if (!home || !away) return null;
  // mesmo dia de Brasília e os DOIS times conferem (o horário pode mudar de última hora; se houver dois jogos assim, vale o de horário igual)
  const candidates = listing.filter((g) => g.date === date && sideMatch(g.home, home) && sideMatch(g.away, away));
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) return candidates.find((g) => g.time === time) || null;
  return null;
}
