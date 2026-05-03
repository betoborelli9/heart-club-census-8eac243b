/**
 * [CAMINHO]: src/components/FeedbackWidget.tsx
 * Widget global de feedback. Aparece em todas as páginas.
 * Salva em public.user_feedback com URL atual + user agent.
 * Borda LED dinâmica com cor do clube do torcedor (fallback laranja #ff6200).
 */

import { useState } from "react";
import { MessageCircle, Lightbulb, Bug, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useClubTheme } from "@/hooks/useClubTheme";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FeedbackType = "sugestao" | "erro";

export default function FeedbackWidget() {
  const { user, profile } = useUser();
  const clubName = (profile as any)?.clube_coracao ?? null;
  const theme = useClubTheme(clubName);
  const glow = theme?.primaryHex || "#ff6200";

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("sugestao");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 5) {
      toast({ title: "Mensagem muito curta", description: "Conte um pouco mais (mín. 5 caracteres).", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("user_feedback" as any).insert({
      user_id: user?.id ?? null,
      type,
      message: message.trim(),
      page_url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setSending(false);
    if (error) {
      toast({ title: "Falha ao enviar", description: "Tente novamente em instantes.", variant: "destructive" });
      return;
    }
    toast({ title: "Recebido! 💬", description: "Obrigado por ajudar a evoluir o Heart Club." });
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-[60] w-12 h-12 rounded-full flex items-center justify-center bg-black"
        style={{
          border: `2px solid ${glow}`,
          boxShadow: `0 0 12px ${glow}cc, 0 0 28px ${glow}66, inset 0 0 6px ${glow}40`,
        }}
        aria-label="Enviar feedback"
      >
        <MessageCircle className="w-5 h-5" style={{ color: glow }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-black p-5"
              style={{
                border: `1.5px solid ${glow}`,
                boxShadow: `0 0 24px ${glow}80, inset 0 0 12px ${glow}30`,
                fontFamily: "Verdana, sans-serif",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="italic font-bold text-white text-lg" style={{ color: glow }}>
                  Fale com o Heart Club
                </h2>
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setType("sugestao")}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs italic font-bold transition"
                  style={{
                    backgroundColor: type === "sugestao" ? "#ff6200" : "transparent",
                    color: type === "sugestao" ? "#000" : "#fff",
                    border: `1px solid ${type === "sugestao" ? "#ff6200" : "#ffffff30"}`,
                  }}
                >
                  <Lightbulb className="w-4 h-4" /> Sugestão de Melhoria
                </button>
                <button
                  onClick={() => setType("erro")}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs italic font-bold transition"
                  style={{
                    backgroundColor: type === "erro" ? "#ff6200" : "transparent",
                    color: type === "erro" ? "#000" : "#fff",
                    border: `1px solid ${type === "erro" ? "#ff6200" : "#ffffff30"}`,
                  }}
                >
                  <Bug className="w-4 h-4" /> Reportar Erro
                </button>
              </div>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === "sugestao" ? "Sua ideia para tornar o Heart Club ainda mais épico..." : "Descreva o erro: o que aconteceu, em qual tela, o que esperava..."}
                rows={5}
                maxLength={1000}
                className="bg-black border-white/20 text-white placeholder:text-white/40 italic"
                style={{ fontFamily: "Verdana, sans-serif" }}
              />
              <p className="text-[10px] text-white/40 mt-1 text-right italic">{message.length}/1000</p>

              <Button
                onClick={handleSubmit}
                disabled={sending}
                className="w-full mt-2 italic font-bold"
                style={{
                  backgroundColor: "#ff6200",
                  color: "#000",
                  boxShadow: `0 0 14px ${glow}80`,
                }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Feedback"}
              </Button>

              <p className="text-[10px] text-white/30 mt-3 italic text-center">
                Sua URL atual será incluída automaticamente para nos ajudar a investigar.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
