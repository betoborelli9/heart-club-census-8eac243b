import { describe, expect, it } from "vitest";
import {
  buildLocalQueries, coreName, dedupeStories, footballWordFor, hasFootballWord, isLocalRelevant, isOtherClub, marketFor, mergeNews, sameStory,
  sanitizeProfile, selectByWindow, storyTokens,
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
      cc: "jp", lang: "ja-JP", club_names: ["FC岐阜", "岐阜"], city_names: ["岐阜市"], football_words: ["サッカー"], homonyms: [], markers: [],
    });
  });

  it("descarta links, textos enormes, código estranho e lixo", () => {
    const p = sanitizeProfile({ cc: "br; DROP", lang: "<script>", club_names: ["https://evil.test", "ok FC", "x".repeat(200), 5, null], city_names: "não é lista", football_words: ["a@b.c"] });
    expect(p.cc).toBeUndefined();
    expect(p.lang).toBeUndefined();
    expect(p.club_names).toEqual(["ok FC"]);
    expect(p.city_names).toEqual([]);
    expect(p.football_words).toEqual([]);
    expect(sanitizeProfile(null)).toEqual({ cc: undefined, lang: undefined, club_names: [], city_names: [], football_words: [], homonyms: [], markers: [] });
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

describe("mesma notícia em sites diferentes vira uma só", () => {
  const rv = { clubName: "Rio Verde", cidade: "Rio Verde, Goiás" };
  const mk = (title: string, source: string, sourceRank = 50, extra: any = {}) => ({ title, source, sourceRank, pubDate: at(2 * H), ...extra });
  const jorginho = [
    mk("Jorginho, ex-Vila Nova e Atlético-GO, reforça Rio Verde no Goianão 2027", "Diário da Manhã", 60),
    mk("Rio Verde anuncia contratação do meia Jorginho, ex-Atlético-GO e Vila Nova", "ge.globo", 1),
    mk("Jorginho, ex-Vila Nova e Atlético, volta a disputar o Goianão em 2027", "ogol.com.br", 50),
    mk("De volta à elite, Rio Verde anuncia ídolo do Atlético-GO para o Goianão 2027", "Esporte Goiano", 60),
    mk("Lembra dele? Jorginho, ex-Atlético, vai defender o Rio Verde no Goianão 2027", "Mais Goiás", 60),
  ];

  it("as 5 manchetes do reforço Jorginho viram 1, com a fonte mais confiável e as outras em 'alsoIn'", () => {
    const out = dedupeStories(jorginho, rv);
    expect(out.length).toBe(1);
    expect(out[0].source).toBe("ge.globo");
    expect(out[0].alsoIn?.length).toBe(4);
    expect(out[0].alsoIn).not.toContain("ge.globo");
  });

  it("assuntos diferentes do mesmo clube continuam separados", () => {
    const out = dedupeStories(
      [...jorginho, mk("Rio Verde divulga tabela do Goianão 2027 e estreia contra o Anápolis", "Mais Goiás"), mk("Presidente do Rio Verde fala sobre reforma do estádio Mozart Veloso do Carmo", "O Popular")],
      rv,
    );
    expect(out.length).toBe(3);
  });

  it("dois jogos diferentes do mesmo clube não se misturam", () => {
    const fla = { clubName: "Flamengo", cidade: "Rio de Janeiro, Rio de Janeiro" };
    const out = dedupeStories([mk("Flamengo vence o Athletico-PR de virada no Maracanã", "A"), mk("Flamengo empata com o Palmeiras e segue na liderança", "B")], fla);
    expect(out.length).toBe(2);
  });

  it("o site oficial vence qualquer outra fonte", () => {
    const out = dedupeStories(
      [mk("Rio Verde anuncia contratação do meia Jorginho, ex-Atlético-GO e Vila Nova", "ge.globo", 1), mk("Jorginho, ex-Vila Nova e Atlético-GO, reforça o Rio Verde no Goianão 2027", "Rio Verde EC", 0, { isOfficial: true })],
      rv,
    );
    expect(out.length).toBe(1);
    expect(out[0].source).toBe("Rio Verde EC");
  });

  it("funciona em japonês (sem espaço entre palavras)", () => {
    const ctx = { clubName: "FC Gifu", profile: sanitizeProfile({ club_names: ["FC岐阜"], city_names: ["岐阜"] }) };
    const out = dedupeStories([mk("FC岐阜、堅守で首位キープ J3 アウェーで愛媛戦", "岐阜新聞"), mk("FC岐阜が堅守で首位キープ J3 愛媛とのアウェー戦", "中日新聞"), mk("FC岐阜、新監督に就任が決定", "岐阜新聞")], ctx);
    expect(out.length).toBe(2);
  });

  it("palavras-chave ignoram o nome do clube e palavras vazias", () => {
    const t = storyTokens("O Rio Verde vence a partida de ontem", new Set(["rio", "verde"]));
    expect([...t]).toEqual(["vence", "partida", "ontem"]);
    expect(sameStory(new Set(["a1", "b2"]), new Set(["a1", "b2"]))).toBe(false); // poucas palavras: não junta
  });
});

describe("clubes de MESMO NOME não se misturam", () => {
  it("Nacional (Portugal) x Nacional de Montevideo: nome do homônimo sem prova de que é o nosso → fora", () => {
    const profile = sanitizeProfile({ homonyms: ["Nacional de Montevideo", "Nacional Potosí"], markers: ["Choupana"], city_names: ["Funchal"] });
    const ctx = { clubName: "Nacional", cidade: "Funchal, Madeira", country: "Portugal", profile };
    expect(isOtherClub("Nacional de Montevideo vence clássico no campeonato uruguaio", ctx)).toBe(true);
    expect(isOtherClub("Nacional vence no Choupana e sobe na tabela", ctx)).toBe(false);
    expect(isOtherClub("Nacional do Funchal contrata avançado", ctx)).toBe(false);
    expect(isOtherClub("Nacional de Montevideo visita o Funchal em jogo amistoso", ctx)).toBe(false); // cita a nossa cidade
  });

  it("homônimos que o próprio cadastro do site conhece também valem", () => {
    const ctx = { clubName: "Santos", cidade: "Santos, São Paulo", country: "Brazil", dbHomonyms: ["Santos Laguna", "Santos de Guápiles"] };
    expect(isOtherClub("Santos Laguna vence o América pela Liga MX", ctx)).toBe(true);
    expect(isOtherClub("Santos vence o Corinthians pelo Brasileirão", ctx)).toBe(false);
  });

  it("nome completo nosso mais comprido que o do homônimo não é bloqueado", () => {
    const ctx = { clubName: "Real Sociedad", cidade: "San Sebastián", country: "Spain", profile: sanitizeProfile({ homonyms: ["Real Madrid"] }) };
    expect(isOtherClub("Real Sociedad vence o Real Madrid na Copa del Rey", ctx)).toBe(false);
    expect(isOtherClub("Real Madrid goleia na Champions", ctx)).toBe(true);
  });

  it("homônimo cujo nome é parte do nosso nome é ignorado (Santos Laguna x 'Santos')", () => {
    const ctx = { clubName: "Santos Laguna", cidade: "Torreón, Coahuila", country: "Mexico", dbHomonyms: ["Santos"] };
    expect(isOtherClub("Santos Laguna vence en la Liga MX", ctx)).toBe(false);
  });

  it("Brasil: Botafogo-SP não entra no Botafogo do Rio, e vice-versa", () => {
    const rj = { clubName: "Botafogo", cidade: "Rio de Janeiro, Rio de Janeiro", country: "Brazil" };
    expect(isOtherClub("Botafogo-SP vence o Santos e assume a liderança", rj)).toBe(true);
    expect(isOtherClub("Botafogo-RJ vence o Flamengo no Nilton Santos", rj)).toBe(false);
    expect(isOtherClub("Botafogo se prepara para a final", rj)).toBe(false); // "se" é palavra, não estado
    const sp = { clubName: "Botafogo", cidade: "Ribeirão Preto, São Paulo", country: "Brazil" };
    expect(isOtherClub("Botafogo-SP vence o Santos", sp)).toBe(false);
    expect(isOtherClub("Botafogo-PB perde em casa", sp)).toBe(true);
  });

  it("título todo em maiúsculas não dispara o teste de sigla de estado", () => {
    const rj = { clubName: "Botafogo", cidade: "Rio de Janeiro, Rio de Janeiro", country: "Brazil" };
    expect(isOtherClub("BOTAFOGO SE PREPARA PARA O JOGO", rj)).toBe(false);
  });

  it("a relevância usa a checagem de homônimo", () => {
    const profile = sanitizeProfile({ homonyms: ["Nacional de Montevideo"] });
    const ctx = { clubName: "Nacional", cidade: "Funchal, Madeira", country: "Portugal", profile };
    expect(isLocalRelevant({ title: "Nacional de Montevideo vence clássico no campeonato uruguaio" }, ctx)).toBe(false);
    expect(isLocalRelevant({ title: "Nacional do Funchal vence clássico no campeonato" }, ctx)).toBe(true);
  });
});

describe("clube cadastrado com sigla (Botafogo SP) exige prova de que a notícia é dele", () => {
  const sp = { clubName: "Botafogo SP", cidade: "Ribeirão Preto, São Paulo", country: "Brazil" };
  it("só 'Botafogo' (sem sigla) é do outro Botafogo, não do paulista", () => {
    expect(isOtherClub("Corinthians bate Botafogo e deixa o Z4 em noite de Kaio César", sp)).toBe(true);
    expect(isOtherClub("Tite define permanência na Série A como primeiro objetivo do Botafogo", sp)).toBe(true);
  });
  it("com a sigla, a cidade ou o apelido, é dele", () => {
    expect(isOtherClub("Botafogo-SP define critérios rigorosos para novas contratações", sp)).toBe(false);
    expect(isOtherClub("Botafogo SP renova com o goleiro", sp)).toBe(false);
    expect(isOtherClub("Em Ribeirão Preto, Botafogo anuncia reforço para 2027", sp)).toBe(false);
    expect(isOtherClub("Botafogo-PB perde em casa", sp)).toBe(true); // sigla de outro estado
  });
  it("o Botafogo do Rio (sem sigla no cadastro) segue com as notícias dele e não pega as de outro estado", () => {
    const rj = { clubName: "Botafogo", cidade: "Rio de Janeiro", country: "Brazil" };
    expect(isOtherClub("Corinthians bate Botafogo e deixa o Z4", rj)).toBe(false);
    expect(isOtherClub("Botafogo-SP define critérios rigorosos para novas contratações", rj)).toBe(true);
  });
});

describe("palavra de futebol só vale como palavra", () => {
  it("'brasileiro' (gente), 'machine' e 'ligar' não são futebol", () => {
    expect(hasFootballWord("O cânion brasileiro onde um rio verde-esmeralda corre entre paredões gigantes")).toBe(false);
    expect(hasFootballWord("Machine learning in Gateshead")).toBe(false);
    expect(hasFootballWord("Como ligar o ar condicionado")).toBe(false);
  });
  it("mas futebol de verdade continua valendo (plural, sufixo, outras escritas)", () => {
    expect(hasFootballWord("Rio Verde acerta com dois goleiros e três jogos de preparação")).toBe(true);
    expect(hasFootballWord("Corinthians vence o Brasileirão")).toBe(true);
    expect(hasFootballWord("岐阜のサッカークラブが首位を維持")).toBe(true);
  });
  it("o rio verde-esmeralda não vira notícia do clube Rio Verde", () => {
    expect(isLocalRelevant({ title: "O cânion brasileiro onde um rio verde-esmeralda corre entre paredões gigantes" }, { clubName: "Rio Verde", cidade: "Rio Verde, Goiás" })).toBe(false);
  });
});

describe("a divisão (Série A/B/C) diz qual dos Botafogos é", () => {
  const rj = { clubName: "Botafogo", cidade: "Rio de Janeiro", country: "Brazil", divisions: ["Carioca - 1", "Serie A"], dbHomonyms: ["Botafogo SP", "Ribeirão Preto", "Botafogo PB", "João Pessoa"] };
  const sp = { clubName: "Botafogo SP", cidade: "Ribeirão Preto, São Paulo", country: "Brazil", divisions: ["Paulista - A1", "Serie B"], dbHomonyms: ["Botafogo", "Botafogo PB", "João Pessoa"] };
  const pb = { clubName: "Botafogo PB", cidade: "João Pessoa, Paraíba", country: "Brazil", divisions: ["Paraibano", "Serie C"], dbHomonyms: ["Botafogo", "Botafogo SP", "Ribeirão Preto"] };

  it("Série A → Botafogo do Rio; Série B → Botafogo de Ribeirão Preto; Série C → Botafogo da Paraíba", () => {
    expect(isOtherClub("Botafogo empata e segue na Série A com Tite", rj)).toBe(false);
    expect(isOtherClub("Botafogo vence e embala na Série B rumo ao acesso, diz técnico", sp)).toBe(false);
    expect(isOtherClub("Botafogo avança na Série C com gol no fim", pb)).toBe(false);
    // a notícia da divisão errada não entra
    expect(isOtherClub("Botafogo vence e lidera a Série B", rj)).toBe(true);
    expect(isOtherClub("Botafogo goleia na Série A e sonha com a Libertadores", sp)).toBe(true);
    expect(isOtherClub("Botafogo sofre na Série A", pb)).toBe(true);
  });

  it("para o Botafogo SP, 'Botafogo' + Série A não é dele, mas + Série B ou Ribeirão Preto é", () => {
    expect(isOtherClub("Corinthians bate Botafogo pela Série A", sp)).toBe(true);
    expect(isOtherClub("Botafogo encara o Juventude pela Série B", sp)).toBe(false);
    expect(isOtherClub("Em Ribeirão Preto, Botafogo encara a final", sp)).toBe(false);
  });

  it("notícia que fala em cair ou subir de divisão não é descartada por citar a outra série", () => {
    expect(isOtherClub("Risco de rebaixamento: Botafogo pode cair para a Série B", rj)).toBe(false);
  });

  it("sem outro clube de nome parecido, a divisão não é usada (não descarta notícia certa)", () => {
    const solo = { clubName: "Flamengo", cidade: "Rio de Janeiro", country: "Brazil", divisions: ["Serie A"] };
    expect(isOtherClub("Flamengo vence o Palmeiras e olha para a Série B de 2027 com respeito", solo)).toBe(false);
  });
});
