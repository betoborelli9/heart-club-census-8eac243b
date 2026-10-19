/**
 * [CAMINHO]: src/lib/contact.ts
 * [MÓDULO]: Contato OFICIAL do projeto Heart Club. Um lugar só: se o número mudar, muda aqui.
 */

/** WhatsApp oficial do Heart Club (WhatsApp Business): +55 62 9697-0121, no formato do link wa.me (só dígitos, com o 55 do Brasil). */
export const OFFICIAL_WHATSAPP = "556296970121";
export const OFFICIAL_WHATSAPP_DISPLAY = "+55 62 9697-0121";

/** Link que abre a conversa com o WhatsApp oficial já com a mensagem escrita. */
export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${OFFICIAL_WHATSAPP}`;
  return text && text.trim() ? `${base}?text=${encodeURIComponent(text.trim())}` : base;
}

/** Mensagem pronta para o WhatsApp oficial (em português, que é o idioma de quem atende). */
export function feedbackWhatsAppText(kind: "sugestao" | "erro", message: string, pageUrl?: string | null): string {
  const label = kind === "erro" ? "Erro no site" : "Sugestão de melhoria";
  const lines = [`Olá, Heart Club! (${label})`, "", message.trim()];
  if (pageUrl) lines.push("", `Página: ${pageUrl}`);
  return lines.join("\n");
}
