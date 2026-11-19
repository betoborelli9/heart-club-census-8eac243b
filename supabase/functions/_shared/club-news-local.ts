/**
 * [CAMINHO]: supabase/functions/_shared/club-news-local.ts
 * [MÓDULO]: NOTÍCIAS LOCAIS DOS CLUBES — LÓGICA PURA (sem rede/banco).
 * Clubes menores quase não saem nos grandes portais; quem fala deles é a imprensa da CIDADE (jornal, rádio, site local),
 * na língua do país. Este módulo monta as buscas locais (nome do clube + cidade + língua/mercado do país), escreve o nome do
 * clube como a imprensa local escreve (ajuda da IA, guardada no banco), filtra o que é mesmo do clube e escolhe a janela de
 * tempo: 48 h; se houver pouca notícia, 7 dias; se ainda houver pouca, 30 dias. Vale para qualquer clube do mundo.
 */

export const norm = (s: string): string =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// ── País → mercado do Bing (código do país e idioma). Nomes como a API-Football escreve (em inglês). ─────────────────
type Market = { cc: string; lang: string; latin: boolean };
const M = (cc: string, lang: string, latin = true): Market => ({ cc, lang, latin });
const MARKETS: Record<string, Market> = {
  brazil: M("br", "pt-BR"), portugal: M("pt", "pt-PT"), angola: M("ao", "pt-PT"), mozambique: M("mz", "pt-PT"),
  spain: M("es", "es-ES"), mexico: M("mx", "es-MX"), argentina: M("ar", "es-AR"), colombia: M("co", "es-CO"), chile: M("cl", "es-CL"),
  peru: M("pe", "es-PE"), uruguay: M("uy", "es-UY"), paraguay: M("py", "es-PY"), bolivia: M("bo", "es-BO"), ecuador: M("ec", "es-EC"),
  venezuela: M("ve", "es-VE"), "costa rica": M("cr", "es-CR"), guatemala: M("gt", "es-GT"), honduras: M("hn", "es-HN"), panama: M("pa", "es-PA"),
  "el salvador": M("sv", "es-SV"), "dominican republic": M("do", "es-DO"), cuba: M("cu", "es-CU"),
  england: M("gb", "en-GB"), scotland: M("gb", "en-GB"), wales: M("gb", "en-GB"), "northern ireland": M("gb", "en-GB"), ireland: M("ie", "en-IE"),
  usa: M("us", "en-US"), "united states": M("us", "en-US"), canada: M("ca", "en-CA"), australia: M("au", "en-AU"), "new zealand": M("nz", "en-NZ"),
  "south africa": M("za", "en-ZA"), nigeria: M("ng", "en-NG"), ghana: M("gh", "en-GH"), kenya: M("ke", "en-KE"), india: M("in", "en-IN"),
  france: M("fr", "fr-FR"), belgium: M("be", "fr-BE"), switzerland: M("ch", "de-CH"), germany: M("de", "de-DE"), austria: M("at", "de-AT"),
  italy: M("it", "it-IT"), netherlands: M("nl", "nl-NL"), turkey: M("tr", "tr-TR"), poland: M("pl", "pl-PL"), romania: M("ro", "ro-RO"),
  sweden: M("se", "sv-SE"), norway: M("no", "nb-NO"), denmark: M("dk", "da-DK"), finland: M("fi", "fi-FI"), czechrepublic: M("cz", "cs-CZ"),
  hungary: M("hu", "hu-HU"), croatia: M("hr", "hr-HR"), serbia: M("rs", "sr-Latn-RS"), slovenia: M("si", "sl-SI"), slovakia: M("sk", "sk-SK"),
  bulgaria: M("bg", "bg-BG", false), greece: M("gr", "el-GR", false), russia: M("ru", "ru-RU", false), ukraine: M("ua", "uk-UA", false),
  belarus: M("by", "ru-RU", false), kazakhstan: M("kz", "ru-RU", false), armenia: M("am", "hy-AM", false), georgia: M("ge", "ka-GE", false),
  israel: M("il", "he-IL", false), "saudi arabia": M("sa", "ar-SA", false), egypt: M("eg", "ar-EG", false), morocco: M("ma", "ar-MA", false),
  algeria: M("dz", "ar-DZ", false), tunisia: M("tn", "ar-TN", false), uae: M("ae", "ar-AE", false), "united arab emirates": M("ae", "ar-AE", false),
  qatar: M("qa", "ar-QA", false), iran: M("ir", "fa-IR", false),
  japan: M("jp", "ja-JP", false), "south korea": M("kr", "ko-KR", false), china: M("cn", "zh-CN", false), taiwan: M("tw", "zh-TW", false),
  "hong kong": M("hk", "zh-HK", false), thailand: M("th", "th-TH", false), vietnam: M("vn", "vi-VN"), indonesia: M("id", "id-ID"),
  malaysia: M("my", "ms-MY"), philippines: M("ph", "en-PH"), singapore: M("sg", "en-SG"), uzbekistan: M("uz", "ru-RU", false),
};

