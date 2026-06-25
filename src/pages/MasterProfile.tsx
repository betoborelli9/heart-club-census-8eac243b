/**
 * [CAMINHO]: src/pages/MasterProfile.tsx
 * [MÓDULO]: Master Admin — edição livre dos próprios dados de perfil
 *           (cidade, bairro, estado, CEP, faixa etária, renda, profissão)
 *           para fins de teste. Acesso exclusivo de betoborelli9@gmail.com.
 * [REGRA]: Nenhum fluxo do torcedor comum é alterado. Esta página apenas
 *          chama updateProfile do UserContext, escrevendo direto na tabela
 *          profiles via RLS já existente (auth.uid() = id).
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, ArrowLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { isMasterEmail } from "@/lib/master";

const FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "nome_exibicao", label: "Nome de exibição" },
  { key: "cidade", label: "Cidade", placeholder: "Ex.: Rio de Janeiro" },
  { key: "bairro", label: "Bairro", placeholder: "Ex.: Copacabana" },
  { key: "estado", label: "Estado / UF", placeholder: "Ex.: RJ" },
  { key: "pais", label: "País", placeholder: "Ex.: Brasil" },
  { key: "cep", label: "CEP", placeholder: "Ex.: 22000-000" },
  { key: "faixa_etaria", label: "Faixa etária", placeholder: "Ex.: 30-39" },
  { key: "classe_social", label: "Classe social / Renda", placeholder: "Ex.: B" },
  { key: "profissao", label: "Profissão" },
  { key: "telefone", label: "Telefone" },
];

export default function MasterProfile() {
  const { user, profile, isAuthReady, isLoading, updateProfile, refreshProfile } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Guard: somente master
  useEffect(() => {
    if (!isAuthReady || isLoading) return;
    if (!isMasterEmail(user?.email)) navigate("/dashboard", { replace: true });
  }, [isAuthReady, isLoading, user?.email, navigate]);

  // Hidratar formulário com o profile atual
  useEffect(() => {
    if (!profile) return;
    const next: Record<string, string> = {};
    FIELDS.forEach((f) => {
      next[f.key] = (profile as any)[f.key] ?? "";
    });
    setValues(next);
  }, [profile]);

  const onChange = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      FIELDS.forEach((f) => {
        const v = (values[f.key] ?? "").trim();
        payload[f.key] = v === "" ? null : v;
      });
      await updateProfile(payload);
      await refreshProfile();
      toast({ title: "Perfil atualizado", description: "Seus dados foram salvos." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha ao salvar", description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthReady || isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 pb-32">
      <div className="max-w-xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs italic text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#ff6200]/15 border border-[#ff6200]/40">
            <FlaskConical className="w-5 h-5 text-[#ff6200]" />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-wider text-white">
              Master · Editar meus dados
            </h1>
            <p className="text-[11px] italic text-white/50">
              Exclusivo para {user?.email}. Use para testar fluxos por cidade, bairro etc.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs italic text-white/70">{f.label}</Label>
              <Input
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="h-11 bg-secondary/30 border-border/30"
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 font-black italic uppercase tracking-wider btn-orange-gradient rounded-xl"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
