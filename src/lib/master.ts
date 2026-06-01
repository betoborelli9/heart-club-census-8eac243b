/**
 * [CAMINHO]: src/lib/master.ts
 * [MÓDULO]: Master Admin — utilidades de identificação e modo teste.
 * [REGRA]: betoborelli9@gmail.com navega como torcedor comum. Os fluxos
 *          de "primeira vez" (votação, identidade, endereço do Mapa de Calor,
 *          censo do Embaixador, etc.) só são reapresentados quando ele
 *          ativa explicitamente via querystring `?force_onboarding=1`
 *          ou `?test=1`, a partir do MasterTestPanel.
 *          Nenhuma lógica do torcedor comum é alterada.
 */

export const MASTER_EMAIL = "betoborelli9@gmail.com";

export function isMasterEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === MASTER_EMAIL;
}

/** Lê uma flag de "forçar onboarding" da URL atual. */
export function shouldForceOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  return p.get("force_onboarding") === "1" || p.get("test") === "1";
}
