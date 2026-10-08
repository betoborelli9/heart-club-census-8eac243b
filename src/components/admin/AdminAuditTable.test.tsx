// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const calls: { fn: string; args: any }[] = [];
const row = (over: any) => ({
  voto_id: "v1", clube_nome: "Vila Nova", user_email: "teste@x.com", user_nome: "BETOTESTEJUNIOR", ip_address: "189.1.1.1",
  cep: null, bairro: null, cidade: "Itaim Bibi", estado: "SP", is_suspicious: true, status_aprovacao: null,
  motivo_suspicao: "MESMO IP DETECTADO (2x)", created_at: "2026-10-08T10:00:00Z",
  sympathy_1: null, sympathy_2: null, sympathy_3: null, sympathy_4: null,
  referral_source: null, referral_ambassador_name: null, referral_code: null, ...over,
});
const rows = [
  row({}),
  row({ voto_id: "v2", user_nome: "Beto Borelli", user_email: "betoborelli9@gmail.com", clube_nome: "Palmeiras", is_suspicious: false }),
  row({ voto_id: "v3", user_nome: "Outro Torcedor", user_email: "outro@x.com", ip_address: "200.2.2.2", is_suspicious: false }),
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, args?: any) => {
      calls.push({ fn, args });
      if (fn === "admin_get_votes_with_tracking") return Promise.resolve({ data: rows, error: null });
      return Promise.resolve({ data: { ok: true }, error: null });
    },
    from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import AdminAuditTable from "./AdminAuditTable";

describe("Auditoria — voto suspeito e apagar torcedor", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("mostra quem mais votou do mesmo IP (nome, e-mail e clube) — e só para quem tem vizinho", async () => {
    render(<AdminAuditTable />);
    await screen.findAllByText("BETOTESTEJUNIOR");
    const boxes = screen.getAllByTestId("same-ip-box");
    expect(boxes.length).toBe(2); // a conta suspeita e a do Beto (as duas dividem o IP); o "Outro Torcedor" não
    expect(boxes[0].textContent).toContain("Beto Borelli");
    expect(boxes[0].textContent).toContain("betoborelli9@gmail.com");
    expect(boxes[0].textContent).toContain("Palmeiras");
    expect(boxes[1].textContent).toContain("BETOTESTEJUNIOR");
  });

  it("apagar torcedor por completo: pede confirmação com nome e e-mail, e só então chama o banco", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<AdminAuditTable />);
    await screen.findAllByText("BETOTESTEJUNIOR");
    const btn = screen.getAllByLabelText("Apagar torcedor por completo")[0];

    fireEvent.click(btn); // cancelou
    expect(confirm.mock.calls[0][0]).toContain("BETOTESTEJUNIOR");
    expect(confirm.mock.calls[0][0]).toContain("teste@x.com");
    expect(calls.find((c) => c.fn === "admin_delete_fan_by_vote")).toBeUndefined();

    fireEvent.click(btn); // confirmou
    await waitFor(() => expect(calls.find((c) => c.fn === "admin_delete_fan_by_vote")).toBeTruthy());
    expect(calls.find((c) => c.fn === "admin_delete_fan_by_vote")!.args).toEqual({ p_voto_id: "v1" });
    await waitFor(() => expect(screen.queryAllByText("BETOTESTEJUNIOR").length).toBe(0)); // some da lista
    confirm.mockRestore();
  });
});
