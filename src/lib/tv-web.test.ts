import { describe, it, expect } from "vitest";
import {
  groundChannels, isBroadcastTitle, marketForGame, mentionsGameDay, parseAiAnswer, realUrl, teamInText, titleIsAboutGame, transmissionWindows,
  visibleText, voteChannels, webQueries,
} from "../../supabase/functions/_shared/tv-web";

// Jogo de domingo, 22/11/2026, 18:30 em Brasília (21:30 UTC)
const FX = { date: "2026-11-22T21:30:00+00:00", home: { name: "Sparta Praha" }, away: { name: "Slavia Praha" } };
const FX_GO = { date: "2026-11-22T21:30:00+00:00", home: { name: "Atletico Goianiense" }, away: { name: "Vila Nova" } };

describe("pesquisa 'onde assistir' na internet — regras para não inventar", () => {
  it("monta as buscas com os nomes dos dois times", () => {
    const q = webQueries(FX);
    expect(q).toHaveLength(3);
    expect(webQueries({ date: "x", home: { name: "Colo Colo" }, away: { name: "U. Catolica" } })[2].q).toBe("Colo Colo Catolica onde assistir");
    expect(q[0].q).toContain("Sparta Praha");
    expect(q[0].q).toContain("Slavia Praha");
    expect(q[0].q).toContain("onde assistir");
    expect(q[0]).toMatchObject({ cc: "br", lang: "pt-BR" });
    expect(webQueries({ date: "x", home: { name: "A" } })).toEqual([]);
  });

  it("jogo de outro país: pesquisa também na imprensa de lá, na língua de lá", () => {
    const cl = marketForGame("Chile");
    expect(cl).toMatchObject({ cc: "cl", lang: "es-CL", local: true, phrase: "dónde ver" });
    expect(webQueries(FX, cl)[0]).toEqual({ q: '"Sparta Praha" "Slavia Praha" dónde ver', cc: "cl", lang: "es-CL" });
    expect(marketForGame("Czech-Republic")).toMatchObject({ cc: "cz", local: true, phrase: "kde sledovat" });
    expect(marketForGame("England")).toMatchObject({ cc: "gb", phrase: "where to watch" });
    expect(marketForGame("Italy").phrase).toBe("dove vedere");
  });

  it("Brasil, campeonato continental ou país desconhecido: pesquisa só no Brasil (português)", () => {
    expect(marketForGame("Brazil").local).toBe(false);
    expect(marketForGame("World").local).toBe(false);
    expect(marketForGame("Europe").local).toBe(false);
    expect(marketForGame(null).local).toBe(false);
    expect(marketForGame("Japan").local).toBe(false); // escrita não latina: o casamento é pelo nome em letras latinas
  });

  it("manchete de transmissão em várias línguas", () => {
    for (const t of ["Where to watch Sparta Praha v Slavia Praha: TV channel and live stream", "Dónde ver Colo Colo vs U. Católica: canal y horario",
      "Dove vedere Juventus Venezia in TV e streaming", "Wo sehen? Bayern gegen Dortmund live im TV und Livestream", "Waar kijken naar Ajax - Feyenoord",
      "Kde sledovat Spartu a Slavii", "Fenerbahçe Galatasaray maçı hangi kanalda"])
      expect(isBroadcastTitle(t)).toBe(true);
    expect(isBroadcastTitle("Sparta Praha contrata atacante")).toBe(false);
  });

  it("acha o dia do jogo escrito em várias línguas", () => {
    for (const t of ["El partido es el 22 de noviembre", "Kick-off on 22 November at 21:30", "Sunday, November 22, 2026", "Anpfiff am 22. November", "Il match è il 22 novembre",
      "Le match a lieu le 22 novembre", "22 Kasım Pazar günü saat 21.30", "Game on 22nd November", "2026-11-22 18:30"])
      expect(mentionsGameDay(t, FX.date)).toBe(true);
    expect(mentionsGameDay("El partido es el 23 de noviembre", FX.date)).toBe(false);
    expect(mentionsGameDay("Played on 12 November", FX.date)).toBe(false);
  });

  it("a manchete precisa falar de transmissão E citar os DOIS times", () => {
    expect(titleIsAboutGame("Sparta Praha x Slavia Praha: onde assistir ao vivo, horário e escalações", FX)).toBe(true);
    expect(titleIsAboutGame("Slavia Praha x Sparta Praha: horário e canal do dérbi de Praga", FX)).toBe(true); // ordem invertida ainda cita os dois
    expect(titleIsAboutGame("Sparta Praha vence e assume a liderança", FX)).toBe(false); // sem transmissão e sem o outro time
    expect(titleIsAboutGame("Sparta Praha x Viktoria Plzen: onde assistir", FX)).toBe(false); // outro adversário
    expect(isBroadcastTitle("Onde assistir ao jogo de hoje")).toBe(true);
    expect(isBroadcastTitle("Técnico fala sobre reforços")).toBe(false);
  });

  it("reconhece o apelido do time (Atlético-GO = Atlético Goianiense)", () => {
    expect(teamInText("Atletico Goianiense", "Atlético-GO x Vila Nova: onde assistir")).toBe(true);
    expect(teamInText("Atletico Goianiense", "Atlético Goianiense x Vila Nova")).toBe(true);
    expect(titleIsAboutGame("Atlético-GO x Vila Nova: onde assistir, horário e prováveis escalações", FX_GO)).toBe(true);
    expect(teamInText("Atletico Goianiense", "Atlético-MG x Vila Nova")).toBe(false);
  });

  it("a reportagem precisa citar o DIA do jogo (22/11)", () => {
    expect(mentionsGameDay("O jogo é neste domingo (22), às 18h30", FX.date)).toBe(true);
    expect(mentionsGameDay("Data: 22/11/2026", FX.date)).toBe(true);
    expect(mentionsGameDay("A partida acontece no dia 22 de novembro", FX.date)).toBe(true);
    expect(mentionsGameDay("no dia 22, às 18h30", FX.date)).toBe(true);
    expect(mentionsGameDay("O jogo foi dia 15/11 e o próximo é 29/11", FX.date)).toBe(false);
    expect(mentionsGameDay("Rodada 122 do campeonato, 2022", FX.date)).toBe(false);
  });

  it("só vale canal ESCRITO no texto da reportagem (a IA não inventa)", () => {
    const text = "Onde assistir: o jogo terá transmissão da ESPN e do Disney+. Também no Canal GOAT.";
    expect(groundChannels(["ESPN", "Disney+", "Canal GOAT"], text)).toEqual(["ESPN", "Disney+", "Canal GOAT"]);
    // Globo e Netflix não estão no texto → caem fora
    expect(groundChannels(["ESPN", "Globo", "Netflix", "SporTV"], text)).toEqual(["ESPN"]);
  });

  it("não aceita link, código nem texto enorme como se fosse canal", () => {
    const text = "transmissão na ESPN https://evil.test e <script>";
    expect(groundChannels(["https://evil.test", "<script>", "x".repeat(80), "ESPN"], text)).toEqual(["ESPN"]);
  });

  it("arruma o nome do canal e não repete", () => {
    expect(groundChannels(["DISNEY+", "disney+", "CAZÉTV"], "no DISNEY+ e na CazéTV")).toEqual(["Disney+", "CazéTV"]);
  });

  it("canal que é parte de outra palavra não conta (ESPN em 'ESPNEWS')", () => {
    expect(groundChannels(["ESPN"], "veja no ESPNEWS")).toEqual([]);
  });

  it("com várias reportagens ficam só os canais que a maioria confirma", () => {
    expect(voteChannels([["ESPN", "Disney+"], ["ESPN"], ["ESPN", "Star+"]])).toEqual(["ESPN"]);
    expect(voteChannels([["ESPN", "Disney+"]])).toEqual(["ESPN", "Disney+"]); // uma só reportagem vale por si
    expect(voteChannels([[], []])).toEqual([]);
    expect(voteChannels([["ESPN"], ["Disney+"]])).toEqual(["ESPN", "Disney+"]); // metade confirma cada um
  });

  it("só aceita a resposta da IA no formato combinado", () => {
    expect(parseAiAnswer('{"mesmo_jogo": true, "canais": ["ESPN", 5, "Disney+"]}')).toEqual({ sameGame: true, channels: ["ESPN", "Disney+"] });
    expect(parseAiAnswer('texto antes {"mesmo_jogo": false, "canais": []} texto depois')).toEqual({ sameGame: false, channels: [] });
    expect(parseAiAnswer('{"canais": ["ESPN"]}')).toBeNull(); // sem dizer se é o mesmo jogo
    expect(parseAiAnswer("não sei")).toBeNull();
    expect(parseAiAnswer("")).toBeNull();
  });

  it("lê só o texto visível e só os trechos que falam de transmissão", () => {
    const html =
      "<html><head><style>.x{}</style><script>var canal='FAKE';</script></head><body><nav>Menu Canais</nav>" +
      "<p>Resumo do clube.</p><p>Onde assistir Sparta x Slavia: o jogo será transmitido pela ESPN e Disney+.</p><footer>Rodapé</footer></body></html>";
    const full = visibleText(html);
    expect(full).not.toContain("FAKE");
    expect(full).not.toContain("Menu");
    const w = transmissionWindows(full);
    expect(w).toContain("ESPN e Disney+");
    expect(transmissionWindows("Texto sem nada sobre isso, só gols e escalações.")).toBe("");
  });

  it("endereço real da reportagem dentro do redirecionamento do Bing", () => {
    expect(realUrl("http://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&tid=1&url=https%3a%2f%2fwww.goal.com%2fbr%2fnoticias%2fx&c=1")).toBe("https://www.goal.com/br/noticias/x");
    expect(realUrl("https://site.com/a")).toBe("https://site.com/a");
  });
});
