// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";

vi.mock("@/lib/push", () => ({ ensurePushSubscription: vi.fn() }));

import InstallAppButton from "./InstallAppButton";

let go: (to: string) => void = () => {};
function Nav() {
  const navigate = useNavigate();
  go = (to) => navigate(to);
  return null;
}

const fireInstallEvent = () => {
  const e: any = new Event("beforeinstallprompt");
  e.prompt = vi.fn();
  e.userChoice = Promise.resolve({ outcome: "dismissed" });
  act(() => {
    window.dispatchEvent(e);
  });
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
      <InstallAppButton />
    </MemoryRouter>,
  );

describe("Aviso 'Instalar App'", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("hc_visited_before", "1"); // já não é a 1ª visita
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  });

  it.each(["/entrar", "/confirmar-voto", "/login", "/voting", "/termos", "/privacidade"])(
    "não aparece em %s (não pode cobrir o aceite dos termos)",
    (path) => {
      renderAt(path);
      fireInstallEvent();
      expect(screen.queryByText("Instalar App do Heart Club")).toBeNull();
    },
  );

  it("aparece nas demais telas e continua guardado se o torcedor sair da entrada para o site", () => {
    renderAt("/entrar");
    fireInstallEvent();
    expect(screen.queryByText("Instalar App do Heart Club")).toBeNull();
    act(() => go("/dashboard"));
    expect(screen.getByText("Instalar App do Heart Club")).toBeTruthy();
  });
});
