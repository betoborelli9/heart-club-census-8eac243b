import { describe, it, expect } from "vitest";
import { parseListing, matchGame, normalizeChannel, normTeam, toBrt, brtDate } from "../../supabase/functions/_shared/tv-listing";

// 24/10/2026 14:00 em Brasília (sábado)
const NOW = Date.UTC(2026, 9, 24, 17, 0, 0);

const team = (side: "a" | "b", slug: string, name: string) =>
  `<div class="x"><div id="jogo-card-team-${side}-${slug}"><img src="https://static/x.png" alt="${name}" loading="lazy"></div><span class="n">${name}</span></div>`;
const pills = (...names: string[]) =>
  `<div class="c">${names.map((n) => `<span class="p"><span class="d"></span><span class="t"> ${n} </span></span>`).join("")}</div>`;
const article = (slug: string, league: string, time: string, a: string, b: string, ch: string[]) =>
  `<a href="/aovivo/${slug}.html"><article class="g"><div><p><span>${league}</span><span> - Rodada 35 </span></p></div>` +
  `<div><time> ${time} </time>${team("a", slug, a)}${team("b", slug, b)}</div>${pills(...ch)}</article></a>`;

const LEAGUE_PAGE = `
<h2>Próximos jogos</h2>
<div><h3 class="h"> Hoje </h3>
${article("avai-x-botafogo-sp-1", "Brasileirão Série B", "16:00", "Avai", "Botafogo SP", ["DISNEY+"])}
${article("atletico-go-x-novorizontino-2", "Brasileirão Série B", "16:30", "Atlético GO", "Novorizontino", ["REDETV!", "ESPN", "CANAL GOAT", "DISNEY+"])}
</div>
<div><h3 class="h"> Seg, 26/10 </h3>
${article("ceara-x-goias-3", "Brasileirão Série B", "20:00", "Ceará", "Goiás", ["XSPORTS", "SPORTYNET", "ESPN", "YOUTUBE", "(SPORTYNET)", "DISNEY+"])}
</div>
<div><h3 class="h"> Sex, 30/10 </h3>
${article("crb-x-londrina-4", "Brasileirão Série B", "21:30", "CRB", "Londrina", [])}
</div>`;

describe("parseListing", () => {
  const games = parseListing(LEAGUE_PAGE, NOW);

  it("lê todos os jogos com data, hora e times", () => {
    expect(games).toHaveLength(4);
    expect(games[0]).toMatchObject({ date: "2026-10-24", time: "16:00", home: "Avai", away: "Botafogo SP" });
    expect(games[2]).toMatchObject({ date: "2026-10-26", time: "20:00", home: "Ceará", away: "Goiás" });
    expect(games[3]).toMatchObject({ date: "2026-10-30", time: "21:30" });
  });

  it("normaliza os canais, tira repetidos entre parênteses e emissoras estrangeiras", () => {
    expect(games[0].channels).toEqual(["Disney+"]);
    expect(games[1].channels).toEqual(["RedeTV!", "ESPN", "Canal GOAT", "Disney+"]);
    expect(games[2].channels).toEqual(["ESPN", "YouTube", "Disney+"]);
  });

  it("jogo sem canal na grade fica com lista vazia (a confirmar)", () => {
    expect(games[3].channels).toEqual([]);
  });

  it("página 'jogos de hoje' usa a data padrão quando não há cabeçalho de dia", () => {
    const html = article("lazio-x-parma-9", "Campeonato Italiano", "15:45", "Lazio", "Parma", ["ESPN 2", "DISNEY+"]);
    const g = parseListing(html, NOW, "2026-10-24");
    expect(g).toEqual([{ date: "2026-10-24", time: "15:45", home: "Lazio", away: "Parma", channels: ["ESPN 2", "Disney+"] }]);
  });

  it("ignora cartões em destaque sem horário/times (sem inventar)", () => {
    expect(parseListing("<article><p>Algo</p></article>", NOW, "2026-10-24")).toEqual([]);
  });

  it("'Amanhã' e datas de virada de ano", () => {
    const html = `<h3>Amanhã</h3>${article("a-x-b-1", "L", "10:00", "A", "B", ["GLOBO"])}<h3>Sáb, 02/01</h3>${article("c-x-d-2", "L", "11:00", "C", "D", [])}`;
    const g = parseListing(html, Date.UTC(2026, 11, 30, 15, 0, 0));
    expect(g[0].date).toBe("2026-12-31");
    expect(g[1].date).toBe("2027-01-02");
  });
});

