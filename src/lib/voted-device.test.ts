// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearVotedDevice, deviceHasVoted, markDeviceVoted, maskEmail, readVotedDevice } from "./entry-flow";

describe("marca 'este aparelho já votou' (clube + e-mail mascarado, com cookie de reserva)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearVotedDevice();
  });

  it("mascara o e-mail: b***9@gmail.com", () => {
    expect(maskEmail("beto.borelli9@gmail.com")).toBe("b***9@gmail.com");
    expect(maskEmail("ab@x.com")).toBe("a***@x.com");
    expect(maskEmail("a@x.com")).toBe("a***@x.com");
    expect(maskEmail("sem-arroba")).toBeUndefined();
    expect(maskEmail(null)).toBeUndefined();
  });

  it("sem marca nenhuma: o aparelho é novo", () => {
    expect(readVotedDevice()).toBeNull();
    expect(deviceHasVoted()).toBe(false);
  });

  it("grava e lê clube, escudo e e-mail mascarado; informações novas se juntam às antigas", () => {
    markDeviceVoted({ email: "b***9@gmail.com" });
    markDeviceVoted({ clubName: "Vila Nova", logo: "https://media.api-sports.io/football/teams/121.png" });
    expect(readVotedDevice()).toEqual({
      clubName: "Vila Nova",
      logo: "https://media.api-sports.io/football/teams/121.png",
      email: "b***9@gmail.com",
    });
    expect(deviceHasVoted()).toBe(true);
  });

  it("guarda também um cookie de 1 ano e o recupera se o localStorage for apagado", () => {
    markDeviceVoted({ clubName: "Vila Nova", email: "b***9@gmail.com" });
    expect(document.cookie).toContain("hc_voted=");
    localStorage.clear();
    expect(readVotedDevice()).toEqual({ clubName: "Vila Nova", email: "b***9@gmail.com" });
  });

  it("'clearVotedDevice' apaga localStorage e cookie", () => {
    markDeviceVoted({ clubName: "Vila Nova" });
    clearVotedDevice();
    expect(readVotedDevice()).toBeNull();
    expect(document.cookie).not.toContain("hc_voted=");
  });

  it("marca antiga ('1') continua valendo, sem clube", () => {
    localStorage.setItem("hc_device_voted", "1");
    expect(readVotedDevice()).toEqual({});
    expect(deviceHasVoted()).toBe(true);
  });

  it("não confia às cegas no que vem do aparelho: escudo só em endereço seguro, textos curtos, lixo ignorado", () => {
    localStorage.setItem("hc_device_voted", JSON.stringify({ clubName: "X".repeat(300), logo: "javascript:alert(1)", email: "sem-arroba" }));
    const got = readVotedDevice()!;
    expect(got.logo).toBeUndefined();
    expect(got.email).toBeUndefined();
    expect(got.clubName!.length).toBe(100);
    localStorage.setItem("hc_device_voted", "{quebrado");
    expect(readVotedDevice()).toBeNull();
  });
});
