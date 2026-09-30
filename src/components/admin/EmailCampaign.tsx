/**
 * [CAMINHO]: src/components/admin/EmailCampaign.tsx
 * [MÓDULO]: Robô de campanha de e-mail — Admin escolhe o segmento
 * (dispositivo + clube opcional), escreve a mensagem uma vez, e o sistema
 * manda um e-mail PERSONALIZADO por torcedor (não um Cco único), com
 * pausa entre cada envio. Usa o mesmo serviço de e-mail já configurado
 * pro Heart Club — nenhuma senha/segredo novo precisa ser cadastrado.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, Smartphone, Apple, Monitor, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

type Segment = "todos" | "android" | "iphone" | "desktop";
type Recipient = { user_id: string; nome: string; email: string; device: string; clube_nome: string | null };

const DEFAULT_MESSAGE = `Oi, {{nome}}! 👋

Você já está no Heart Club, o maior censo digital de torcedores do mundo — e agora precisamos da sua ajuda pra dar o passo final: colocar o aplicativo Android disponível pra todo mundo na Play Store.

É rápido, leva menos de 2 minutos, e sua ajuda faz toda a diferença.

Um abraço,
Beto Borelli
Fundador — Heart Club`;

export default function EmailCampaign() {
  const { toast } = useToast();
  const { user, profile } = useUser();
  const [testMode, setTestMode] = useState(true);
  const [segment, setSegment] = useState<Segment>("android");
  const [clubNames, setClubNames] = useState<string[]>([]);
  const [club, setClub] = useState<string>("");
  const [subject, setSubject] = useState("🚀 Heart Club: você é peça-chave pra gente ir pro ar de vez!");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: { email: string; error: string }[] } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("votos").select("clube_nome").eq("is_original_vote", true);
      const names = [...new Set((data || []).map((r: any) => r.clube_nome).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      );
      setClubNames(names);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingList(true);
      const { data } = await supabase.rpc("admin_get_email_segment", {
        p_device: segment === "todos" ? null : segment,
        p_club: club || null,
      });
      setRecipients((data as unknown as Recipient[]) || []);
      setLoadingList(false);
    })();
  }, [segment, club]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim() || recipients.length === 0) return;
    if (recipients.length > 100) {
      toast({ variant: "destructive", title: "Muitos destinatários", description: "Máximo de 100 por envio — filtra por clube pra dividir em grupos menores." });
      return;
    }
    if (testMode && !user?.email) {
      toast({ variant: "destructive", title: "Sem e-mail pra testar", description: "Não achei seu e-mail de login." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const sendList = testMode
        ? [{ email: user!.email!, nome: profile?.nome_exibicao || "torcedor" }]
        : recipients.map((r) => ({ email: r.email, nome: r.nome }));
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("send-email-campaign", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {
          subject: testMode ? `[TESTE] ${subject}` : subject,
          body: message,
          recipients: sendList,
        },
      });
      if (error) throw error;
      setResult(data);
      toast({ title: "Campanha enviada!", description: `${data.sent} e-mails enviados, ${data.failed} falharam.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Não deu pra enviar", description: e.message || "Tenta de novo em instantes." });
    } finally {
      setSending(false);
    }
  };

  const segmentBtn = (value: Segment, label: string, Icon: any) => (
    <button
      onClick={() => setSegment(value)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${
        segment === value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
          <Mail className="w-5 h-5" /> Robô de Campanha de E-mail
        </h2>
        <p className="text-sm text-muted-foreground">
          Escreve a mensagem uma vez — cada torcedor recebe um e-mail individual e personalizado (não é Cco em
          massa), enviado aos poucos pra proteger a reputação do domínio.
        </p>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Dispositivo</p>
          <div className="flex flex-wrap gap-2">
            {segmentBtn("todos", "Todos", Users)}
            {segmentBtn("android", "Android", Smartphone)}
            {segmentBtn("iphone", "iPhone", Apple)}
            {segmentBtn("desktop", "Desktop", Monitor)}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Clube (opcional)</p>
          <select
            value={club}
            onChange={(e) => setClub(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm w-full max-w-xs"
          >
            <option value="">Todos os clubes</option>
            {clubNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Assunto</p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
            Mensagem <span className="font-normal normal-case">(use {"{{nome}}"} pra personalizar)</span>
          </p>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={10} className="text-sm" />
        </div>

        <label className="flex items-center gap-2 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 cursor-pointer">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="w-4 h-4" />
          <span>
            <b>Modo teste</b> — manda só pro seu próprio e-mail ({user?.email}), pra você conferir antes de mandar valendo
          </span>
        </label>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {loadingList ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : testMode ? (
              "Vai mandar 1 e-mail de teste pra você"
            ) : (
              <>
                <b className="text-foreground">{recipients.length}</b> destinatário{recipients.length !== 1 ? "s" : ""} nesse filtro
              </>
            )}
          </p>
          <Button onClick={handleSend} disabled={sending || loadingList || recipients.length === 0} variant={testMode ? "outline" : "default"}>
            {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
            {sending ? "Enviando..." : testMode ? "Enviar Teste" : "Enviar Campanha pra Todos"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-black uppercase tracking-wide mb-2 text-muted-foreground">Resultado</h3>
          <p className="text-sm">
            ✅ <b>{result.sent}</b> enviados · {result.failed > 0 ? `❌ ${result.failed} falharam` : "sem falhas"}
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">
                  {e.email}: {e.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
