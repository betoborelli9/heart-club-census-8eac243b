/**
 * [CAMINHO]: supabase/functions/_shared/club-news-local.ts
 * [MÓDULO]: NOTÍCIAS LOCAIS DOS CLUBES — LÓGICA PURA (sem rede/banco).
 * Clubes menores quase não saem nos grandes portais; quem fala deles é a imprensa da CIDADE (jornal, rádio, site local),
 * na língua do país. Este módulo monta as buscas locais (nome do clube + cidade + língua/mercado do país), escreve o nome do
 * clube como a imprensa local escreve (ajuda da IA, guardada no banco), filtra o que é mesmo do clube e escolhe a janela de
 * tempo: 48 h; se houver pouca notícia, 7 dias; se ainda houver pouca, 30 dias. Vale para qualquer clube do mundo.
 */

export const norm = (s: string): string =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[-–‑]+/g, " ").replace(/\s+/g, " ").trim(); // "Botafogo-SP" = "botafogo sp"

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
  "futebol", "campeonato", "brasileirao", "serie a", "serie b", "serie c", "serie d", "copa", "libertadores", "estadual", "goianao", "paulistao",
  "tecnico", "treinador", "jogador", "atacante", "zagueiro", "goleiro", "meia", "lateral", "elenco", "rodada", "partida", "jogo", "contrato",
  "contratacao", "reforco", "transferencia", "torcida", "estadio", "sub-20", "sub-17", "divisao de acesso", "vence", "empata", "derrota", "gol",
  // espanhol / italiano / francês / alemão / holandês / turco / nórdicos / leste europeu
  "futbol", "liga", "torneo", "partido", "entrenador", "jugador", "calcio", "partita", "allenatore", "stagione", "football", "match", "entraineur",
  "fussball", "fubball", "bundesliga", "spieler", "trainer", "voetbal", "wedstrijd", "fotboll", "fotball", "fodbold", "jalkapallo", "mac", "teknik direktor", "tff", "super lig", "futbolcu",
  "ligi", "nogomet", "fudbal", "fotbal", "futbal", "pilka", "mecz", "meci", "labdarugas",
  // inglês
  "soccer", "league", "cup", "manager", "striker", "midfielder", "defender", "goalkeeper", "fixture", "transfer", "signing", "squad", "kick-off",
  // escritas não latinas
  "футбол", "матч", "ποδοσφαιρο", "כדורגל", "كرة القدم", "كرة", "فوتبال", "サッカー", "リーグ", "試合", "足球", "比赛", "联赛", "축구", "리그", "경기", "ฟุตบอล", "บอล",
  "ֆուտբոլ", "ფეხბურთი", "bong da", "sepak bola", "bola sepak",
];

// Palavra de futebol só vale como PALAVRA (não pedaço de outra): "brasileiro" (gente), "machine", "ligar" não são futebol.
// Escritas latinas: começo de palavra (palavra curta: inteira, com plural opcional). Outras escritas (japonês, árabe…): vale o trecho.
const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRx = (w: string): RegExp | null =>
  /[^\u0000-ɏ]/.test(w) ? null : new RegExp(`(?<![\\p{L}\\p{N}])${escapeRx(w)}${w.length < 5 ? "(?:s)?(?![\\p{L}\\p{N}])" : ""}`, "u");
