/**
 * [CAMINHO]: src/lib/entry-funnel.ts
 * [MÓDULO]: Contador de passos da porta de entrada (/entrar): em que passo cada visitante do anúncio/story desiste.
 * Grava só o PASSO (sem nome, e-mail nem clube), no máximo 1 vez por passo, por visitante, por dia.
 * Nunca atrapalha a tela: qualquer erro é engolido.
 */
import { supabase } from "@/integrations/supabase/client";
import { detectInAppBrowser } from "@/lib/in-app-browser";

export type EntryStep =
  | "abriu"
  | "toque_time"
  | "toque_google"
  | "abrir_chrome"
  | "aviso_ios"
  | "chrome_chegou"
  | "google_iniciado"
  | "envio_link_email"
  | "voto_gravado";

const VISITOR_ID_KEY = "hc_visitor_id"; // o mesmo do AccessTracker

/** Id anônimo deste aparelho/navegador (cria se não existir). */
export function entryVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Grava o passo. `origemId` liga o Chrome ao Instagram (vem no link que abre o Chrome). */
export function trackEntry(step: EntryStep, origemId?: string | null): void {
  try {
    const vid = entryVisitorId();
    if (vid.length < 8) return;
    const today = new Date().toISOString().slice(0, 10);
    const guardKey = `hc_funil_${today}_${step}`;
    try {
      if (localStorage.getItem(guardKey)) return;
      localStorage.setItem(guardKey, "1");
    } catch {
      /* sem armazenamento: grava mesmo assim */
    }
    const info = detectInAppBrowser();
    const origem = origemId && origemId.length >= 8 && origemId.length <= 64 && origemId !== vid ? origemId : null;
    // a gravação passa por uma função do banco que só aceita passos válidos (ninguém insere direto na tabela)
    void Promise.resolve(
      (supabase as any).rpc("registrar_passo_entrada", { p_visitor_id: vid, p_origem_id: origem, p_etapa: step, p_plataforma: info.platform, p_in_app: info.inApp }),
    )
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    /* nunca atrapalha a tela */
  }
}