describe("matchGame", () => {
  const games = parseListing(LEAGUE_PAGE, NOW);
  // 16:30 BRT = 19:30 UTC
  const fx = (iso: string, home: string, away: string) => ({ date: iso, home: { name: home }, away: { name: away } });

  it("casa por data, horário de Brasília e nomes (com/sem acento e sufixos)", () => {
    const g = matchGame(games, fx("2026-10-24T19:30:00+00:00", "Atletico-GO", "Gremio Novorizontino"));
    expect(g?.channels).toEqual(["RedeTV!", "ESPN", "Canal GOAT", "Disney+"]);
  });

  it("casa Ceará x Goiás no dia 26 às 20:00 BRT (23:00 UTC)", () => {
    expect(matchGame(games, fx("2026-10-26T23:00:00Z", "Ceara", "Goias"))?.channels).toContain("ESPN");
  });

  it("casa mesmo se o horário mudou de última hora (mesmo dia e mesmos times)", () => {
    // a base ainda diz 15:00 BRT; a grade já traz 16:30
    expect(matchGame(games, fx("2026-10-24T18:00:00Z", "Atletico-GO", "Novorizontino"))?.time).toBe("16:30");
  });

  it("não casa se o dia é outro ou os times não batem", () => {
    expect(matchGame(games, fx("2026-10-27T23:00:00Z", "Ceara", "Goias"))).toBeNull();
    expect(matchGame(games, fx("2026-10-26T23:00:00Z", "Ceara", "Fortaleza"))).toBeNull();
    expect(matchGame(games, fx("2026-10-26T23:00:00Z", "", ""))).toBeNull();
  });
});

describe("auxiliares", () => {
  it("normalizeChannel", () => {
    expect(normalizeChannel("DISNEY+")).toBe("Disney+");
    expect(normalizeChannel("CAZÉTV")).toBe("CazéTV");
    expect(normalizeChannel("(SPORTYNET)")).toBe("");
    expect(normalizeChannel("ESPN 4")).toBe("ESPN 4");
    expect(normalizeChannel("  ")).toBe("");
  });

  it("normTeam tira acento, sufixos e pontuação", () => {
    expect(normTeam("América-MG")).toEqual(["america", "mg"]);
    expect(normTeam("Grêmio")).toEqual(["gremio"]);
    expect(normTeam("Athletic Club FC")).toEqual(["athletic"]);
  });

  it("toBrt / brtDate", () => {
    expect(toBrt("2026-10-25T01:30:00Z")).toEqual({ date: "2026-10-24", time: "22:30" });
    expect(brtDate(NOW, 1)).toBe("2026-10-25");
  });
});

// FORMATO NOVO da grade (futebolnatv.com.br, nov/2026): o robô lia ZERO jogos e deixava "a confirmar" em todos.
// Trechos reais da página /jogos-hoje (22/11/2026).
const tv = (names: string[], small = "") =>
  names.map((n, i) => `<span><svg fill="none" aria-hidden="true"><use href="#i-tv"></use></svg><b>${n}</b> ${i === names.length - 1 ? small : ""}</span>`).join("");
