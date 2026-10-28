// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// "SELECIONE SEU CLUBE" é só um aviso na tela: nunca vira nome de clube na mensagem "O manto está chegando!".
const invoke = vi.fn(() => Promise.resolve({ data: null, error: null }));
const from = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: any[]) => (invoke as any)(...a) },
    from: (...a: any[]) => {
      from(...a);
      const q: any = { select: () => q, ilike: () => q, order: () => q, limit: () => Promise.resolve({ data: [], error: null }) };
      return q;
    },
    rpc: () => Promise.resolve({ data: 0, error: null }),
  },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: { id: "u1", email: "fan@exemplo.com" } }) }));
vi.mock("@/hooks/usePartnerStatus", () => ({ usePartnerStatus: () => ({ isPartner: false }) }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.club ? `${k}:${o.club}` : k) }),
}));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));

import ClubBanner from "./ClubBanner";

const renderBanner = (clubName: string) =>
  render(
    <MemoryRouter>
      <ClubBanner clubName={clubName} showProfileInfo profileName="Torcedor" />
    </MemoryRouter>,
  );

describe("ClubBanner — aviso 'Selecione seu clube'", () => {
  beforeEach(() => {
    invoke.mockClear();
    from.mockClear();
  });

  it("sem time (aviso 'SELECIONE SEU CLUBE'): não mostra 'O manto está chegando' e não busca escudo/cores", async () => {
    renderBanner("SELECIONE SEU CLUBE");
    expect(screen.getByText("SELECIONE SEU CLUBE")).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/club_banner\.enriching/)).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("enquanto o time ainda carrega (nome vazio): também sem mensagem do manto", async () => {
    renderBanner("");
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/club_banner\.enriching/)).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("clube de verdade ainda sem escudo/cores: continua mostrando 'O manto está chegando' com o nome certo", async () => {
    renderBanner("Vila Nova");
    expect(await screen.findByText("club_banner.enriching:Vila Nova")).toBeTruthy();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("enrich-club-colors", { body: { club_name: "Vila Nova" } }));
  });
});
