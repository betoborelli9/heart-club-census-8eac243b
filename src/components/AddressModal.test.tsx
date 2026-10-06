// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const calls: { table: string; op: string; payload: any }[] = [];

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
vi.mock("@/lib/address", () => ({
  captureIpAudit: () =>
    Promise.resolve({ cidade: "Goiânia", estado: "Goiás", pais: "Brasil", lat: -16.68, lng: -49.25 }),
}));
vi.mock("@/lib/official-neighborhoods", () => ({ fetchOfficialGoianiaNeighborhoodGeoJson: () => Promise.resolve({ features: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.city ? `${k}:${o.city}` : k) }),
}));

import AddressModal from "./AddressModal";

describe("AddressModal — cartão único de localização", () => {
  beforeEach(() => {
    calls.length = 0;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
  });

  it("mostra a cidade detectada e 'SIM, MORO AQUI!' confirma a cidade na hora (1 clique, sem pedir bairro)", async () => {
    const onOpenChange = vi.fn();
    render(<AddressModal open onOpenChange={onOpenChange} clubName="Palmeiras" allowSkipBairro />);

    expect(await screen.findByText("Goiânia")).toBeTruthy();
    expect(screen.getByText("components.address_modal.live_here")).toBeTruthy();
    expect(screen.getByText("components.address_modal.no_other_city")).toBeTruthy();
    expect(screen.getByText("components.address_modal.detect_again")).toBeTruthy();
    // linha simples de privacidade (sem a caixa escura antiga)
    expect(screen.getByText(/entrar\.map_privacy/)).toBeTruthy();
    expect(screen.queryByText("components.address_modal.privacy")).toBeNull();

    fireEvent.click(screen.getByText("components.address_modal.yes_live"));

    await waitFor(() => expect(window.location.reload).toHaveBeenCalled()); // recarrega e o mapa abre
    const profileUpdate = calls.find((c) => c.table === "profiles");
    expect(profileUpdate?.payload).toMatchObject({
      cidade: "Goiânia",
      estado: "Goiás",
      address_confirmed: true,
      bairro: null,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
