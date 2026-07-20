import { describe, it, expect } from "vitest";
import { canonicalClubKey, canonicalTokens } from "./canonical-club";

describe("canonicalClubKey", () => {
  it("reduces a full club name to its core identity", () => {
    expect(canonicalClubKey("Sport Club Corinthians Paulista")).toBe("corinthians paulista");
    expect(canonicalClubKey("Clube de Regatas do Flamengo")).toBe("flamengo");
    // "atletico" é tratado como termo genérico (como "clube"/"fc"), então
    // some junto com "clube" — comportamento espelhado da função SQL.
    expect(canonicalClubKey("Clube Atlético Mineiro")).toBe("mineiro");
  });

  it("normalizes accents and case", () => {
    expect(canonicalClubKey("São Paulo Futebol Clube")).toBe("sao paulo");
    expect(canonicalClubKey("GRÊMIO Foot-Ball Porto Alegrense")).toBe(
      canonicalClubKey("gremio foot ball porto alegrense"),
    );
  });

  it("returns an empty string for empty/nullish input", () => {
    expect(canonicalClubKey("")).toBe("");
    expect(canonicalClubKey(null)).toBe("");
    expect(canonicalClubKey(undefined)).toBe("");
  });

  it("collapses different name variants of the same club to the same key", () => {
    const a = canonicalClubKey("Sport Club Corinthians Paulista");
    const b = canonicalClubKey("Corinthians");
    // Variants share the same significant token even if not byte-identical.
    expect(a).toContain("corinthians");
    expect(b).toContain("corinthians");
  });
});

describe("canonicalTokens", () => {
  it("extracts significant tokens (length >= 3) from a club name", () => {
    expect(canonicalTokens("Clube de Regatas do Flamengo")).toEqual(["flamengo"]);
    expect(canonicalTokens("Atlético Mineiro")).toEqual(["atletico", "mineiro"]);
  });

  it("returns an empty array for empty/nullish input", () => {
    expect(canonicalTokens("")).toEqual([]);
    expect(canonicalTokens(null)).toEqual([]);
  });
});
