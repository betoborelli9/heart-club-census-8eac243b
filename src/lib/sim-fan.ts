/**
 * [CAMINHO]: src/lib/sim-fan.ts
 * [MÓDULO]: Simulador de "torcedor novo" — exclusivo do Master Admin.
 * Fica ativo só nesta aba (sessionStorage) e é aplicado pelo UserContext, que esconde o perfil
 * real (mostra um perfil de primeira vez) e trava qualquer gravação no banco enquanto estiver ligado.
 * O que o Master "preenche" nos cartões fica só na memória da aba (SIM_PATCH) e some ao sair.
 */
import { clearPendingVote } from "@/lib/entry-flow";

const ACTIVE_KEY = "hc_sim_active";
const CLUB_KEY = "hc_sim_club";
const PATCH_KEY = "hc_sim_profile";
const EVENT = "hc-sim-change";

const notify = () => window.dispatchEvent(new Event(EVENT));

export const SIM_EVENT = EVENT;

export const isSimActive = (): boolean => {
  try {
    return sessionStorage.getItem(ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
};

export const getSimClub = (): string | null => {
  try {
    return JSON.parse(sessionStorage.getItem(CLUB_KEY) || "null")?.name ?? null;
  } catch {
    return null;
  }
};

/** O que o "torcedor novo" já preencheu durante o teste (só na memória da aba). */
export const getSimPatch = (): Record<string, any> => {
  try {
    return JSON.parse(sessionStorage.getItem(PATCH_KEY) || "{}") || {};
  } catch {
    return {};
  }
};

export const mergeSimPatch = (patch: Record<string, any> | null | undefined) => {
  if (!patch || typeof patch !== "object") return;
  try {
    // Só campos simples de perfil; nunca papéis/identidade.
    const { id: _id, role: _role, ...safe } = patch as Record<string, any>;
    sessionStorage.setItem(PATCH_KEY, JSON.stringify({ ...getSimPatch(), ...safe }));
  } catch {
    /* ignora */
  }
  notify();
};

export const startSim = () => {
  try {
    sessionStorage.setItem(ACTIVE_KEY, "1");
    sessionStorage.removeItem("hc_sim_sympathies");
    sessionStorage.removeItem(CLUB_KEY);
    sessionStorage.removeItem(PATCH_KEY);
  } catch {
    /* ignora */
  }
  clearPendingVote();
  notify();
};

export const setSimClub = (name: string) => {
  try {
    sessionStorage.setItem(CLUB_KEY, JSON.stringify({ name }));
  } catch {
    /* ignora */
  }
  notify();
};

export const stopSim = () => {
  try {
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem("hc_sim_sympathies");
    sessionStorage.removeItem(CLUB_KEY);
    sessionStorage.removeItem(PATCH_KEY);
  } catch {
    /* ignora */
  }
  clearPendingVote();
  notify();
};

const SYMP_KEY = "hc_sim_sympathies";

/** Simpatias escolhidas pelo "torcedor novo" durante o teste (só na aba). */
export const getSimSympathies = (): string[] => {
  try {
    const v = JSON.parse(sessionStorage.getItem(SYMP_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const setSimSympathies = (names: string[]) => {
  try {
    sessionStorage.setItem(SYMP_KEY, JSON.stringify(names));
  } catch {
    /* ignora */
  }
  window.dispatchEvent(new Event(EVENT));
};
