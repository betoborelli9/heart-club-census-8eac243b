// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const writes: string[] = [];
const masterUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "betoborelli9@gmail.com",
  user_metadata: { full_name: "Beto Borelli" },
};

vi.mock("@/integrations/supabase/client", () => {
  const chain = (rel: string): any => {
    const q: any = {
      select: () => q,
      eq: () => q,
      maybeSingle: () => Promise.resolve({ data: rel === "profiles" ? { id: masterUser.id, nome_exibicao: "Beto Borelli", data_nascimento: "1966-01-01", genero: "masculino" } : null }),
      insert: () => { writes.push(`insert:${rel}`); return Promise.resolve({ data: { real: true }, error: null }); },
      update: () => { writes.push(`update:${rel}`); return Promise.resolve({ data: { real: true }, error: null }); },
      upsert: () => { writes.push(`upsert:${rel}`); return Promise.resolve({ data: { real: true }, error: null }); },
      delete: () => { writes.push(`delete:${rel}`); return Promise.resolve({ data: { real: true }, error: null }); },
      then: (res: any) => Promise.resolve({ data: null, count: 1, error: null }).then(res),
    };
    return q;
  };
  const client: any = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: { user: masterUser } } }),
      signOut: () => Promise.resolve(),
    },
    from: (rel: string) => chain(rel),
    rpc: (fn: string) => { writes.push(`rpc:${fn}`); return Promise.resolve({ data: "real", error: null }); },
  };
  return { supabase: client };
});

import { UserProvider, useUser } from "./UserContext";
import { supabase } from "@/integrations/supabase/client";
import { mergeSimPatch, startSim, stopSim } from "@/lib/sim-fan";

function Probe() {
  const u = useUser();
  return (
    <div>
      <span data-testid="email">{u.user?.email}</span>
      <span data-testid="real">{u.realUser?.email}</span>
      <span data-testid="nome">{String(u.profile?.nome_exibicao)}</span>
      <span data-testid="nasc">{String(u.profile?.data_nascimento)}</span>
      <span data-testid="sim">{String(u.simActive)}</span>
    </div>
  );
}

describe("teste de torcedor novo do Master", () => {
  beforeEach(() => {
    sessionStorage.clear();
    writes.length = 0;
  });

  it("sem teste ligado: Master é o Master, com os dados reais", async () => {
    render(<UserProvider><Probe /></UserProvider>);
    await waitFor(() => expect(screen.getByTestId("nome").textContent).toBe("Beto Borelli"));
    expect(screen.getByTestId("email").textContent).toBe("betoborelli9@gmail.com");
    expect(screen.getByTestId("sim").textContent).toBe("false");
  });

  it("com o teste ligado: vira torcedor novo, sem dados do Master, e NADA é gravado", async () => {
    startSim();
    render(<UserProvider><Probe /></UserProvider>);
    await waitFor(() => expect(screen.getByTestId("sim").textContent).toBe("true"));
    expect(screen.getByTestId("email").textContent).toBe("torcedor.novo@exemplo.com");
    expect(screen.getByTestId("real").textContent).toBe("betoborelli9@gmail.com");
    expect(screen.getByTestId("nome").textContent).toBe("Torcedor");
    expect(screen.getByTestId("nasc").textContent).toBe("null");

    // qualquer tentativa de gravar vira "de mentira": responde sem erro e não toca no banco
    writes.length = 0;
    const r1: any = await (supabase as any).from("votos").insert([{ a: 1 }]).select("id").single();
    const r2: any = await (supabase as any).from("profiles").delete().eq("id", "x");
    const r3: any = await (supabase as any).rpc("accept_terms", { p_version: "1.0" });
    const r4: any = await (supabase as any).rpc("get_feature_flags");
    expect([r1.error, r2.error, r3.error]).toEqual([null, null, null]);
    expect(r1.data).toBeNull();
    expect(r4.data).toBe("real"); // leitura passa normalmente
    expect(writes).toEqual(["rpc:get_feature_flags"]);

    // o que o torcedor novo "preenche" aparece só na tela
    await act(async () => {
      await (supabase as any).from("profiles").update({ data_nascimento: "1990-01-01" }).eq("id", "x");
    });
    await waitFor(() => expect(screen.getByTestId("nasc").textContent).toBe("1990-01-01"));
    expect(writes).toEqual(["rpc:get_feature_flags"]);
  });

  it("ao sair do teste, as gravações voltam ao normal e o Master volta ao perfil real", async () => {
    startSim();
    render(<UserProvider><Probe /></UserProvider>);
    await waitFor(() => expect(screen.getByTestId("sim").textContent).toBe("true"));
    act(() => stopSim());
    await waitFor(() => expect(screen.getByTestId("sim").textContent).toBe("false"));
    await waitFor(() => expect(screen.getByTestId("nome").textContent).toBe("Beto Borelli"));
    writes.length = 0;
    await (supabase as any).from("votos").insert([{ a: 1 }]);
    expect(writes).toEqual(["insert:votos"]); // gravação real de novo
  });

  it("o teste só liga para o Master (outro usuário com a marca no navegador continua normal)", async () => {
    mergeSimPatch({});
    startSim();
    masterUser.email = "torcedor@exemplo.com";
    try {
      render(<UserProvider><Probe /></UserProvider>);
      await waitFor(() => expect(screen.getByTestId("email").textContent).toBe("torcedor@exemplo.com"));
      expect(screen.getByTestId("sim").textContent).toBe("false");
    } finally {
      masterUser.email = "betoborelli9@gmail.com";
    }
  });
});
