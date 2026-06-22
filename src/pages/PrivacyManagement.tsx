/**
 * [CAMINHO]: src/pages/PrivacyManagement.tsx
 * [DESCRIÇÃO]: Tela "Gerenciar meus Dados" — direitos do titular (LGPD).
 * Solicita exclusão de conta via RPC request_account_deletion (status pending_deletion).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, AlertTriangle, Loader2, Mail, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PrivacyManagement = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isAuthReady } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/login", { replace: true });
    return null;
  }

  const alreadyRequested = Boolean((profile as any)?.deletion_requested_at);

  const handleRequestDeletion = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("request_account_deletion" as any);
      if (error) throw error;
      toast({
        title: "Solicitação registrada",
        description: (data as any)?.message ?? "Seus dados serão excluídos em até 15 dias.",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e?.message ?? "Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-primary text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <header className="space-y-2">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Gerenciar meus Dados
          </h1>
          <p className="text-sm text-muted-foreground">
            Conta: <strong>{user?.email}</strong>
          </p>
        </header>

        {/* Direitos do titular */}
        <section className="glass-card rounded-xl p-5 space-y-3">
          <h2 className="font-bold">Seus direitos (LGPD)</h2>
          <p className="text-sm text-muted-foreground">
            Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pessoais
            a qualquer momento.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <a
              href={`mailto:admin@heartclubapp.com?subject=Solicita%C3%A7%C3%A3o%20LGPD%20-%20Acesso%20aos%20meus%20dados&body=Conta:%20${encodeURIComponent(user?.email ?? "")}`}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-border/40 hover:bg-secondary/30 text-sm"
            >
              <Download className="w-4 h-4" /> Solicitar cópia dos dados
            </a>
            <a
              href={`mailto:admin@heartclubapp.com?subject=Solicita%C3%A7%C3%A3o%20LGPD%20-%20D%C3%BAvidas&body=Conta:%20${encodeURIComponent(user?.email ?? "")}`}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-border/40 hover:bg-secondary/30 text-sm"
            >
              <Mail className="w-4 h-4" /> Falar com o DPO
            </a>
          </div>
        </section>

        {/* Exclusão de conta */}
        <section className="glass-card rounded-xl p-5 space-y-3 border border-red-500/30">
          <h2 className="font-bold flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" /> Exclusão de Conta e Dados
          </h2>
          <p className="text-sm text-muted-foreground">
            Ao solicitar a exclusão, sua conta entra em status <strong>"pending_deletion"</strong> e
            seus dados pessoais (nome, e-mail, localização, perfil socioeconômico) são apagados em até
            <strong> 15 dias</strong>, conforme prazo legal. O voto pode ser mantido de forma
            anonimizada para preservar a integridade estatística do censo.
          </p>

          {alreadyRequested ? (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm">
              ✅ Sua solicitação já foi registrada em{" "}
              <strong>
                {new Date((profile as any).deletion_requested_at).toLocaleDateString("pt-BR")}
              </strong>
              . Em caso de dúvidas, contate o DPO.
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Solicitar Exclusão de Conta e Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Após confirmar, sua conta será marcada
                    para exclusão e processada em até 15 dias. Você perderá acesso ao dashboard e ao
                    seu Voto Sagrado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRequestDeletion}>
                    Sim, solicitar exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </section>
      </div>
    </div>
  );
};

export default PrivacyManagement;
