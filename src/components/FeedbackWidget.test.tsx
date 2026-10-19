// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const state: { inserts: any[]; insertError: any } = { inserts: [], insertError: null };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (row: any) => {
        state.inserts.push(row);
        return Promise.resolve({ error: state.insertError });
      },
    }),
  },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: { id: "u1" }, profile: { clube_coracao: "Vila Nova" } }) }));
vi.mock("@/hooks/useClubTheme", () => ({ useClubTheme: () => ({ primaryHex: "#ff0000" }) }));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k, language: "pt" }) }));
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (a: any) => toast(a) }));

import FeedbackWidget from "./FeedbackWidget";

const type = (txt: string) => fireEvent.change(screen.getByTestId("feedback-text"), { target: { value: txt } });

describe("Fale com o Heart Club → WhatsApp oficial", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    state.inserts = [];
    state.insertError = null;
    toast.mockClear();
    openSpy = vi.spyOn(window, "open").mockImplementation(() => ({}) as Window);
  });

  it("o botão enviar abre o WhatsApp do número oficial (+55 62 9697-0121) com a mensagem pronta", async () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByTestId("feedback-fab"));
    type("Coloquem o placar de todos os jogos no topo");
    fireEvent.click(screen.getByTestId("feedback-send"));
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = String(openSpy.mock.calls[0][0]);
    expect(url.startsWith("https://wa.me/556296970121?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("Sugestão de melhoria");
    expect(text).toContain("Coloquem o placar de todos os jogos no topo");
    expect(text).toContain("Página:");
  });

  it("abre o WhatsApp ANTES de gravar a cópia (o navegador só deixa abrir janela no toque do usuário)", async () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByTestId("feedback-fab"));
    type("Mensagem de teste longa o bastante");
    fireEvent.click(screen.getByTestId("feedback-send"));
    expect(openSpy).toHaveBeenCalled(); // já na mesma hora do toque
    await waitFor(() => expect(state.inserts.length).toBe(1)); // e a cópia é guardada para o painel Admin
    expect(state.inserts[0]).toMatchObject({ type: "sugestao", message: "Mensagem de teste longa o bastante", user_id: "u1" });
  });

  it("tipo 'Reportar erro' vai na mensagem como erro no site", async () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByTestId("feedback-fab"));
    fireEvent.click(screen.getByText("components.feedback_widget.bug_report"));
    type("A tabela do Cruzeiro não abre");
    fireEvent.click(screen.getByTestId("feedback-send"));
    const text = decodeURIComponent(String(openSpy.mock.calls[0][0]).split("?text=")[1]);
    expect(text).toContain("Erro no site");
  });

  it("mensagem muito curta não abre o WhatsApp", () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByTestId("feedback-fab"));
    type("oi");
    fireEvent.click(screen.getByTestId("feedback-send"));
    expect(openSpy).not.toHaveBeenCalled();
    expect(state.inserts.length).toBe(0);
  });

  it("se a cópia no painel falhar, o torcedor não vê erro (o WhatsApp já abriu)", async () => {
    state.insertError = { message: "falhou" };
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByTestId("feedback-fab"));
    type("Mensagem de teste longa o bastante");
    fireEvent.click(screen.getByTestId("feedback-send"));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast.mock.calls[0][0].variant).toBeUndefined(); // sem aviso vermelho de erro
  });

  it("o painel avisa em texto que o WhatsApp oficial vai abrir", () => {
    render(<FeedbackWidget />);
    fireEvent.click(screen.getByTestId("feedback-fab"));
    expect(screen.getByTestId("feedback-whatsapp-note")).toBeTruthy();
    expect(screen.getByTestId("feedback-send").textContent).toContain("components.feedback_widget.send_whatsapp");
  });
});