const FOOTBALL_MATCHERS = [...new Set(FOOTBALL_WORDS.map(norm).filter(Boolean))].map((w) => ({ w, rx: wordRx(w) }));
export const hasFootballWord = (text: string, extra: string[] = []): boolean => {
  const t = norm(text);
  return FOOTBALL_MATCHERS.some(({ w, rx }) => (rx ? rx.test(t) : t.includes(w))) ||
    extra.some((x) => { const w = norm(x); if (!w) return false; const rx = wordRx(w); return rx ? rx.test(t) : t.includes(w); });
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
//  • homonyms: nomes de OUTROS clubes que costumam ser confundidos com este (mesmo nome ou parecido), ex.: Nacional de Montevideo
//  • markers:  termos que identificam ESTE clube (apelido, estádio) e quase só aparecem em notícia dele
export type LocalProfile = {
  cc?: string; lang?: string; club_names: string[]; city_names: string[]; football_words: string[]; homonyms: string[]; markers: string[];
};

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
  return {
    cc, lang, club_names: cleanList(raw?.club_names, 3), city_names: cleanList(raw?.city_names, 2), football_words: cleanList(raw?.football_words, 3),
    homonyms: cleanList(raw?.homonyms, 6), markers: cleanList(raw?.markers, 5),
  };
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

// ── Clube de MESMO NOME: a notícia é de outro clube? ───────────────────────────────────────────────────────────────
// Sigla dos estados do Brasil (Botafogo-SP ≠ Botafogo-RJ). Chave: nome do estado sem acento.
const BR_UF: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE", "distrito federal": "DF", "espirito santo": "ES", goias: "GO",
  maranhao: "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA", paraiba: "PB", parana: "PR", pernambuco: "PE",
  piaui: "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR", "santa catarina": "SC",
  "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};
const UF_LIST = [...new Set(Object.values(BR_UF))].join("|");
const UF_SET = new Set(Object.values(BR_UF));
// cadastro às vezes traz só a cidade (sem o estado): a capital diz o estado
const CAPITAL_UF: Record<string, string> = {
  "belo horizonte": "MG", "porto alegre": "RS", curitiba: "PR", florianopolis: "SC", salvador: "BA", fortaleza: "CE", recife: "PE", natal: "RN",
  "joao pessoa": "PB", maceio: "AL", aracaju: "SE", teresina: "PI", "sao luis": "MA", manaus: "AM", belem: "PA", macapa: "AP", "boa vista": "RR",
  "porto velho": "RO", "rio branco": "AC", palmas: "TO", cuiaba: "MT", "campo grande": "MS", goiania: "GO", brasilia: "DF", vitoria: "ES",
};
/** "Botafogo SP", "América-RN", "Atlético-MG" → raiz do nome e sigla do estado; nome sem sigla → null. */
function qualifierOf(clubName: string): { root: string; uf: string } | null {
  const m = (clubName || "").trim().match(/^(.{3,}?)[\s\-–(]+([A-Z]{2})\)?$/);
  return m && UF_SET.has(m[2]) ? { root: norm(m[1]), uf: m[2] } : null;
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isBrazil = (country?: string | null) => ["brazil", "brasil"].includes(norm(country || ""));

export type IdentityCtx = {
  clubName: string;
  cidade?: string | null; // "Cidade, Estado"
  country?: string | null;
  profile?: LocalProfile | null;
  /** nomes/cidades de OUTROS clubes de nome parecido que o próprio cadastro do site conhece */
  dbHomonyms?: string[];
  /** competições em que ESTE clube joga na temporada (da classificação guardada): "Serie A", "Carioca - 1"… */
  divisions?: string[];
};

// "Série A/B/C/D" citada na notícia (já sem acento, hífen virou espaço) — a divisão diz qual dos clubes de mesmo nome é.
const SERIES_RX = /(?<![a-z0-9])serie ([a-d])(?![a-z0-9])/g;
// "cair para a Série B", "acesso à Série A": quem fala da divisão que o clube ameaça pegar/deixar não está falando de outro clube
const SERIES_THREAT_RX = /rebaix|cair|queda|acesso|subir|sobe\b|zona|ameaca|risco|promo|descen|ascen/;
const seriesIn = (hay: string): string[] => [...hay.matchAll(SERIES_RX)].map((m) => m[1]);

/**
 * Esta notícia é de OUTRO clube que tem o mesmo nome? Duas provas:
 *  1) Brasil: "Botafogo-SP", "Atlético-MG"… com a sigla de OUTRO estado (e nenhuma do nosso).
 *  2) Aparece o nome de um homônimo conhecido ("Nacional de Montevideo", "Santos Laguna") e nada que prove que é o nosso
 *     (estado, cidade, apelido, estádio, ou o nome completo do nosso clube que não faça parte do nome do homônimo).
 * Sem prova de que é outro, a notícia fica (não joga fora notícia certa por desconfiança).
 */
export function isOtherClub(text: string, ctx: IdentityCtx): boolean {
  const hay = norm(text);
  if (!hay) return false;
  const full = norm(ctx.clubName);
  const core = norm(coreName(ctx.clubName));
  const parts = (ctx.cidade || "").split(",").map((p) => p.trim()).filter(Boolean);
  const city = norm(parts[0] || "");
  const state = norm(parts[1] || "");
  const prof = ctx.profile;

  const own = [state, city !== core ? city : "", ...(prof?.city_names ?? []).map(norm).filter((c) => c !== core), ...(prof?.markers ?? []).map(norm)].filter(
    (o) => o.length >= 3,
  );

  // 1) Brasil: sigla do estado colada no nome ("Botafogo-SP"). Ignora título TODO em maiúsculas, onde "SE"/"PA" são palavras comuns.
  if (isBrazil(ctx.country)) {
    const q = qualifierOf(ctx.clubName);
    const root = q ? q.root : core;
    const ownUf = q?.uf ?? BR_UF[state] ?? BR_UF[city] ?? CAPITAL_UF[city];
    const stripped = text.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const lc = stripped.toLowerCase().replace(/[-–‑]/g, " ");
    // (o texto "limpo" troca hífen por espaço, mantendo o mesmo tamanho, para achar a sigla logo depois do nome)
    const after = new RegExp(`^ {0,3}(${UF_LIST})(?![A-Za-z0-9])`);
    const ufs: string[] = [];
    if (root.length >= 3 && /[a-z]/.test(text)) {
      const flat = stripped.replace(/[-–‑]/g, " ");
      for (let i = lc.indexOf(root); i >= 0; i = lc.indexOf(root, i + 1)) {
        const m = flat.slice(i + root.length, i + root.length + 6).match(after);
        if (m) ufs.push(m[1]);
      }
    }
    if (ufs.length > 0 && ownUf && !ufs.includes(ownUf)) return true; // sigla de outro estado

    // DIVISÃO: "Série A" no texto → o Botafogo do Rio (joga a A); "Série B" → o de Ribeirão Preto (joga a B). Só vale quando existe
    // outro clube de nome parecido, e não quando a notícia fala em subir/cair de divisão.
    const ownSeries = new Set((ctx.divisions ?? []).map(norm).map((d) => d.match(/^serie ([a-d])$/)?.[1]).filter(Boolean) as string[]);
    const said = seriesIn(hay);
    const threat = SERIES_THREAT_RX.test(hay);
    // "Série B" citada junto de rebaixamento (cair para a B) não prova que é o clube da B
    const seriesOwnHit = said.some((s) => ownSeries.has(s)) && !/rebaix|cair|queda|zona|ameaca|risco|descen/.test(hay);
    if (ownSeries.size > 0 && said.length > 0 && !threat && !seriesOwnHit && (ctx.dbHomonyms?.length ?? 0) > 0) return true; // divisão de outro clube

    // Clube cadastrado COM sigla (Botafogo SP, América-RN): só "Botafogo" não diz qual é — a notícia precisa trazer a sigla dele,
    // a cidade, o apelido/estádio ou a divisão dele. O estado sozinho não vale ("São Paulo" aparece em todo texto do Corinthians).
    if (q && !ufs.includes(q.uf) && !seriesOwnHit && !own.filter((o) => o !== state).some((o) => hay.includes(o))) return true;
  }

  // 2) nome de homônimo conhecido
  const others = [...new Set([...(prof?.homonyms ?? []), ...(ctx.dbHomonyms ?? [])].map(norm))].filter(
    (o) => o.length >= 4 && o !== full && o !== core && !full.includes(o),
  );
  const hit = others.filter((o) => hay.includes(o));
  if (hit.length === 0) return false;
  if (own.some((o) => hay.includes(o))) return false;
  if (full.length >= 4 && hay.includes(full) && !hit.some((o) => o.includes(full))) return false;
  return true;
}

export function isLocalRelevant(
  item: { title: string; description?: string | null },
  ctx: IdentityCtx & { shortName?: string | null },
): boolean {
  const title = norm(item.title);
  const hay = norm(`${item.title} ${item.description ?? ""}`);
  if (!title) return false;
  if (AMATEUR.some((w) => hay.includes(w))) return false;
  if (isOtherClub(`${item.title} ${item.description ?? ""}`, ctx)) return false; // é de outro clube de mesmo nome

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

// ── Mesmo ASSUNTO em sites diferentes → uma notícia só ─────────────────────────────────────────────────────────────
// Palavras que não dizem nada sobre o assunto (várias línguas). O nome do clube e da cidade também saem: estão em todo título.
const STORY_STOP = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas", "um", "uma", "por", "para", "com", "sem", "que", "como", "mais", "apos", "sobre", "entre", "ate", "ele", "ela", "dele", "seu", "sua", "vai", "foi", "ser", "tem", "esta", "este", "esse", "essa", "nao", "mas", "pelo", "pela",
  "del", "los", "las", "una", "uno", "con", "sin", "para", "por", "que", "como", "mas", "sus", "tras", "ante", "esta", "este", "fue", "ser", "han", "hay",
  "the", "and", "for", "with", "from", "that", "this", "after", "over", "his", "her", "has", "have", "will", "are", "was", "its", "into", "out", "new", "says", "say",
  "der", "die", "das", "und", "mit", "von", "den", "dem", "ein", "eine", "bei", "nach", "fur", "auf", "aus", "wie", "les", "des", "pour", "dans", "sur", "une", "avec", "par", "che", "per", "con", "gli", "nel", "alla", "dei", "bir", "ile", "icin", "ama",
]);
const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;

/** Palavras-chave do título (sem espaço entre palavras em japonês/chinês/coreano/tailandês: usa pares de letras). */
export function storyTokens(title: string, skip: Set<string> = new Set()): Set<string> {
  const out = new Set<string>();
  for (const w of norm(title).split(/[^\p{L}\p{N}]+/u)) {
    if (!w) continue;
    if (CJK_RE.test(w)) {
      const cs = [...w];
      for (let i = 0; i + 1 < cs.length; i++) {
        const bi = cs[i] + cs[i + 1];
        if (!skip.has(bi)) out.add(bi);
      }
      continue;
    }
    if (w.length < 3 || STORY_STOP.has(w) || skip.has(w)) continue;
    out.add(w);
  }
  return out;
}

/** Duas manchetes contam o mesmo fato? (≥3 palavras-chave em comum e metade ou mais da menor manchete.) */
export function sameStory(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared >= 3 && shared / Math.min(a.size, b.size) >= 0.5;
}

type StoryItem = { title: string; source?: string; sourceRank?: number; isOfficial?: boolean; pubDate?: string };

/**
 * Agrupa as manchetes que contam o MESMO fato (sites diferentes, redações diferentes) e fica com UMA por assunto:
 * a do site oficial; senão a da fonte mais confiável; senão a mais recente. As outras viram `alsoIn` (nomes das fontes).
 */
export function dedupeStories<T extends StoryItem>(
  items: T[],
  ctx: { clubName: string; shortName?: string | null; cidade?: string | null; profile?: LocalProfile | null },
): (T & { alsoIn?: string[] })[] {
  const skip = new Set<string>();
  const names = [ctx.clubName, ctx.shortName || "", ...(ctx.cidade || "").split(","), ...(ctx.profile?.club_names ?? []), ...(ctx.profile?.city_names ?? [])];
  for (const n of names) for (const t of storyTokens(n)) skip.add(t);
  const toks = items.map((it) => storyTokens(it.title, skip));

  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const key = (t: string) => norm(t).replace(/[^\p{L}\p{N} ]/gu, "").slice(0, 40);
      if (sameStory(toks[i], toks[j]) || (key(items[i].title) && key(items[i].title) === key(items[j].title))) parent[find(j)] = find(i);
    }

  const groups = new Map<number, number[]>();
  items.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
  const time = (it: StoryItem) => (it.pubDate ? new Date(it.pubDate).getTime() || 0 : 0);
  const out: (T & { alsoIn?: string[] })[] = [];
  for (const idxs of groups.values()) {
    const ranked = [...idxs].sort((x, y) => {
      const a = items[x], b = items[y];
      return Number(!!b.isOfficial) - Number(!!a.isOfficial) || (a.sourceRank ?? 50) - (b.sourceRank ?? 50) || time(b) - time(a);
    });
    const rep = items[ranked[0]];
    const others = [...new Set(ranked.slice(1).map((k) => (items[k].source || "").trim()).filter((s) => s && s !== (rep.source || "").trim()))].slice(0, 4);
    out.push(others.length ? { ...rep, alsoIn: others } : { ...rep });
  }
  return out;
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
