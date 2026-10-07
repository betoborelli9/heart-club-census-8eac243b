/**
 * [CAMINHO]: src/data/country-dials.ts
 * [MÓDULO]: Códigos de telefone de todos os países do mundo (para o WhatsApp do Embaixador).
 * Nome do país vem localizado do próprio navegador (Intl.DisplayNames) no idioma do torcedor;
 * a bandeira é gerada a partir do código ISO. `digits` = mínimo e máximo de dígitos do número local
 * (os países principais têm faixa exata; os demais usam uma faixa ampla e segura).
 */
export interface CountryDial {
  code: string; // ISO ex: BR
  name: string; // nome no idioma do torcedor
  dial: string; // ex: +55
  flag: string; // emoji
  digits: [number, number]; // min/max dígitos do número local
}

// [ISO, prefixo, mín, máx]. Quando mín/máx não aparecem, vale a faixa ampla padrão [6, 12].
const RAW: [string, string, number?, number?][] = [
  ["BR", "55", 10, 11], ["PT", "351", 9, 9], ["US", "1", 10, 10], ["CA", "1", 10, 10], ["AR", "54", 10, 11],
  ["UY", "598", 8, 9], ["PY", "595", 9, 9], ["CL", "56", 9, 9], ["CO", "57", 10, 10], ["PE", "51", 9, 9],
  ["VE", "58", 10, 10], ["BO", "591", 8, 8], ["EC", "593", 9, 9], ["MX", "52", 10, 10], ["ES", "34", 9, 9],
  ["IT", "39", 9, 11], ["FR", "33", 9, 9], ["DE", "49", 10, 11], ["GB", "44", 10, 10], ["NL", "31", 9, 9],
  ["BE", "32", 9, 9], ["CH", "41", 9, 9], ["IE", "353", 9, 9], ["JP", "81", 10, 11], ["AU", "61", 9, 9],
  ["AO", "244", 9, 9], ["MZ", "258", 9, 9],
  ["AF", "93"], ["AL", "355"], ["DZ", "213"], ["AD", "376"], ["AG", "1", 10, 10], ["AM", "374"], ["AT", "43"],
  ["AZ", "994"], ["BS", "1", 10, 10], ["BH", "973"], ["BD", "880"], ["BB", "1", 10, 10], ["BY", "375"],
  ["BZ", "501"], ["BJ", "229"], ["BT", "975"], ["BA", "387"], ["BW", "267"], ["BN", "673"], ["BG", "359"],
  ["BF", "226"], ["BI", "257"], ["KH", "855"], ["CM", "237"], ["CV", "238"], ["CF", "236"], ["TD", "235"],
  ["CN", "86", 11, 11], ["KM", "269"], ["CG", "242"], ["CD", "243"], ["CR", "506"], ["CI", "225"], ["HR", "385"],
  ["CU", "53"], ["CY", "357"], ["CZ", "420"], ["DK", "45"], ["DJ", "253"], ["DM", "1", 10, 10], ["DO", "1", 10, 10],
  ["EG", "20"], ["SV", "503"], ["GQ", "240"], ["ER", "291"], ["EE", "372"], ["SZ", "268"], ["ET", "251"],
  ["FJ", "679"], ["FI", "358"], ["GA", "241"], ["GM", "220"], ["GE", "995"], ["GH", "233"], ["GR", "30"],
  ["GD", "1", 10, 10], ["GT", "502"], ["GN", "224"], ["GW", "245"], ["GY", "592"], ["HT", "509"], ["HN", "504"],
  ["HU", "36"], ["IS", "354"], ["IN", "91", 10, 10], ["ID", "62"], ["IR", "98"], ["IQ", "964"], ["IL", "972"],
  ["JM", "1", 10, 10], ["JO", "962"], ["KZ", "7", 10, 10], ["KE", "254"], ["KI", "686"], ["KW", "965"],
  ["KG", "996"], ["LA", "856"], ["LV", "371"], ["LB", "961"], ["LS", "266"], ["LR", "231"], ["LY", "218"],
  ["LI", "423"], ["LT", "370"], ["LU", "352"], ["MG", "261"], ["MW", "265"], ["MY", "60"], ["MV", "960"],
  ["ML", "223"], ["MT", "356"], ["MH", "692"], ["MR", "222"], ["MU", "230"], ["FM", "691"], ["MD", "373"],
  ["MC", "377"], ["MN", "976"], ["ME", "382"], ["MA", "212"], ["MM", "95"], ["NA", "264"], ["NR", "674"],
  ["NP", "977"], ["NZ", "64"], ["NI", "505"], ["NE", "227"], ["NG", "234"], ["KP", "850"], ["MK", "389"],
  ["NO", "47"], ["OM", "968"], ["PK", "92"], ["PW", "680"], ["PS", "970"], ["PA", "507"], ["PG", "675"],
  ["PH", "63"], ["PL", "48", 9, 9], ["QA", "974"], ["RO", "40"], ["RU", "7", 10, 10], ["RW", "250"],
  ["KN", "1", 10, 10], ["LC", "1", 10, 10], ["VC", "1", 10, 10], ["WS", "685"], ["SM", "378"], ["ST", "239"],
  ["SA", "966"], ["SN", "221"], ["RS", "381"], ["SC", "248"], ["SL", "232"], ["SG", "65"], ["SK", "421"],
  ["SI", "386"], ["SB", "677"], ["SO", "252"], ["ZA", "27"], ["KR", "82"], ["SS", "211"], ["LK", "94"],
  ["SD", "249"], ["SR", "597"], ["SE", "46"], ["SY", "963"], ["TW", "886"], ["TJ", "992"], ["TZ", "255"],
  ["TH", "66"], ["TL", "670"], ["TG", "228"], ["TO", "676"], ["TT", "1", 10, 10], ["TN", "216"], ["TR", "90"],
  ["TM", "993"], ["TV", "688"], ["UG", "256"], ["UA", "380"], ["AE", "971"], ["UZ", "998"], ["VU", "678"],
  ["VA", "39"], ["VN", "84"], ["YE", "967"], ["ZM", "260"], ["ZW", "263"], ["HK", "852"], ["MO", "853"],
  ["PR", "1", 10, 10], ["XK", "383"],
];

const flagOf = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

const nameOf = (code: string, lang: string): string => {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};

/** Lista completa, com o Brasil primeiro e os demais em ordem alfabética no idioma do torcedor. */
export function getCountryDials(lang = "pt"): CountryDial[] {
  const all: CountryDial[] = RAW.map(([code, dial, min, max]) => ({
    code,
    dial: `+${dial}`,
    name: nameOf(code, lang),
    flag: flagOf(code),
    digits: [min ?? 6, max ?? 12] as [number, number],
  }));
  const [br, ...rest] = all;
  rest.sort((a, b) => a.name.localeCompare(b.name, lang));
  return [br, ...rest];
}

export const COUNTRY_DIALS: CountryDial[] = getCountryDials("pt");
