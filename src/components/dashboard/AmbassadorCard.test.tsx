// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import pt from "@/locales/pt.json";

// Cartão do Embaixador no painel: a mensagem compartilhada é a MESMA da página dos Embaixadores.
const state: { profile: any } = { profile: { nome_exibicao: "Beto Borelli", codigo_indicacao: "ABC123", clube_coracao: "Vila Nova" } };

vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ profile: state.profile }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useClubTheme", () => ({ useClubTheme: () => null }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => i18next.t(k, o) as string }),
}));

import AmbassadorSection from "./AmbassadorCard";

const sharedText = () => {
  const open = (window.open as any).mock.calls[0][0] as string;
  return decodeURIComponent(open.split("text=")[1]);
};

describe("AmbassadorCard — mensagem compartilhada", () => {
  afterEach(() => vi.restoreAllMocks());

  const setup = async () => {
    await i18next.init({ lng: "pt", resources: { pt: { translation: pt } }, interpolation: { escapeValue: false } });
    vi.spyOn(window, "open").mockImplementation(() => null);
  };

  it("com nome no perfil: 'NOME te convidou para o Heart Club…' e o link do torcedor", async () => {
    await setup();
    render(<AmbassadorSection />);
    fireEvent.click(screen.getByText("WhatsApp"));
    expect(sharedText()).toBe(
      "🧡 Beto Borelli te convidou para o Heart Club, o maior censo de torcidas do mundo!\n\nVote no seu time e mostre a força da sua torcida. É grátis e leva menos de 1 minuto 👉 https://heartclubapp.com/convite?ref=ABC123",
    );
  });

  it("sem nome no perfil: versão sem nome, sem 'undefined'", async () => {
    await setup();
    state.profile = { nome_exibicao: "", codigo_indicacao: "ABC123" };
    render(<AmbassadorSection />);
    fireEvent.click(screen.getByText("WhatsApp"));
    const msg = sharedText();
    expect(msg.startsWith("🧡 Você foi convidado para o Heart Club")).toBe(true);
    expect(msg).not.toMatch(/undefined|dominar o mapa/);
    state.profile = { nome_exibicao: "Beto Borelli", codigo_indicacao: "ABC123", clube_coracao: "Vila Nova" };
  });
});
