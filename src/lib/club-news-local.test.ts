import { describe, expect, it } from "vitest";
import {
  buildLocalQueries, coreName, footballWordFor, hasFootballWord, isLocalRelevant, marketFor, mergeNews, sanitizeProfile, selectByWindow,
} from "../../supabase/functions/_shared/club-news-local";

const NOW = new Date("2026-11-19T12:00:00Z").getTime();
const H = 3600 * 1000;
const D = 24 * H;
const at = (ms: number) => new Date(NOW - ms).toUTCString();

describe("mercado (país → Bing) de qualquer clube do mundo", () => {
  it("países conhecidos", () => {
    expect(marketFor("Brazil")).toMatchObject({ cc: "br", lang: "pt-BR", known: true });
    expect(marketFor("Japan")).toMatchObject({ cc: "jp", lang: "ja-JP", latin: false });
    expect(marketFor("South-Korea")).toMatchObject({ cc: "kr", lang: "ko-KR" });
    expect(marketFor("Czech-Republic")).toMatchObject({ cc: "cz" });
    expect(marketFor("USA")).toMatchObject({ cc: "us" });
    expect(marketFor("England")).toMatchObject({ cc: "gb", lang: "en-GB" });
    expect(marketFor("Armenia")).toMatchObject({ cc: "am", latin: false });
  });

  it("país desconhecido ou vazio: cai no inglês, sem quebrar", () => {
    expect(marketFor("Narnia")).toMatchObject({ cc: "us", known: false });
    expect(marketFor(null)).toMatchObject({ cc: "us", known: false });
  });

  it("'futebol' na língua local", () => {
    expect(footballWordFor("pt-BR")).toBe("futebol");
    expect(footballWordFor("es-AR")).toBe("fútbol");
    expect(footballWordFor("ja-JP")).toBe("サッカー");
    expect(footballWordFor("ko-KR")).toBe("축구");
    expect(footballWordFor("xx-YY")).toBe("football");
  });
});

describe("nome núcleo do clube", () => {
  it("tira só o que é forma jurídica; o resto do nome fica (Sport, Real, Atlético…)", () => {
    expect(coreName("Goiatuba EC")).toBe("Goiatuba");
    expect(coreName("Rio Verde Esporte Clube")).toBe("Rio Verde");
    expect(coreName("FC Gifu")).toBe("Gifu");
    expect(coreName("Sport Recife")).toBe("Sport Recife");
    expect(coreName("Real Garcilaso")).toBe("Real Garcilaso");
    expect(coreName("FC")).toBe("FC"); // nada sobra: devolve o original
  });
});

describe("buscas locais", () => {
  it("Rio Verde (clube com nome de cidade): nome + futebol, com o estado para desambiguar, no mercado do Brasil", () => {
    const qs = buildLocalQueries({ clubName: "Rio Verde", cidade: "Rio Verde, Goiás", country: "Brazil" });
    expect(qs[0]).toEqual({ q: '"Rio Verde" futebol', cc: "br", lang: "pt-BR" });
    expect(qs.map((q) => q.q)).toContain('"Rio Verde" futebol Goiás');
    expect(new Set(qs.map((q) => q.q)).size).toBe(qs.length); // sem repetir
    expect(qs.length).toBeLessThanOrEqual(6);
  });

  it("Goiatuba EC: o nome núcleo, o nome completo e a cidade", () => {
    const qs = buildLocalQueries({ clubName: "Goiatuba EC", cidade: "Goiatuba, Goiás", country: "Brazil" }).map((q) => q.q);
    expect(qs).toContain('"Goiatuba" futebol');
    expect(qs).toContain('"Goiatuba EC"');
    expect(qs).toContain('"Goiatuba" futebol Goiás');
  });

  it("clube japonês: com o nome na escrita local (vindo da IA) e a palavra de futebol local, no mercado do Japão", () => {
    const profile = sanitizeProfile({ cc: "jp", lang: "ja-JP", club_names: ["FC岐阜"], city_names: ["岐阜市"], football_words: ["サッカー"] });
    const qs = buildLocalQueries({ clubName: "FC Gifu", cidade: "Gifu", country: "Japan", profile });
    expect(qs.map((q) => q.q)).toContain("FC岐阜");
    expect(qs.map((q) => q.q)).toContain("FC岐阜 サッカー");
    expect(qs.every((q) => q.cc === "jp" && q.lang === "ja-JP")).toBe(true);
  });

  it("sem perfil da IA, um clube asiático ainda ganha busca (mercado do país + palavra local de futebol)", () => {
    const qs = buildLocalQueries({ clubName: "Pohang Steelers", cidade: "Pohang", country: "South-Korea" });
    expect(qs[0]).toEqual({ q: '"Pohang Steelers" 축구', cc: "kr", lang: "ko-KR" });
  });
});

