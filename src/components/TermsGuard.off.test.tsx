// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Fluxo novo DESLIGADO (como está no ar hoje para o público): o porteiro dos Termos não pode fazer nada.
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: { id: "f1", email: "fan@exemplo.com" },
    realUser: { id: "f1", email: "fan@exemplo.com" },
    profile: { id: "f1", terms_accepted_at: null },
    hasVoted: true,
    simActive: false,
    isAuthReady: true,
    isLoading: false,
  }),
}));

import TermsGuard from "./TermsGuard";

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

describe("TermsGuard (fluxo novo desligado)", () => {
  it("não redireciona ninguém", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <TermsGuard />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("where").textContent).toBe("/dashboard");
  });
});
