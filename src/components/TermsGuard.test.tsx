// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const ctx: { user: any; profile: any; hasVoted: boolean; simActive: boolean } = {
  user: { id: "f1", email: "fan@exemplo.com" },
  profile: { id: "f1", terms_accepted_at: null },
  hasVoted: true,
  simActive: false,
};

vi.mock("@/lib/entry-flow", async (orig) => ({ ...(await orig<typeof import("@/lib/entry-flow")>()), NEW_ENTRY_FLOW_ENABLED: true }));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ ...ctx, realUser: ctx.user, isAuthReady: true, isLoading: false }),
}));

import TermsGuard from "./TermsGuard";

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TermsGuard />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("TermsGuard (fluxo novo ligado)", () => {
  it("quem votou e não aceitou os Termos é levado ao aceite em qualquer página protegida", async () => {
    at("/dashboard");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/confirmar-voto"));
  });

  it("páginas abertas (Termos, Privacidade, login, entrada) continuam acessíveis", async () => {
    at("/termos");
    expect(screen.getByTestId("where").textContent).toBe("/termos");
  });

  it("quem já aceitou os Termos não é incomodado", async () => {
    ctx.profile = { id: "f1", terms_accepted_at: "2026-10-01T00:00:00Z" };
    at("/dashboard");
    expect(screen.getByTestId("where").textContent).toBe("/dashboard");
    ctx.profile = { id: "f1", terms_accepted_at: null };
  });

  it("o Master nunca é barrado", async () => {
    const old = ctx.user;
    ctx.user = { id: "m", email: "betoborelli9@gmail.com" };
    at("/dashboard");
    expect(screen.getByTestId("where").textContent).toBe("/dashboard");
    ctx.user = old;
  });

  it("durante o teste de torcedor novo do Master não barra", async () => {
    ctx.simActive = true;
    at("/dashboard");
    expect(screen.getByTestId("where").textContent).toBe("/dashboard");
    ctx.simActive = false;
  });
});
