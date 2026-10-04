// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const db: Record<string, { cor_primaria: string; cor_secundaria: string } | null> = {
  "Clube Com Cor": { cor_primaria: "#006437", cor_secundaria: "#FFFFFF" },
  "Clube Sem Cor": null,
};

vi.mock("@/integrations/supabase/client", () => {
  const query = (table: string) => {
    let nome = "";
    const chain: any = {
      select: () => chain,
      eq: (_col: string, v: string) => {
        nome = v;
        return chain;
      },
      maybeSingle: () => Promise.resolve({ data: table === "clubes_cache" ? db[nome] ?? null : null }),
    };
    return chain;
  };
  return {
    supabase: {
      from: (t: string) => query(t),
      functions: { invoke: () => Promise.resolve({ data: null }) },
    },
  };
});

import { useClubTheme } from "./useClubTheme";

describe("useClubTheme", () => {
  it("clube sem cor NÃO herda a cor do clube anterior", async () => {
    const { result, rerender } = renderHook(({ n }) => useClubTheme(n), { initialProps: { n: "Clube Com Cor" } });
    await waitFor(() => expect(result.current.primaryHex.toLowerCase()).toBe("#006437"));
    const verde = result.current.primaryHex;

    rerender({ n: "Clube Sem Cor" });
    await waitFor(() => expect(result.current.primaryHex).not.toBe(verde));
  });

  it("clube com cor no banco usa a cor dele", async () => {
    const { result } = renderHook(() => useClubTheme("Clube Com Cor"));
    await waitFor(() => expect(result.current.primaryHex.toLowerCase()).toBe("#006437"));
  });
});