/** Normaliza "South-Korea", "Czech-Republic", "USA"… para achar o mercado. País desconhecido → inglês dos EUA (as buscas continuam). */
export function marketFor(country: string | null | undefined): Market & { known: boolean } {
  const key = norm(country || "").replace(/-/g, " ");
  const direct = MARKETS[key] ?? MARKETS[key.replace(/ /g, "")];
  return direct ? { ...direct, known: true } : { ...M("us", "en-US"), known: false };
}

// ── Palavra "futebol" na língua local (para a busca e para o filtro de relevância) ────────────────────────────────
const FOOTBALL_BY_LANG: Record<string, string> = {
  pt: "futebol", es: "fútbol", en: "football", fr: "football", it: "calcio", de: "Fußball", nl: "voetbal", sv: "fotboll", nb: "fotball",
  da: "fodbold", fi: "jalkapallo", pl: "piłka nożna", cs: "fotbal", sk: "futbal", hu: "labdarúgás", ro: "fotbal", hr: "nogomet", sr: "fudbal",
  sl: "nogomet", tr: "futbol", ru: "футбол", uk: "футбол", bg: "футбол", el: "ποδόσφαιρο", he: "כדורגל", ar: "كرة القدم", fa: "فوتبال",
  ja: "サッカー", ko: "축구", zh: "足球", th: "ฟุตบอล", vi: "bóng đá", id: "sepak bola", ms: "bola sepak", hy: "ֆուտբոլ", ka: "ფეხბურთი",
};

export function footballWordFor(lang: string): string {
  return FOOTBALL_BY_LANG[(lang || "en").split("-")[0].toLowerCase()] ?? "football";
}

/** Palavras de futebol em várias línguas (já normalizadas: sem acento, minúsculas). Basta uma no título/descrição. */
export const FOOTBALL_WORDS: string[] = [
  // português
  "futebol", "campeonato", "brasileir", "serie a", "serie b", "serie c", "serie d", "copa", "libertadores", "estadual", "goianao", "paulistao",
  "tecnico", "treinador", "jogador", "atacante", "zagueiro", "goleiro", "meia", "lateral", "elenco", "rodada", "partida", "jogo", "contrato",
  "contratacao", "reforco", "transferencia", "torcida", "estadio", "sub-20", "sub-17", "divisao de acesso", "vence", "empata", "derrota", "gol",
  // espanhol / italiano / francês / alemão / holandês / turco / nórdicos / leste europeu
  "futbol", "liga", "torneo", "partido", "entrenador", "jugador", "calcio", "partita", "allenatore", "stagione", "football", "match", "entraineur",
  "fussball", "fubball", "bundesliga", "spieler", "trainer", "voetbal", "wedstrijd", "fotboll", "fotball", "fodbold", "jalkapallo", "mac", "teknik direktor",
  "ligi", "nogomet", "fudbal", "fotbal", "futbal", "pilka", "mecz", "meci", "labdarugas",
  // inglês
  "soccer", "league", "cup", "manager", "striker", "midfielder", "defender", "goalkeeper", "fixture", "transfer", "signing", "squad", "kick-off",
  // escritas não latinas
  "футбол", "матч", "ποδοσφαιρο", "כדורגל", "كرة القدم", "كرة", "فوتبال", "サッカー", "リーグ", "試合", "足球", "比赛", "联赛", "축구", "리그", "경기", "ฟุตบอล", "บอล",
  "ֆուտբոլ", "ფეხბურთი", "bong da", "sepak bola", "bola sepak",
];

const FOOTBALL_NORM = FOOTBALL_WORDS.map(norm);
export const hasFootballWord = (text: string, extra: string[] = []): boolean => {
  const t = norm(text);
  return FOOTBALL_NORM.some((w) => w && t.includes(w)) || extra.some((w) => w && t.includes(norm(w)));
};