describe("perfil local vindo da IA é validado", () => {
  it("aceita o formato certo", () => {
    expect(sanitizeProfile({ cc: "JP", lang: "ja-JP", club_names: ["FC岐阜", "岐阜"], city_names: ["岐阜市"], football_words: ["サッカー"] })).toEqual({
      cc: "jp", lang: "ja-JP", club_names: ["FC岐阜", "岐阜"], city_names: ["岐阜市"], football_words: ["サッカー"],
    });
  });

  it("descarta links, textos enormes, código estranho e lixo", () => {
    const p = sanitizeProfile({ cc: "br; DROP", lang: "<script>", club_names: ["https://evil.test", "ok FC", "x".repeat(200), 5, null], city_names: "não é lista", football_words: ["a@b.c"] });
    expect(p.cc).toBeUndefined();
    expect(p.lang).toBeUndefined();
    expect(p.club_names).toEqual(["ok FC"]);
    expect(p.city_names).toEqual([]);
    expect(p.football_words).toEqual([]);
    expect(sanitizeProfile(null)).toEqual({ cc: undefined, lang: undefined, club_names: [], city_names: [], football_words: [] });
  });

  it("no máximo 3 nomes de clube, 2 de cidade e 3 palavras", () => {
    const p = sanitizeProfile({ club_names: ["a1", "a2", "a3", "a4", "a5"], city_names: ["c1", "c2", "c3"], football_words: ["f1", "f2", "f3", "f4"] });
    expect([p.club_names.length, p.city_names.length, p.football_words.length]).toEqual([3, 2, 3]);
  });
});

describe("relevância: a notícia é mesmo do clube?", () => {
  const rv = { clubName: "Rio Verde", cidade: "Rio Verde, Goiás" };

  it("clube pequeno com nome de cidade: notícia de futebol entra, notícia da cidade não", () => {
    expect(isLocalRelevant({ title: "Rio Verde anuncia contratação do meia Jorginho, ex-Atlético-GO e Vila Nova" }, rv)).toBe(true);
    expect(isLocalRelevant({ title: "Prefeitura de Rio Verde abre inscrições para curso de capacitação" }, rv)).toBe(false);
    expect(isLocalRelevant({ title: "Chuva forte causa alagamentos em Rio Verde nesta terça" }, rv)).toBe(false);
  });

  it("Goiatuba: a notícia do campeonato com o clube entra", () => {
    const g = { clubName: "Goiatuba EC", cidade: "Goiatuba, Goiás" };
    expect(isLocalRelevant({ title: "Com Anápolis e Goiatuba, Série C de 2027 tem participantes definidos" }, g)).toBe(true);
    expect(isLocalRelevant({ title: "Vila Nova vence o Atlético-GO e assume a vice-liderança da Série B" }, g)).toBe(false); // outro clube
  });

  it("futebol de várzea / escolinha nunca entra", () => {
    expect(isLocalRelevant({ title: "Torneio de várzea reúne times de Rio Verde no fim de semana" }, rv)).toBe(false);
    expect(isLocalRelevant({ title: "Escolinha de futebol do Rio Verde abre matrículas" }, rv)).toBe(false);
  });

  it("nome de UMA palavra comum (Nacional): só vale com a cidade no texto", () => {
    const nac = { clubName: "Nacional", cidade: "Manaus, Amazonas" };
    expect(isLocalRelevant({ title: "Nacional vence clássico no campeonato" }, nac)).toBe(false); // qual Nacional?
    expect(isLocalRelevant({ title: "Nacional de Manaus vence clássico no campeonato amazonense" }, nac)).toBe(true);
  });

  it("clube de outro alfabeto: o nome na escrita local (da IA) acha a notícia do jornal da cidade", () => {
    const profile = sanitizeProfile({ club_names: ["FC岐阜"], city_names: ["岐阜市"], football_words: ["サッカー"] });
    const ctx = { clubName: "FC Gifu", cidade: "Gifu", profile };
    expect(isLocalRelevant({ title: "FC岐阜、堅守で首位キープだ！ J3、21日アウェーで愛媛戦" }, ctx)).toBe(true);
    expect(isLocalRelevant({ title: "岐阜市で新しい図書館が開館" }, ctx)).toBe(false); // só a cidade
    expect(isLocalRelevant({ title: "カターレ富山、初のJ2首位はお預け" }, ctx)).toBe(false); // outro clube
  });

  it("título em inglês com o nome do clube e 'football' entra", () => {
    expect(isLocalRelevant({ title: "Paul Bracewell named Gateshead FC technical director" }, { clubName: "Gateshead FC", cidade: "Gateshead", profile: null })).toBe(false); // sem palavra de futebol nem na descrição
    expect(isLocalRelevant({ title: "Gateshead FC appoint new manager", description: "The football club confirmed the signing" }, { clubName: "Gateshead FC" })).toBe(true);
  });

  it("palavra de futebol em várias línguas", () => {
    for (const t of ["Amedspor maç hazırlıkları", "Il Gubbio calcio", "Die Fußball-Bundesliga", "축구 경기 결과", "サッカーJ3", "Дерби в футбольной лиге"]) {
      expect(hasFootballWord(t)).toBe(true);
    }
    expect(hasFootballWord("Receita de bolo de cenoura")).toBe(false);
  });
});

