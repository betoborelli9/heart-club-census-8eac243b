// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const row = (n: number, over: Record<string, unknown> = {}) => ({
  user_id: `u${n}`,
  nome: `Torcedor ${n}`,
  email: `t${n}@exemplo.com`,
  clube_nome: "Vila Nova",
  votou_em: "2026-09-22T12:00:00Z",
  falta_basico: false,
  falta_termos: true,
  falta_territorio: false,
  falta_renda: false,
  falta_profissao: false,
  falta_embaixador: false,
  ...over,
});

const state: { completion: unknown; error: { message: string } | null } = {
  completion: [row(1), row(2, { falta_termos: false, falta_basico: true })],
  error: null,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string) => {
      if (fn === "admin_get_profile_completion") return Promise.resolve({ data: state.completion, error: state.error });
      if (fn === "get_feature_flags")
        return Promise.resolve({ data: [{ key: "form_termos", enabled: false, label: "Termos", description: "d" }], error: null });
      return Promise.resolve({ data: [], error: null });
    },
  },
}));

import IncompleteProfiles from "./IncompleteProfiles";

describe("IncompleteProfiles", () => {
  it("lista quem falta preencher", async () => {
    render(<IncompleteProfiles />);
    await waitFor(() => expect(screen.getAllByText(/Torcedor 1/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Torcedor 2/).length).toBeGreaterThan(0);
  });

  it("NÃO diz que todo mundo completou quando a leitura dá erro", async () => {
    state.completion = null;
    state.error = { message: "boom" };
    render(<IncompleteProfiles />);
    await waitFor(() => expect(screen.queryByText(/Carregando|animate-spin/)).toBeNull());
    expect(screen.queryByText(/Todo mundo/i)).toBeNull();
  });
});
