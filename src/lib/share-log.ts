/**
 * Registra (sem travar nada) que o torcedor apertou um botão de compartilhar o
 * link de embaixador: quem, quando e por qual canal. NÃO guarda pra quem foi
 * enviado. Qualquer falha é ignorada — compartilhar nunca pode quebrar por isso.
 */
import { supabase } from "@/integrations/supabase/client";

export type ShareChannel = "whatsapp" | "telegram" | "native" | "copy" | "instagram";

export function logShare(channel: ShareChannel, source: string) {
  try {
    void supabase
      .rpc("log_share_event" as any, { p_channel: channel, p_source: source })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* ignora */
  }
}
