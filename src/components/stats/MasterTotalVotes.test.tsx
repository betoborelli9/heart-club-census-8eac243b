// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach } from "vitest";

const state = { email: "betoborelli9@gmail.com" as string | null };
const rpc = vi.fn((_name: string) => Promise.resolve({ data: 107 as number | null, error: null as any }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (name: string) => rpc(name) } }));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: state.email ? { id: "u1", email: state.email } : null }) }));

import { MasterTotalVotes } from "./MasterTotalVotes";

describe("Total de votos do Heart Club (só o dono vê)", () => {
  beforeEach(() => {
    state.email = "betoborelli9@gmail.com";
    rpc.mockClear();
  });
  afterEach(() => cleanup());

  it("o dono vê a soma de todos os votos", async () => {
    render(<MasterTotalVotes />);
    expect((await screen.findByTestId("master-total-votes")).textContent).toContain("107");
    expect(rpc).toHaveBeenCalledWith("master_total_votos");
  });

  it("e-mail com letras maiúsculas também é o dono", async () => {
    state.email = "BetoBorelli9@gmail.com";
    render(<MasterTotalVotes />);
    expect(await screen.findByTestId("master-total-votes")).toBeTruthy();
  });

  it("outro torcedor não vê nada e o total nem é pedido ao banco", () => {
    state.email = "torcedor@exemplo.com";
    render(<MasterTotalVotes />);
    expect(screen.queryByTestId("master-total-votes")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("visitante sem login não vê nada", () => {
    state.email = null;
    render(<MasterTotalVotes />);
    expect(screen.queryByTestId("master-total-votes")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("se o banco não responder ou recusar, não aparece número inventado", async () => {
    rpc.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));
    render(<MasterTotalVotes />);
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.queryByTestId("master-total-votes")).toBeNull();
  });
});
