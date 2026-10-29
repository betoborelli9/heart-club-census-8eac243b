// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const state = { isAuthReady: true, isLoading: false, isAuthenticated: true, hasVoted: true, simActive: false };
vi.mock("@/contexts/UserContext", () => ({ useUser: () => state }));

import VotedDeviceMarker from "./VotedDeviceMarker";
import { deviceHasVoted } from "@/lib/entry-flow";

describe("VotedDeviceMarker — lembra que este aparelho já teve um voto", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.assign(state, { isAuthReady: true, isLoading: false, isAuthenticated: true, hasVoted: true, simActive: false });
  });

  it("torcedor logado que já votou: marca o aparelho", () => {
    render(<VotedDeviceMarker />);
    expect(deviceHasVoted()).toBe(true);
  });

  it("logado sem voto: não marca", () => {
    state.hasVoted = false;
    render(<VotedDeviceMarker />);
    expect(deviceHasVoted()).toBe(false);
  });

  it("sem login: não marca", () => {
    state.isAuthenticated = false;
    render(<VotedDeviceMarker />);
    expect(deviceHasVoted()).toBe(false);
  });

  it("ainda carregando: não marca", () => {
    state.isLoading = true;
    render(<VotedDeviceMarker />);
    expect(deviceHasVoted()).toBe(false);
  });

  it("teste do Master (simulação): nunca marca", () => {
    state.simActive = true;
    render(<VotedDeviceMarker />);
    expect(deviceHasVoted()).toBe(false);
  });
});