// ── Nome "núcleo" do clube (sem Esporte Clube, FC, EC…) ────────────────────────────────────────────────────────────
const GENERIC = new Set([
  "fc", "ec", "sc", "ac", "cf", "cd", "ud", "sd", "rc", "afc", "fk", "sk", "nk", "bk", "if", "ff", "esporte", "clube", "club", "futebol", "football",
  "associacao", "sociedade", "sociedad", "de", "do", "da", "dos", "das", "the",
]);

/** "Goiatuba EC" → "Goiatuba"; "Rio Verde Esporte Clube" → "Rio Verde"; sem nada sobrando, devolve o nome inteiro. */
export function coreName(clubName: string): string {
  const kept = (clubName || "").trim().split(/\s+/).filter((tk) => !GENERIC.has(norm(tk)));
  return kept.length ? kept.join(" ") : (clubName || "").trim();
}

// ── Perfil local do clube (vem da IA, validado aqui) ─────────────────────────────────────────────────────────────
export type LocalProfile = { cc?: string; lang?: string; club_names: string[]; city_names: string[]; football_words: string[] };

const cleanStr = (v: unknown, max = 60): string | null => {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f<>"{}]/g, " ").replace(/\s+/g, " ").trim();
  if (!s || s.length > max || /https?:|www\.|@/.test(s)) return null;
  return s;
};
const cleanList = (v: unknown, n: number): string[] =>
  Array.isArray(v) ? [...new Set(v.map((x) => cleanStr(x)).filter((x): x is string => !!x))].slice(0, n) : [];

/** Valida o que a IA respondeu: nada de links, tamanhos controlados, idioma/país no formato certo. Qualquer lixo vira lista vazia. */
export function sanitizeProfile(raw: any): LocalProfile {
  const cc = typeof raw?.cc === "string" && /^[a-z]{2}$/i.test(raw.cc.trim()) ? raw.cc.trim().toLowerCase() : undefined;
  const lang = typeof raw?.lang === "string" && /^[a-z]{2,3}(-[A-Za-z0-9]{2,4}){0,2}$/.test(raw.lang.trim()) ? raw.lang.trim() : undefined;
  return { cc, lang, club_names: cleanList(raw?.club_names, 3), city_names: cleanList(raw?.city_names, 2), football_words: cleanList(raw?.football_words, 3) };
}

// ── Montagem das buscas locais ─────────────────────────────────────────────────────────────────────────────────────
export type LocalQuery = { q: string; cc: string; lang: string };

export function buildLocalQueries(opts: {
  clubName: string;
  shortName?: string | null;
  cidade?: string | null; // "Rio Verde, Goiás" (cidade, estado) como está no cadastro
  country?: string | null;
  profile?: LocalProfile | null;
  max?: number;
}): LocalQuery[] {
  const { clubName, profile } = opts;
  const mk = marketFor(opts.country);
  const cc = profile?.cc || mk.cc;
  const lang = profile?.lang || mk.lang;
  const fw = profile?.football_words?.[0] || footballWordFor(lang);
  const core = coreName(clubName);
  const parts = (opts.cidade || "").split(",").map((p) => p.trim()).filter(Boolean);
  const city = profile?.city_names?.[0] || parts[0] || "";
  const state = parts[1] || "";

  const out: LocalQuery[] = [];
  const add = (q: string) => {
    const clean = q.replace(/\s+/g, " ").trim();
    if (clean && !out.some((o) => norm(o.q) === norm(clean))) out.push({ q: clean, cc, lang });
  };

  add(`"${core}" ${fw}`); // o jeito mais simples: nome do clube + "futebol"
  if (state) add(`"${core}" ${fw} ${state}`); // desambigua com o estado (Rio Verde → Goiás)
  if (city && norm(city) !== norm(core)) add(`"${core}" ${fw} ${city}`);
  if (norm(clubName) !== norm(core)) add(`"${clubName}"`);
  if (opts.shortName && norm(opts.shortName) !== norm(core)) add(`"${opts.shortName}" ${fw}`);
  // o nome do clube como a imprensa LOCAL escreve (outro alfabeto, apelido): a busca que mais acha jornal da cidade
  for (const n of profile?.club_names ?? []) {
    add(`${n}`);
    add(`${n} ${fw}`);
  }
  return out.slice(0, opts.max ?? 6);
}

