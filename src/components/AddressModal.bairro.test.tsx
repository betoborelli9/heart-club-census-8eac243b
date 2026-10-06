// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const calls: { table: string; op: string; payload: any }[] = [];
const detect = vi.fn(() => Promise.resolve({ cidade: "Outra Cidade" }));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const q: any = {
      update: (payload: any) => {
        calls.push({ table, op: "update", payload });
        return q;
      },
      eq: () => q,
      then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
    };
    return q;
  };
  return {
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "fan-1" } } }) },
      from: (t: string) => chain(t),
    },
  };
});
vi.mock("@/lib/address", () => ({ captureIpAudit: () => detect() }));
vi.mock("@/lib/official-neighborhoods", () => ({
  fetchOfficialGoianiaNeighborhoodGeoJson: () =>
    Promise.resolve({
      features: [
        { properties: { official_name: "Setor Bueno" }, geometry: { type: "Polygon", coordinates: [[[-49.28, -16.7], [-49.27, -16.7], [-49.27, -16.71], [-49.28, -16.71], [-49.28, -16.7]]] } },
        { properties: { official_name: "Setor Marista" }, geometry: { type: "Polygon", coordinates: [[[-49.26, -16.69], [-49.25, -16.69], [-49.25, -16.7], [-49.26, -16.7], [-49.26, -16.69]]] } },
        { properties: { official_name: "(LOTEADO IRREGULAR. VL LEBLONSINHO)" }, geometry: { type: "Polygon", coordinates: [[[-49.2, -16.6], [-49.19, -16.6], [-49.19, -16.61], [-49.2, -16.61], [-49.2, -16.6]]] } },
      ],
    }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.city ? `${k}:${o.city}` : k) }),
}));

import AddressModal from "./AddressModal";

const city = { name: "Goiânia", state: "Goiás", country: "Brasil", center: [-49.25, -16.68] };

describe("AddressModal — modo 'só o bairro' (pedido depois, opcional)", () => {
  beforeEach(() => {
    calls.length = 0;
    detect.mockClear();
  });

  it("abre direto no bairro, não detecta cidade de novo e só mostra bairros depois de digitar", async () => {
    render(<AddressModal open onOpenChange={vi.fn()} clubName="Palmeiras" bairroOnly={city} onSkip={vi.fn()} />);
    expect(screen.getByText("entrar.bairro_title")).toBeTruthy();
    const input = await screen.findByPlaceholderText(/neighborhood_placeholder/);
    expect(detect).not.toHaveBeenCalled();
    // nada de lista antes de digitar
    expect(screen.queryByText("Setor Bueno")).toBeNull();
    fireEvent.change(input, { target: { value: "bue" } });
    expect(await screen.findByText("Setor Bueno")).toBeTruthy();
    expect(screen.queryByText("Setor Marista")).toBeNull();
    // lixo do cadastro oficial nunca aparece
    fireEvent.change(input, { target: { value: "leblon" } });
    await waitFor(() => expect(screen.queryByText(/LOTEADO/)).toBeNull());
  });

  it("escolher o bairro grava SÓ o bairro (cidade/estado/país ficam como estão)", async () => {
    const onSuccess = vi.fn();
    render(<AddressModal open onOpenChange={vi.fn()} clubName="Palmeiras" bairroOnly={city} onSkip={vi.fn()} onSuccess={onSuccess} />);
    const input = await screen.findByPlaceholderText(/neighborhood_placeholder/);
    fireEvent.change(input, { target: { value: "bue" } });
    fireEvent.click(await screen.findByText("Setor Bueno"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("Setor Bueno"));
    const profile = calls.find((c) => c.table === "profiles")!;
    expect(profile.payload.bairro).toBe("Setor Bueno");
    expect(profile.payload).not.toHaveProperty("cidade");
    expect(profile.payload).not.toHaveProperty("estado");
    expect(profile.payload).not.toHaveProperty("pais");
    expect(profile.payload).not.toHaveProperty("address_confirmed");
    const voto = calls.find((c) => c.table === "votos")!;
    expect(voto.payload.bairro).toBe("Setor Bueno");
  });

  it("'Agora não' chama onSkip e não grava nada", async () => {
    const onSkip = vi.fn();
    render(<AddressModal open onOpenChange={vi.fn()} clubName="Palmeiras" bairroOnly={city} onSkip={onSkip} />);
    fireEvent.click(await screen.findByText("entrar.bairro_skip"));
    expect(onSkip).toHaveBeenCalled();
    expect(calls).toEqual([]);
  });
});
