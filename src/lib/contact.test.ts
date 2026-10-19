import { describe, expect, it } from "vitest";
import { feedbackWhatsAppText, OFFICIAL_WHATSAPP, OFFICIAL_WHATSAPP_DISPLAY, whatsappLink } from "./contact";

describe("contato oficial do Heart Club", () => {
  it("o número oficial é o WhatsApp Business +55 62 9697-0121, no formato do link (só dígitos)", () => {
    expect(OFFICIAL_WHATSAPP).toBe("556296970121");
    expect(OFFICIAL_WHATSAPP_DISPLAY).toBe("+55 62 9697-0121");
    expect(OFFICIAL_WHATSAPP.replace(/\D/g, "")).toBe(OFFICIAL_WHATSAPP_DISPLAY.replace(/\D/g, ""));
  });

  it("o link abre a conversa com o número oficial, com ou sem mensagem", () => {
    expect(whatsappLink()).toBe("https://wa.me/556296970121");
    expect(whatsappLink("  ")).toBe("https://wa.me/556296970121");
    const link = whatsappLink("Olá, tudo bem?\nQuero ajudar");
    expect(link.startsWith("https://wa.me/556296970121?text=")).toBe(true);
    expect(decodeURIComponent(link.split("?text=")[1])).toBe("Olá, tudo bem?\nQuero ajudar");
  });

  it("a mensagem diz se é sugestão ou erro, leva o texto do torcedor e a página (sem dado pessoal)", () => {
    const sug = feedbackWhatsAppText("sugestao", "  Coloquem o placar no topo  ", "https://www.votenoseutime.com.br/jogos");
    expect(sug).toContain("Sugestão de melhoria");
    expect(sug).toContain("Coloquem o placar no topo");
    expect(sug).toContain("Página: https://www.votenoseutime.com.br/jogos");
    const erro = feedbackWhatsAppText("erro", "A tabela não abre", null);
    expect(erro).toContain("Erro no site");
    expect(erro).not.toContain("Página:");
  });
});
