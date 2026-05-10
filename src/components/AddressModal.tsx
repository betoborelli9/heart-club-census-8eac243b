/**
 * [CAMINHO]: src/components/AddressModal.tsx
 * [MÓDULO]: ADDRESS MODAL — Único Coletor de CEP do Sistema
 * [STATUS]: PRODUÇÃO v2.0 (Integrado ao vote-auditor)
 * * Centraliza a captura de endereço. Disparado exclusivamente ao acessar 
 * o Mapa de Calor sem CEP no perfil. Alimenta o Censo de Bairros.
 */

import { useState, useCallback } from "react";
import { Loader2, MapPin, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// MÓDULO DE IMPORTAÇÃO: Conecta com a inteligência centralizada
import { getFullAddress } from "@/lib/vote-auditor";

/* ═══════════════════════════════════════════════════════════
    MÓDULO DE DEFINIÇÕES (PROPS)
   ═══════════════════════════════════════════════════════════ */
interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubName?: string | null;
  onSuccess?: () => void;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO COMPONENTE PRINCIPAL
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

  /* ───── MÓDULO: BUSCA AUTÔNOMA POR CEP (Via Auditor) ───── */
  const handleCepLookup = useCallback(async (raw: string) => {
    // Mantém a formatação visual (00000-000)
    const val = raw.replace(/\D/g, "");
    const formatted = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5, 8)}` : val;
    setCep(formatted);
    setCepError(null);

    // Só dispara a busca quando o CEP está completo (8 dígitos)
    if (val.length !== 8) return;

    setCepLoading(true);
    try {
      const found = await getFullAddress(val);
      if (!found) {
        setCepError("CEP não encontrado.");
        return;
      }
      // Preenchimento autônomo para garantir precisão no mapa
      setBairro(found.bairro);
      setCidadeAddr(found.cidade);
      setEstadoAddr(found.estado);
    } finally {
      setCepLoading(false);
    }
  }, []);

  /* ───── MÓDULO: PERSISTÊNCIA (Profiles + Votos Reais) ───── */
  const handleSubmit = async () => {
    if (!user) return;
    const cepDigits = cep.replace(/\D/g, "");
    
    if (!bairro.trim() || cepDigits.length !== 8) {
      toast({ variant: "destructive", title: "Informe os dados corretamente." });
      return;
    }

    setSubmitting(true);
    try {
      // 0. Persistência local imediata (cache do Porteiro)
      try {
        localStorage.setItem(
          "mapacalor_address",
          JSON.stringify({
            cep: cepDigits,
            bairro: bairro.trim(),
            cidade: cidadeAddr.trim(),
            estado: estadoAddr.trim(),
            savedAt: Date.now(),
          }),
        );
      } catch {}

      // 1. Atualiza o Perfil do Torcedor (Âncora permanente)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ 
          cep: cepDigits,
          cidade: cidadeAddr.trim(),
          estado: estadoAddr.trim(),
          bairro: bairro.trim() 
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      // 2. Atualiza o Voto Real / Auditoria (Para rastreabilidade do Moderador)
      const { error: voteErr } = await supabase
        .from("votos")
        .update({ 
          cep: cepDigits,
          bairro: bairro.trim(),
          cidade: cidadeAddr.trim(),
          estado: estadoAddr.trim(),
        })
        .eq("user_id", user.id)
        .eq("is_original_vote", true);

      if (voteErr) throw voteErr;

      toast({ title: "Território liberado! 🔥" });
      
      // Sincroniza o estado global
      await refreshProfile();
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[AddressModal] erro:", err);
      toast({ variant: "destructive", title: "Erro ao salvar localização." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ───── MÓDULO: RENDERIZAÇÃO (Interface Glassmorphism) ───── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-white/15 bg-black/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(255,98,0,0.15)] rounded-2xl z-[10000]">
        <div className="space-y-5">
          {/* Cabeçalho */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
              Onde pulsa o seu coração?
            </h2>
            <div className="relative mx-1 rounded-xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.08] via-orange-500/[0.04] to-transparent px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-orange-500/80" />
              <p className="text-[12px] italic leading-relaxed text-orange-50/90">
                Para pintarmos o mapa com as cores do <strong className="text-orange-400 uppercase">{clubName || "seu clube"}</strong>, informe seu CEP de residência. 
              </p>
            </div>
          </div>

          {/* Formário de Endereço */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black italic uppercase opacity-60">CEP</label>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => handleCepLookup(e.target.value)}
                  className="h-12 font-black italic bg-white/5 border-white/10"
                  maxLength={9}
                  autoFocus
                />
                {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-500" />}
              </div>
              {cepError && <p className="text-[10px] text-destructive italic">{cepError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black italic uppercase opacity-60">Bairro</label>
              <Input
                placeholder="Seu bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="h-12 font-black italic bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black italic uppercase opacity-60">Cidade</label>
                <Input value={cidadeAddr} readOnly className="h-12 font-bold italic bg-white/5 border-white/10 opacity-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black italic uppercase opacity-60">UF</label>
                <Input value={estadoAddr} readOnly className="h-12 font-black italic bg-white/5 border-white/10 opacity-50" />
              </div>
            </div>
          </div>

          {/* Módulo de Privacidade */}
          <div className="flex items-start gap-2.5 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-orange-400" />
            <p className="text-[11px] italic leading-relaxed text-orange-50/80">
              <span className="text-orange-300 font-semibold">Sua privacidade é sagrada.</span> O endereço exato nunca será divulgado, apenas o bairro alimenta o Censo.
            </p>
          </div>

          {/* Botão de Ação (CTA) */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !bairro.trim() || cep.replace(/\D/g, "").length !== 8}
            className="w-full h-13 btn-orange-gradient font-black italic uppercase rounded-xl shadow-lg shadow-orange-500/20"
          >
            {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : "LIBERAR MAPA DE CALOR"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressModal;