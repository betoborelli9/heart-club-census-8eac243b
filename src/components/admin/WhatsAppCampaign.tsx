/**
 * [CAMINHO]: src/components/admin/WhatsAppCampaign.tsx
 * [MÓDULO]: Disparo assistido de campanhas por WhatsApp.
 *
 * Não faz envio automático em massa (isso violaria os termos do WhatsApp
 * pra números comuns e pode gerar banimento). Em vez disso, gera um link
 * "wa.me" pronto com a mensagem pra cada torcedor — o Master Admin clica
 * um por um e o WhatsApp já abre com o texto preenchido, só falta enviar.
 * Pra automação de verdade em escala, é preciso o WhatsApp Business API
 * oficial da Meta (conta empresarial verificada + modelos aprovados).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CLUBES } from "@/clubes-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Megaphone, Loader2 } from "lucide-react";

type Contact = { user_id: string; nome: string; email: string; whatsapp: string; pais: string | null; clube_nome: string | null };

const CLUB_NAMES = [...CLUBES.map((c) => c.nome)].sort((a, b) => a.localeCompare(b, "pt-BR"));

function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function WhatsAppCampaign() {
  const [message, setMessage] = useState(
    "Oi! 👋 Você já viu que o Mapa de Calor do Heart Club tem países novos votando no seu clube? Dá uma olhada: heartclubapp.com",
  );
  const [club, setClub] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("admin_get_whatsapp_contacts", { p_club: club || null });
      setContacts((data as unknown as Contact[]) || []);
      setLoading(false);
    })();
  }, [club]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
          <Megaphone className="w-5 h-5" /> Disparo Assistido de WhatsApp
        </h2>
        <p className="text-sm text-muted-foreground">
          Escreve a mensagem, escolhe o clube (opcional) e clica no botão de cada torcedor — o WhatsApp abre
          com o texto já pronto, você só confirma o envio. Sem automação em massa, sem risco de banimento.
        </p>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="text-sm" />
        <select
          value={club}
          onChange={(e) => setClub(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm w-full max-w-xs"
        >
          <option value="">Todos os clubes</option>
          {CLUB_NAMES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-black uppercase tracking-wide mb-3 text-muted-foreground">
          Torcedores com WhatsApp cadastrado ({contacts.length})
        </h3>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum torcedor com WhatsApp cadastrado nesse filtro.</p>
        ) : (
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {contacts.map((c) => (
              <div key={c.user_id} className="flex items-center justify-between text-sm border-b border-border/50 py-2 gap-2">
                <div>
                  <p className="font-bold">{c.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.clube_nome ?? "—"} · {c.whatsapp}
                  </p>
                </div>
                <a href={waLink(c.whatsapp, message)} target="_blank" rel="noreferrer">
                  <Button size="sm" className="gap-1.5 bg-[#25D366] hover:bg-[#1fb959] text-white">
                    <MessageCircle className="w-4 h-4" /> Enviar
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