describe("janela de tempo adaptativa (clube grande x clube pequeno)", () => {
  const item = (ms: number, t = "x") => ({ title: `${t}${ms}`, pubDate: at(ms) });

  it("clube com muita notícia recente: só as de 48 h (janela 2 dias)", () => {
    const r = selectByWindow([item(1 * H), item(5 * H), item(30 * H), item(3 * D), item(10 * D)], NOW);
    expect(r.windowDays).toBe(2);
    expect(r.items.length).toBe(3);
  });

  it("clube pequeno com 1 notícia em 48 h: alarga para 7 dias", () => {
    const r = selectByWindow([item(5 * H), item(3 * D), item(6 * D), item(12 * D)], NOW);
    expect(r.windowDays).toBe(7);
    expect(r.items.length).toBe(3);
  });

  it("clube bem pequeno: alarga até 30 dias", () => {
    const r = selectByWindow([item(10 * D), item(20 * D), item(29 * D), item(45 * D)], NOW);
    expect(r.windowDays).toBe(30);
    expect(r.items.length).toBe(3); // a de 45 dias nunca entra
  });

  it("sem notícia nenhuma (ou só antiga demais): lista vazia, janela de 30 dias", () => {
    expect(selectByWindow([], NOW)).toEqual({ items: [], windowDays: 30 });
    expect(selectByWindow([item(90 * D)], NOW)).toEqual({ items: [], windowDays: 30 });
  });

  it("vem da mais recente para a mais antiga e ignora data inválida ou do futuro", () => {
    const r = selectByWindow<any>([item(20 * H), { title: "sem data" }, { title: "futuro", pubDate: new Date(NOW + 5 * D).toUTCString() }, item(2 * H), item(10 * H)], NOW);
    expect(r.items.map((i) => i.title)).toEqual(["x7200000", "x36000000", "x72000000"]);
  });
});

describe("juntar listas sem repetir assunto", () => {
  it("a primeira lista tem preferência e o mesmo título não entra duas vezes", () => {
    const out = mergeNews(
      [{ title: "Rio Verde anuncia Jorginho", src: "ge" }],
      [{ title: "RIO VERDE ANUNCIA JORGINHO!", src: "local" }, { title: "Outro assunto", src: "local" }],
    );
    expect(out.map((o: any) => o.src)).toEqual(["ge", "local"]);
    expect(out.length).toBe(2);
  });
});
