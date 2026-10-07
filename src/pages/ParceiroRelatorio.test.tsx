// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state = { partner: true, visitsError: false };
const calls: { fn: string; args: any }[] = [];
const navigateMock = vi.fn();

const overview = {
  gerado_em: "2026-10-07T12:00:00Z",
  totais: { torcedores: 63, clubes: 18, paises: 4, cidades: 9, h24: 2, d7: 10, d30: 40 },
  por_dia: [{ dia: "2026-10-07", n: 3 }],
  clubes: [{ nome: "Vila Nova", n: 12 }],
  paises: { top: [{ nome: "BR", n: 50 }], outros: 5 },
  cidades: { top: [{ nome: "Goiânia", n: 20 }], outros: 3 },
  genero: { resp: 10, homens: 6, mulheres: 4, outros: 0 },
  idade: { resp: 10, ate20: 1, f21_35: 5, f36_50: 3, f51: 1 },
  profissoes: { resp: 12, top: [] },
  embaixadores: { indicacoes: 7, compartilhamentos: 21 },
};
const visits = {
  gerado_em: "2026-10-07T12:00:00Z",
  dias: 30,
  total: 350,
  unicos: 40,
  por_pagina: [{ pagina: "/dashboard", visitas: 200, unicos: 30 }],
  por_dia: [{ dia: "2026-10-07", visitas: 20, unicos: 9 }],
  por_plataforma: [{ platform: "web", visitas: 350 }],
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, args?: any) => {
      calls.push({ fn, args });
      if (fn === "partner_get_overview") return Promise.resolve({ data: overview, error: null });
      if (fn === "admin_get_page_visits")
        return Promise.resolve(state.visitsError ? { data: null, error: { message: "acesso restrito" } } : { data: visits, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ isAuthenticated: true, isAuthReady: true }) }));
vi.mock("@/hooks/usePartnerStatus", () => ({ usePartnerStatus: () => ({ isPartner: state.partner, ready: true }) }));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k, language: "pt" }) }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

import ParceiroRelatorio from "./ParceiroRelatorio";

const renderAt = (qs: string) =>
  render(
    <MemoryRouter initialEntries={[`/parceiro/relatorio${qs}`]}>
      <ParceiroRelatorio />
    </MemoryRouter>,
  );

describe("Relatórios em PDF", () => {
  beforeEach(() => {
    calls.length = 0;
    navigateMock.mockClear();
    state.partner = true;
    state.visitsError = false;
  });

  it("completo: tem capa e todas as seções, sem pedir visitas", async () => {
    renderAt("?s=completo");
    expect(await screen.findByText("report.cover_title")).toBeTruthy();
    expect(screen.getAllByText("partner.top_clubs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("raiox.gender").length).toBeGreaterThan(0);
    expect(calls.map((c) => c.fn)).not.toContain("admin_get_page_visits");
  });

  it("por assunto: só aquele assunto, sem capa", async () => {
    renderAt("?s=idade");
    await waitFor(() => expect(screen.getAllByText("raiox.age").length).toBeGreaterThan(0));
    expect(screen.queryByText("report.cover_title")).toBeNull();
    expect(screen.queryByText("raiox.gender")).toBeNull();
  });

  it("visitas: usa a função de admin e mostra as páginas", async () => {
    renderAt("?s=visitas&d=30");
    expect(await screen.findByText("/dashboard")).toBeTruthy();
    expect(calls.find((c) => c.fn === "admin_get_page_visits")!.args).toEqual({ p_days: 30 });
    expect(calls.map((c) => c.fn)).not.toContain("partner_get_overview");
  });

  it("visitas para quem não é admin: o banco recusa e a página avisa", async () => {
    state.visitsError = true;
    renderAt("?s=visitas");
    expect(await screen.findByText("report.admin_only")).toBeTruthy();
  });

  it("quem não é parceiro volta ao dashboard", async () => {
    state.partner = false;
    renderAt("?s=completo");
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true }));
    expect(calls).toHaveLength(0);
  });
});
