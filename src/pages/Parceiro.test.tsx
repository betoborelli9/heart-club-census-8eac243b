// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state = { partner: true };
const calls: string[] = [];
const navigateMock = vi.fn();

const overview = {
  gerado_em: "2026-10-07T12:00:00Z",
  totais: { torcedores: 63, clubes: 18, paises: 4, cidades: 9, h24: 2, d7: 10, d30: 40 },
  por_dia: [
    { dia: "2026-10-06", n: 1 },
    { dia: "2026-10-07", n: 3 },
  ],
  clubes: [{ nome: "Vila Nova", n: 12 }],
  paises: { top: [{ nome: "BR", n: 50 }], outros: 5 },
  estados: { top: [], outros: 0 },
  cidades: { top: [{ nome: "Goiânia", n: 20 }], outros: 3 },
  genero: { resp: 10, homens: 6, mulheres: 4, outros: 0 },
  idade: { resp: 10, ate20: 1, f21_35: 5, f36_50: 3, f51: 1 },
  profissoes: { resp: 12, top: [] },
  embaixadores: { indicacoes: 7, compartilhamentos: 21 },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string) => {
      calls.push(fn);
      if (fn === "partner_get_overview") return Promise.resolve({ data: overview, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ isAuthenticated: true, isAuthReady: true }),
}));
vi.mock("@/hooks/usePartnerStatus", () => ({
  usePartnerStatus: () => ({ isPartner: state.partner, ready: true }),
}));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string) => k, language: "pt" }),
}));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

import Parceiro from "./Parceiro";

const renderPage = () =>
  render(
    <MemoryRouter>
      <Parceiro />
    </MemoryRouter>,
  );

describe("Painel do parceiro", () => {
  beforeEach(() => {
    calls.length = 0;
    navigateMock.mockClear();
    state.partner = true;
  });

  it("parceiro autorizado: busca os números e mostra os blocos", async () => {
    renderPage();
    await waitFor(() => expect(calls).toContain("partner_get_overview"));
    expect(await screen.findByText("partner.k_fans")).toBeTruthy();
    expect(screen.getByText("partner.top_clubs")).toBeTruthy();
    expect(screen.getByText("Vila Nova")).toBeTruthy();
    expect(screen.getByText("Goiânia")).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("não é parceiro: volta ao dashboard e nem pede os números", async () => {
    state.partner = false;
    renderPage();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true }));
    expect(calls).not.toContain("partner_get_overview");
  });
});
