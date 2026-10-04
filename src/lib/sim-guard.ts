/**
 * [CAMINHO]: src/lib/sim-guard.ts
 * [MÓDULO]: Trava de gravação do simulador do Master. Enquanto o teste de "torcedor novo" está
 * ligado, TODA gravação no banco (insert/update/upsert/delete e funções que gravam) vira um "fez
 * de conta": responde sucesso sem tocar em nada. Leituras continuam normais.
 * Só é instalada pelo UserContext quando o usuário é o Master E o teste está ligado.
 */
import { supabase } from "@/integrations/supabase/client";
import { mergeSimPatch } from "@/lib/sim-fan";

// Funções (RPC) que só LEEM — passam normalmente. Todas as outras são bloqueadas durante o teste.
const READ_RPC = /^(get_|public_get_|admin_get_|is_|check_|search_|has_|count_)/;

const WRITE_OPS = ["insert", "update", "upsert", "delete"] as const;

/** Resposta "de mentira" que aceita qualquer encadeamento (.select().single() etc.) e resolve sem erro. */
function fakeOk(): any {
  const result = { data: null, error: null, count: null, status: 200, statusText: "OK" };
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "then") return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
      if (prop === "catch") return (rej: any) => Promise.resolve(result).catch(rej);
      if (prop === "finally") return (fn: any) => Promise.resolve(result).finally(fn);
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  };
  const proxy: any = new Proxy(function () {}, handler);
  return proxy;
}

let installed = false;
let saved: { ownFrom: boolean; from: any; ownRpc: boolean; rpc: any } | null = null;

export function installSimGuard() {
  if (installed) return;
  installed = true;
  const client: any = supabase;
  saved = {
    ownFrom: Object.prototype.hasOwnProperty.call(client, "from"),
    from: client.from,
    ownRpc: Object.prototype.hasOwnProperty.call(client, "rpc"),
    rpc: client.rpc,
  };
  const origFrom = client.from.bind(client);
  const origRpc = client.rpc.bind(client);

  client.from = (relation: string) => {
    const qb: any = origFrom(relation);
    for (const op of WRITE_OPS) {
      if (typeof qb[op] !== "function") continue;
      qb[op] = (...args: any[]) => {
        // O que o "torcedor novo" preenche em profiles fica só na memória da aba.
        if (relation === "profiles" && (op === "update" || op === "upsert")) {
          const payload = Array.isArray(args[0]) ? args[0][0] : args[0];
          mergeSimPatch(payload);
        }
        return fakeOk();
      };
    }
    return qb;
  };

  client.rpc = (fn: string, ...rest: any[]) => (READ_RPC.test(fn) ? origRpc(fn, ...rest) : fakeOk());
}

export function removeSimGuard() {
  if (!installed) return;
  installed = false;
  const client: any = supabase;
  // Volta exatamente ao que existia antes da trava.
  if (saved) {
    if (saved.ownFrom) client.from = saved.from;
    else delete client.from;
    if (saved.ownRpc) client.rpc = saved.rpc;
    else delete client.rpc;
    saved = null;
  }
}