const newArticle = (ts: number, league: string, time: string, a: string, b: string, channels: string) =>
  `<article data-slot="j1" data-league="1222" data-teams="4892 4986" data-ts="${ts}" data-status="upcoming"><a href="/aovivo/x.html" aria-label="${a} x ${b}"></a>` +
  `<div><img src="https://static/c.png" alt="" width="20" height="20"><p><b>${league}</b> - Final</p></div>` +
  `<div><div><strong>${time}</strong> </div><div><div><img src="https://static/a.png" alt="${a}" width="28" height="28"><span>${a}</span></div>` +
  `<div><img src="https://static/b.png" alt="${b}" width="28" height="28"><span>${b}</span></div></div></div>` +
  `<div>${channels}</div><button type="button" data-follow></button></article>`;

describe("parseListing — formato novo da grade (data-ts)", () => {
  // 22/11/2026 18:30 em Brasília = 21:30 UTC
  const TS_1830 = Date.UTC(2026, 10, 22, 21, 30, 0) / 1000;
  const TS_1330 = Date.UTC(2026, 10, 22, 16, 30, 0) / 1000;
  const NOW_NOV = Date.UTC(2026, 10, 22, 14, 0, 0);
  const html =
    `<section><div>` +
    newArticle(TS_1830, "Brasileirão Série B", "18:30", "Atlético GO", "Vila Nova", tv(["XSPORTS", "ESPN", "CANAL GOAT", "DISNEY+"])) +
    newArticle(TS_1330, "Premier League", "13:30", "Liverpool", "Manchester United", tv(["ESPN", "DISNEY+"])) +
    newArticle(TS_1330, "Copa do Canadá", "13:30", "Toronto", "Montreal", tv(["REDETV!", "ESPN", "SPORTYNET", "YOUTUBE", "DISNEY+"], "")) +
    newArticle(TS_1830, "Série D", "18:30", "Time A", "Time B", "") +
    `</div></section>`;
  const games = parseListing(html, NOW_NOV, "2026-11-22");

  it("lê data e hora de Brasília pelo carimbo de tempo, os dois times e os canais", () => {
    expect(games).toHaveLength(4);
    expect(games[0]).toEqual({ date: "2026-11-22", time: "18:30", home: "Atlético GO", away: "Vila Nova", channels: ["ESPN", "Canal GOAT", "Disney+"] });
    expect(games[1]).toEqual({ date: "2026-11-22", time: "13:30", home: "Liverpool", away: "Manchester United", channels: ["ESPN", "Disney+"] });
  });

  it("jogo sem canal na grade fica com lista vazia (a confirmar), sem inventar", () => {
    expect(games[3].channels).toEqual([]);
  });

  it("'YouTube (Sportynet)' é a emissora estrangeira: não entra", () => {
    const g = parseListing(
      newArticle(TS_1330, "L", "13:30", "A", "B", tv(["ESPN"]) + `<span><svg><use href="#i-tv"></use></svg><b>YOUTUBE</b> <small>(SPORTYNET)</small></span>`),
      NOW_NOV,
    );
    expect(g[0].channels).toEqual(["ESPN"]);
  });

  it("o jogo do Heart Club (nomes da API) casa com o da grade e traz ESPN, Canal GOAT e Disney+", () => {
    const hit = matchGame(games, { date: "2026-11-22T21:30:00+00:00", home: { name: "Atletico Goianiense" }, away: { name: "Vila Nova" } });
    expect(hit?.channels).toEqual(["ESPN", "Canal GOAT", "Disney+"]);
  });

  it("não confunde com jogo de outro dia ou de outros times", () => {
    expect(matchGame(games, { date: "2026-11-23T21:30:00+00:00", home: { name: "Atletico Goianiense" }, away: { name: "Vila Nova" } })).toBeNull();
    expect(matchGame(games, { date: "2026-11-22T21:30:00+00:00", home: { name: "Atletico Mineiro" }, away: { name: "Vila Nova" } })).toBeNull();
  });

  it("o formato antigo continua sendo lido (página com <time> e cabeçalho de dia)", () => {
    const old = parseListing(LEAGUE_PAGE, NOW);
    expect(old).toHaveLength(4);
  });
});
