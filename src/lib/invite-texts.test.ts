// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import i18next from "i18next";
import pt from "../locales/pt.json";
import en from "../locales/en.json";
import es from "../locales/es.json";

const LOCALES: Record<string, any> = { pt, en, es };
const LINK = "https://votenoseutime.com.br/convite?ref=ABC123";

const t = async (lng: string, key: string, opts: Record<string, string>) => {
  const i = i18next.createInstance();
  await i.init({ lng, resources: { [lng]: { translation: LOCALES[lng] } }, interpolation: { escapeValue: false } });
  return i.t(key, opts) as string;
};

describe("mensagem de convite do Embaixador", () => {
  it("pt: 'NOME te convidou…' sem parênteses e com o link no final", async () => {
    const msg = await t("pt", "ambassadors.referral_msg", { name: "Beto Borelli", link: LINK });
    expect(msg).toBe(
      `🧡 Beto Borelli te convidou para o Heart Club, o maior censo de torcidas do mundo!\n\nVote no seu time e mostre a força da sua torcida. É grátis e leva menos de 1 minuto 👉 ${LINK}`,
    );
    expect(msg).not.toContain("(");
  });

  it("sem nome no perfil: versão sem nome, nunca 'undefined' nem espaço sobrando", async () => {
    for (const lng of ["pt", "en", "es"]) {
      const msg = await t(lng, "ambassadors.referral_msg_anon", { link: LINK });
      expect(msg).toContain(LINK);
      expect(msg).not.toMatch(/undefined|\{\{/);
      expect(msg.startsWith("🧡 ")).toBe(true);
    }
  });

  it("en e es: mesmo sentido, com nome e link", async () => {
    const en1 = await t("en", "ambassadors.referral_msg", { name: "Ana", link: LINK });
    expect(en1).toContain("Ana invited you to Heart Club");
    expect(en1).toContain(`👉 ${LINK}`);
    const es1 = await t("es", "ambassadors.referral_msg", { name: "Ana", link: LINK });
    expect(es1).toContain("Ana te invitó a Heart Club");
    expect(es1).toContain(`👉 ${LINK}`);
  });

  it("a frase antiga ('vamos dominar o mapa' / '(convite de …)') saiu da mensagem do Embaixador", () => {
    for (const l of Object.values(LOCALES)) {
      expect(JSON.stringify(l.ambassadors)).not.toMatch(/dominar o mapa|dominemos el mapa|dominate the map|from_who/);
    }
  });
});

describe("sem promessa de prêmio e 'código' (não 'senha') de convite", () => {
  const all = Object.entries(LOCALES).map(([k, v]) => [k, JSON.stringify(v)] as const);
  const html = readFileSync("index.html", "utf8");

  it("nenhum texto promete prêmio como certo", () => {
    for (const [, text] of all) {
      expect(text).not.toMatch(/ganhar prêmios|terão prêmios|tendrán premios|will get exclusive|ganhar premios/i);
    }
    expect(html).not.toMatch(/ganhar prêmios|terão prêmios/i);
    expect(html).toContain("poderão ter prêmios");
  });

  it("o convite diz 'poderão/podrán/may' no lugar da promessa", () => {
    expect(pt.components.share_tropa.invite_text).toContain("poderão ter prêmios exclusivos");
    expect(es.components.share_tropa.invite_text).toContain("podrán tener premios exclusivos");
    expect(en.components.share_tropa.invite_text).toContain("may get exclusive rewards");
  });

  it("'senha de convite' virou 'código de convite'", () => {
    for (const [, text] of all) {
      expect(text).not.toMatch(/senha de convite|clave de invitaci/i);
    }
    expect(html).not.toMatch(/senha de convite/i);
    expect(html).toContain("código de convite");
    expect(pt.components.share_tropa.invite_text).toContain("Código de Convite");
    expect(es.components.share_tropa.invite_text).toContain("Código de Invitación");
  });
});
