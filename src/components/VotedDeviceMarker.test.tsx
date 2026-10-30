// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const state: any = {
  user: { id: "u1", email: "beto.borelli9@gmail.com" },
  isAuthReady: true,
  isLoading: false,
  isAuthenticated: true,
  hasVoted: true,
  simActive: false,
};
const club = { heartClubName: "Vila Nova" as string | null };
vi.mock("@/contexts/UserContext", () => ({ useUser: () => state }));
vi.mock("@/contexts/ViewedClubContext", () => ({ useViewedClub: () => club }));
vi.mock("@/clubes-data", () => ({ CLUBS_DATA: [{ nome: "Vila Nova", logoUrl: "https://x.test/vila.png" }] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ ilike: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [{ escudo_url: "https://x.test/cache.png" }] }) }) }) }),
    }),
  },
}));

import VotedDeviceMarker from "./VotedDeviceMarker";
import { clearVotedDevice, readVotedDevice } from "@/lib/entry-flow";

describe("VotedDeviceMarker — lembra que este aparelho já teve um voto (clube + e-mail mascarado)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearVotedDevice();
    Object.assign(state, {
      user: { id: "u1", email: "beto.borelli9@gmail.com" },
      isAuthReady: true,
      isLoading: false,
      isAuthenticated: true,
      hasVoted: true,
      simActive: false,
    });
    club.heartClubName = "Vila Nova";
  });

  it("torcedor logado que já votou: grava clube, escudo e e-mail mascarado (b***9@gmail.com)", async () => {
    render(<VotedDeviceMarker />);
    await waitFor(() => expect(readVotedDevice()).toEqual({ clubName: "Vila Nova", logo: "https://x.test/vila.png", email: "b***9@gmail.com" }));
    expect(document.cookie).toContain("hc_voted="); // e o cookie de reserva
  });

  it("clube ainda carregando: guarda ao menos que o aparelho já teve voto (e completa quando o clube chega)", async () => {
    club.heartClubName = null;
    const { rerender } = render(<VotedDeviceMarker />);
    await waitFor(() => expect(readVotedDevice()).toEqual({ email: "b***9@gmail.com" }));
    club.heartClubName = "Vila Nova";
    rerender(<VotedDeviceMarker />);
    await waitFor(() => expect(readVotedDevice()?.clubName).toBe("Vila Nova"));
  });

  it("logado sem voto: não marca", () => {
    state.hasVoted = false;
    render(<VotedDeviceMarker />);
    expect(readVotedDevice()).toBeNull();
  });

  it("sem login: não marca", () => {
    state.isAuthenticated = false;
    state.user = null;
    render(<VotedDeviceMarker />);
    expect(readVotedDevice()).toBeNull();
  });

  it("ainda carregando: não marca", () => {
    state.isLoading = true;
    render(<VotedDeviceMarker />);
    expect(readVotedDevice()).toBeNull();
  });

  it("teste do Master (simulação): nunca marca", () => {
    state.simActive = true;
    render(<VotedDeviceMarker />);
    expect(readVotedDevice()).toBeNull();
  });

  it("o próprio Master (conta real) nunca marca o aparelho", () => {
    state.user = { id: "m", email: "betoborelli9@gmail.com" };
    render(<VotedDeviceMarker />);
    expect(readVotedDevice()).toBeNull();
  });
});