// ── Relevância: a notícia é mesmo DESTE clube? ─────────────────────────────────────────────────────────────────────
const AMATEUR = ["varzea", "pelada", "society", "escolinha", "racha"];
// nome de UMA palavra comum a muitos clubes: só vale com a cidade/estado no texto
const AMBIGUOUS_ONE_WORD = new Set(["atletico", "america", "nacional", "sport", "real", "vitoria", "guarani", "portuguesa", "operario", "uniao", "central", "botafogo", "fluminense", "ferroviario", "industrial", "comercial", "olimpia", "independente", "juventude", "santos", "river", "boca", "internacional", "palmeiras"]);
const isLatin = (s: string) => /^[\p{Script=Latin}\p{N}\s.'’\-&]+$/u.test(s);

export function isLocalRelevant(
  item: { title: string; description?: string | null },
  ctx: { clubName: string; shortName?: string | null; cidade?: string | null; profile?: LocalProfile | null },
): boolean {
  const title = norm(item.title);
  const hay = norm(`${item.title} ${item.description ?? ""}`);
  if (!title) return false;
  if (AMATEUR.some((w) => hay.includes(w))) return false;

  const core = norm(coreName(ctx.clubName));
  const full = norm(ctx.clubName);
  const city = [ctx.cidade ? ctx.cidade.split(",").map((p) => norm(p)).filter(Boolean) : [], (ctx.profile?.city_names ?? []).map(norm)].flat();
  const localNames = (ctx.profile?.club_names ?? []).map(norm).filter(Boolean);
  const fwExtra = ctx.profile?.football_words ?? [];
  const football = hasFootballWord(hay, fwExtra);

  // 1) nome do clube na escrita local (outro alfabeto ou apelido): específico do clube, vale mesmo sem palavra de futebol
  if (localNames.some((n) => n.length >= 2 && hay.includes(n))) return football || localNames.some((n) => !isLatin(n));
  // nome de UMA palavra comum a muitos clubes ("América", "Nacional"…): sem a cidade no texto não dá para saber qual clube é
  const single = core.split(" ").length === 1;
  const ambiguousOne = single && AMBIGUOUS_ONE_WORD.has(core);
  if (ambiguousOne && !city.some((c) => c && hay.includes(c))) return false;
  // 2) nome completo do clube
  if (full.length >= 4 && hay.includes(full) && football) return true;
  // 3) nome núcleo ("Goiatuba", "Rio Verde"): exige palavra de futebol (o nome pode ser também o da cidade)
  if (core.length >= 3 && hay.includes(core) && football) return true;
  // 4) apelido / nome curto
  const sn = norm(ctx.shortName || "");
  if (sn.length >= 4 && sn !== core && title.includes(sn) && football) return true;
  return false;
}

// ── Janela de tempo adaptativa ─────────────────────────────────────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
export const WINDOWS_DAYS = [2, 7, 30] as const;

/**
 * Clube grande tem notícia toda hora: ficam as das últimas 48 h. Clube pequeno quase nunca: se houver menos de `minItems`
 * em 48 h, alarga para 7 dias; ainda pouco, 30 dias. Devolve em ordem da mais recente e diz a janela usada.
 */
export function selectByWindow<T extends { pubDate?: string | null }>(items: T[], now: number = Date.now(), minItems = 3): { items: T[]; windowDays: number } {
  const dated = items
    .map((it) => ({ it, t: it.pubDate ? new Date(it.pubDate).getTime() : NaN }))
    .filter((x) => Number.isFinite(x.t) && x.t <= now + 60 * 60 * 1000)
    .sort((a, b) => b.t - a.t);
  for (const d of WINDOWS_DAYS) {
    const inside = dated.filter((x) => now - x.t <= d * DAY);
    if (inside.length >= minItems || d === WINDOWS_DAYS[WINDOWS_DAYS.length - 1]) return { items: inside.map((x) => x.it), windowDays: d };
  }
  return { items: [], windowDays: WINDOWS_DAYS[WINDOWS_DAYS.length - 1] };
}

/** Junta listas sem repetir o mesmo assunto (primeiros 40 caracteres do título normalizado); a primeira lista tem preferência. */
export function mergeNews<T extends { title: string }>(...lists: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const l of lists)
    for (const it of l) {
      const key = norm(it.title).replace(/[^\p{L}\p{N} ]/gu, "").slice(0, 40);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
  return out;
}
