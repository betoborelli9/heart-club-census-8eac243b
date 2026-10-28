// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Torcedor que acabou de votar: já estava logado, então o "user" não muda — só o hasVoted passa a valer.
// O Dashboard precisa mostrar o time dele na hora, sem recarregar a página.
const state = { hasVoted: false, voteRow: null as null | { clube_nome: string } };
const user = { id: "u-novo", email: "fan@exemplo.com" };

vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ user, simActive: false, profile: { id: "u-novo" }, hasVoted: state.hasVoted }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q: any = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve({ data: state.voteRow, error: null }) };
      return q;
    },
  },
}));

import { ViewedClubProvider, useViewedClub } from "./ViewedClubContext";

function Probe() {
  const c = useViewedClub();
  return (
    <div>
      <span data-testid="heart">{String(c.heartClubName)}</span>
      <span data-testid="viewed">{String(c.viewedClubName)}</span>
      <span data-testid="ready">{String(c.ready)}</span>
    </div>
  );
}
const tree = () => (
  <ViewedClubProvider>
    <Probe />
  </ViewedClubProvider>
);

describe("ViewedClubContext — time do coração logo depois do voto", () => {
  it("antes do voto não há time; ao votar (hasVoted passa a true) o time aparece sem recarregar a página", async () => {
    state.hasVoted = false;
    state.voteRow = null;
    const { rerender } = render(tree());
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    expect(screen.getByTestId("heart").textContent).toBe("null");

    // o voto é gravado e o app passa a saber que o torcedor votou
    state.voteRow = { clube_nome: "Vila Nova" };
    state.hasVoted = true;
    rerender(tree());
    await waitFor(() => expect(screen.getByTestId("heart").textContent).toBe("Vila Nova"));
    expect(screen.getByTestId("viewed").textContent).toBe("Vila Nova");
  });
});
