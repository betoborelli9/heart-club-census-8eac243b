// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  adoptPendingVoteFromLink,
  decodePendingVoteParam,
  encodePendingVoteParam,
  loadPendingVote,
  savePendingVote,
} from "./entry-flow";

const club: any = {
  id: "api-121",
  name: "Vila Nova",
  shortName: "Vila Nova",
  location: "Goiânia, Brazil",
  logo: "https://media.api-sports.io/football/teams/121.png",
  city: "Goiânia",
  state: "",
  country: "Brazil",
  api_id: 121,
  source: "api",
};
const sym = (n: number): any => ({ ...club, id: `api-${n}`, name: `Time ${n}`, shortName: `Time ${n}`, api_id: n });

describe("escolha do time levada no link", () => {
  beforeEach(() => localStorage.clear());

  it("vai e volta com clube, acentos e simpatias intactos", () => {
    const pv = encodePendingVoteParam(club, [sym(1), sym(2)])!;
    expect(pv).toMatch(/^[A-Za-z0-9_-]+$/); // seguro para colocar na URL
    const back = decodePendingVoteParam(pv)!;
    expect(back.club.name).toBe("Vila Nova");
    expect(back.club.location).toBe("Goiânia, Brazil");
    expect(back.club.api_id).toBe(121);
    expect(back.club.source).toBe("api");
    expect(back.club.logo).toBe(club.logo);
    expect(back.sympathies.map((s) => s.name)).toEqual(["Time 1", "Time 2"]);
  });

  it("limita a 4 simpatias, sem repetir e sem repetir o clube do coração", () => {
    const pv = encodePendingVoteParam(club, [sym(1), sym(1), club, sym(2), sym(3), sym(4), sym(5)])!;
    const back = decodePendingVoteParam(pv)!;
    expect(back.sympathies.length).toBeLessThanOrEqual(4);
    expect(back.sympathies.map((s) => s.name)).not.toContain("Vila Nova");
    expect(new Set(back.sympathies.map((s) => s.name)).size).toBe(back.sympathies.length);
  });

  it("lixo, texto estranho ou link adulterado não quebra: devolve null", () => {
    expect(decodePendingVoteParam(null)).toBeNull();
    expect(decodePendingVoteParam("")).toBeNull();
    expect(decodePendingVoteParam("!!não é base64!!")).toBeNull();
    expect(decodePendingVoteParam("aGVsbG8")).toBeNull(); // "hello", não é JSON
    expect(decodePendingVoteParam("a".repeat(5000))).toBeNull();
    const semNome = btoa(JSON.stringify({ c: { n: "" }, s: [] })).replace(/=+$/, "");
    expect(decodePendingVoteParam(semNome)).toBeNull();
  });

  it("só aceita imagem de escudo em https (nada de javascript:)", () => {
    const evil = btoa(JSON.stringify({ c: { n: "Clube", g: "javascript:alert(1)" }, s: [] })).replace(/=+$/, "");
    expect(decodePendingVoteParam(evil)!.club.logo).toBe("");
  });

  it("adoptPendingVoteFromLink: aparelho vazio refaz o voto pelo link e guarda", () => {
    const pv = encodePendingVoteParam(club, [sym(1)])!;
    expect(loadPendingVote()).toBeNull();
    const got = adoptPendingVoteFromLink(pv);
    expect(got?.club.name).toBe("Vila Nova");
    expect(loadPendingVote()?.club.name).toBe("Vila Nova");
    expect(loadPendingVote()?.sympathies).toHaveLength(1);
  });

  it("adoptPendingVoteFromLink: se o aparelho já tem escolha, ela vale (o link não sobrescreve)", () => {
    savePendingVote({ ...club, name: "Goiás" }, []);
    const got = adoptPendingVoteFromLink(encodePendingVoteParam(club, [])!);
    expect(got?.club.name).toBe("Goiás");
  });

  it("adoptPendingVoteFromLink: sem link e sem escolha guardada → null", () => {
    expect(adoptPendingVoteFromLink(null)).toBeNull();
    expect(adoptPendingVoteFromLink("lixo!")).toBeNull();
  });
});
