/**
 * [CAMINHO]: src/components/AddressModal.tsx
 * [MÓDULO]: ADDRESS MODAL — captura de CEP pós-voto (Glassmorphism)
 * [STATUS]: PRODUÇÃO v1.0
 *
 * Encapsula a lógica de busca de CEP (ViaCEP) e preenchimento de Bairro.
 * Disparado a partir do Mapa de Calor quando o usuário ainda não informou
 * seu endereço — transforma o endereço em "conquista" para ver o território.
 */

import { useState, useCallback } from "react";
import { Loader2, MapPin, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { lookupCep, formatCep } from "@/lib/address";

/* ═══════════════════════════════════════════════════════════
    PROPS
   ═══════════════════════════════════════════════════════════ */
interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubName?: string | null;
  onSuccess?: () => void;
}

/* ═══════════════════════════════════════════════════════════
    COMPONENTE
   ═══════════════════════════════════════════════════════════ */
const AddressModal = ({ open, onOpenChange, clubName, onSuccess }: AddressModalProps) => {
  const { user, refreshProfile } = useUser();
  const { toast } = useToast();

  const [cep, setCep] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidadeAddr, setCidadeAddr] = useState("");
  const [estadoAddr, setEstadoAddr] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ───── BUSCA AUTOMÁTICA POR CEP ───── */
  const handleCepLookup = useCallback(async (raw: string) => {
    const formatted = formatCep(raw);
    setCep(formatted);
    setCepError(null);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const found = await lookupCep(digits);
      if (!found) {
        setCepError("CEP não encontrado.");
        return;
      }
      setBairro(found.bairro);
      setCidadeAddr(found.cidade);
      setEstadoAddr(found.estado);
    } finally {
      setCepLoading(false);
    }
  }, []);

  /* ───── PERSISTE EM votos + profiles ───── */
  const handleSubmit = async () => {
    if (!user) return;
    if (!bairro.trim()) {
      toast({ variant: "destructive", title: "Informe seu bairro." });
      return;
    }
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      toast({ variant: "destructive", title: "Informe um CEP válido." });
      return;
    }

    setSubmitting(true);
    try {
      // Atualiza o voto original do usuário (preenche endereço)
      const updates: Record<string, any> = {
        bairro: bairro.trim(),
        cep: cepDigits,
      };
      if (cidadeAddr.trim()) updates.cidade = cidadeAddr.trim();
      if (estadoAddr.trim()) updates.estado = estadoAddr.trim();

      const { error: voteErr } = await supabase
        .from("votos")
        .update(updates)
        .eq("user_id", user.id)
        .eq("is_original_vote", true);

      if (voteErr) throw voteErr;

      // Atualiza o profile (anti-redundância)
      const profileUpdate: Record<string, any> = { cep: cepDigits };
      if (cidadeAddr.trim()) profileUpdate.cidade = cidadeAddr.trim();
      if (estadoAddr.trim()) profileUpdate.estado = estadoAddr.trim();

      await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

      toast({ title: "Território liberado! 🔥" });
      refreshProfile().catch(() => {});
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[AddressModal] erro:", err);
      toast({ variant: "destructive", title: "Erro ao salvar endereço." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
      RENDER — Glassmorphism
     ═══════════════════════════════════════════════════════════ */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-white/15 bg-black/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(255,98,0,0.15)] rounded-2xl z-[10000]">
        <div className="space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
              Onde pulsa o seu coração?
            </h2>
            <div className="relative mx-1 rounded-xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.08] via-orange-500/[0.04] to-transparent px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-orange-500/0 via-orange-500/80 to-orange-500/0" />
              <p className="text-[12px] italic leading-relaxed text-orange-50/90">
                Para pintarmos o mapa com as cores do{" "}
                <strong className="text-orange-400 not-italic uppercase tracking-wide">
                  {clubName || "seu clube"}
                </strong>
                , precisamos localizar o seu <span className="text-orange-300/90 font-semibold not-italic">grito de gol</span>. Informe seu CEP e veja a força da sua torcida agora mesmo!
              </p>
            </div>
          </div>

          {/* CEP */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black italic uppercase opacity-60 tracking-wider">
              CEP
            </label>
            <div className="relative">
              <Input
                inputMode="numeric"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => handleCepLookup(e.target.value)}
                className="h-12 font-black italic uppercase bg-white/5 border-white/10 focus-visible:border-orange-500/50"
                maxLength={9}
                autoFocus
              />
              {cepLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-500" />
              )}
            </div>
            {cepError && <p className="text-[10px] text-destructive italic">{cepError}</p>}
          </div>

          {/* Bairro */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black italic uppercase opacity-60 tracking-wider">
              Bairro
            </label>
            <Input
              placeholder="Seu bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="h-12 font-black italic uppercase bg-white/5 border-white/10 focus-visible:border-orange-500/50"
            />
          </div>

          {/* Cidade / UF */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-black italic uppercase opacity-60 tracking-wider">
                Cidade
              </label>
              <Input
                value={cidadeAddr}
                onChange={(e) => setCidadeAddr(e.target.value)}
                className="h-12 font-bold italic uppercase bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black italic uppercase opacity-60 tracking-wider">
                UF
              </label>
              <Input
                value={estadoAddr}
                onChange={(e) => setEstadoAddr(e.target.value.toUpperCase().slice(0, 2))}
                className="h-12 font-black italic uppercase bg-white/5 border-white/10"
                maxLength={2}
              />
            </div>
          </div>

          {/* Privacidade */}
          <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-500" />
            <p className="text-[10px] italic leading-relaxed text-white/60">
              Seu endereço nunca será divulgado. Apenas o bairro alimenta o Mapa de Calor.
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !bairro.trim() || cep.replace(/\D/g, "").length !== 8}
            className="w-full h-13 btn-orange-gradient font-black italic text-base uppercase tracking-tight rounded-xl shadow-lg shadow-orange-500/20"
          >
            {submitting ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              "ME LOCALIZAR NO MAPA"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressModal;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/AddressModal.tsx
 * VERSÃO: 1.0
 * - Glassmorphism (bg-black/60 + backdrop-blur-2xl).
 * - ViaCEP via lib/address.lookupCep.
 * - Persiste em votos (is_original_vote) + profiles.
 */
