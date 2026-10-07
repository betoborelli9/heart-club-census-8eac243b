// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state = { auth: true, status: "none" as string, requests: [] as any[] };
const calls: { fn: string; args: any }[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, args?: any) => {
      calls.push({ fn, args });
      if (fn === "get_my_partner_status") return Promise.resolve({ data: state.status, error: null });
      if (fn === "request_partner_access") return Promise.resolve({ data: "pending", error: null });
      if (fn === "admin_list_partner_requests") return Promise.resolve({ data: state.requests, error: null });
      if (fn === "admin_decide_partner") return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ isAuthenticated: state.auth, isAuthReady: true }),
}));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PartnerRequestDialog from "./PartnerRequestDialog";
import PartnerRequests from "@/components/admin/PartnerRequests";

const renderDialog = () =>
  render(
    <MemoryRouter>
      <PartnerRequestDialog open onOpenChange={vi.fn()} />
    </MemoryRouter>,
  );

describe("Sou parceiro (janela do torcedor)", () => {
  beforeEach(() => {
    calls.length = 0;
    state.auth = true;
    state.status = "none";
  });

  it("sem login: orienta a entrar e votar (não mostra formulário)", async () => {
    state.auth = false;
    renderDialog();
    expect(await screen.findByText("partner.login_needed")).toBeTruthy();
    expect(screen.queryByPlaceholderText("partner.company")).toBeNull();
  });

  it("logado e sem pedido: preenche e envia o pedido", async () => {
    renderDialog();
    fireEvent.change(await screen.findByPlaceholderText("partner.company"), { target: { value: "Marca X" } });
    fireEvent.change(screen.getByPlaceholderText("partner.contact"), { target: { value: "marca@x.com" } });
    const send = screen.getByText("partner.send").closest("button") as HTMLButtonElement;
    await waitFor(() => expect(send.disabled).toBe(false));
    fireEvent.click(send);
    await waitFor(() => expect(calls.find((c) => c.fn === "request_partner_access")).toBeTruthy());
    expect(calls.find((c) => c.fn === "request_partner_access")!.args).toMatchObject({ p_company: "Marca X", p_contact: "marca@x.com" });
    expect(await screen.findByText("partner.pending")).toBeTruthy(); // depois de enviar, fica "em análise"
  });

  it("já aprovado ou em análise: só mostra a situação", async () => {
    state.status = "approved";
    renderDialog();
    expect(await screen.findByText("partner.approved")).toBeTruthy();
  });
});

describe("Aba Parceiros do Admin", () => {
  beforeEach(() => {
    calls.length = 0;
    state.requests = [
      { user_id: "u1", nome: "Ana", email: "ana@x.com", company: "Marca X", contact: "ana@x.com", message: null, status: "pending", requested_at: "2026-10-07T10:00:00Z", decided_at: null, clube: "Vila Nova" },
      { user_id: "u2", nome: "Rui", email: "rui@y.com", company: "Marca Y", contact: "rui@y.com", message: null, status: "approved", requested_at: "2026-10-06T10:00:00Z", decided_at: "2026-10-06T11:00:00Z", clube: null },
    ];
  });

  it("lista os pedidos e Autorizar chama o banco", async () => {
    render(<PartnerRequests />);
    expect(await screen.findByText("Marca X")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Autorizar")[0]);
    await waitFor(() => expect(calls.find((c) => c.fn === "admin_decide_partner")).toBeTruthy());
    expect(calls.find((c) => c.fn === "admin_decide_partner")!.args).toEqual({ p_user_id: "u1", p_status: "approved" });
  });

  it("Retirar acesso pede confirmação antes", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<PartnerRequests />);
    fireEvent.click(await screen.findByText("Retirar acesso"));
    expect(confirm).toHaveBeenCalled();
    expect(calls.find((c) => c.fn === "admin_decide_partner")).toBeUndefined(); // cancelou: nada muda
    confirm.mockRestore();
  });
});
