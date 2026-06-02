/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 CAMINHO: src/components/admin/AdminAuditTable.tsx
 * 🧠 MÓDULO: CENTRAL DE AUDITORIA E INTELIGÊNCIA ANTIFRAUDE
 * 🔥 STATUS: PRODUÇÃO — VERSÃO 11.0 (MASTER SYNC)
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, Check, Heart, XOctagon, MapPin, UserCheck, Sparkles, Globe2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ═══════════════════════════════════════════════════════════
    🧩 MÓDULO 1: TIPAGEM (Sincronizada com RPC v11.0)
   ═══════════════════════════════════════════════════════════ */
interface VoteRow {
  voto_id: string;
  clube_nome: string;
  user_email: string | null;
  user_nome: string | null;
  ip_address: string | null;
  cep: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  is_suspicious: boolean | null;
  status_aprovacao: string | null;
  motivo_suspicao: string | null;
  created_at: string;
  sympathy_1: string | null;
  sympathy_2: string | null;
  sympathy_3: string | null;
  sympathy_4: string | null;
  referral_source: string | null;
  referral_ambassador_name: string | null;
  referral_code: string | null;
}

/* ═══════════════════════════════════════════════════════════
    🧠 MÓDULO 2: COMPONENTE PRINCIPAL (Lógica & Handlers)
   ═══════════════════════════════════════════════════════════ */
const AdminAuditTable = () => {
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openSympathyId, setOpenSympathyId] = useState<string | null>(null);
  const [sympathyCache, setSympathyCache] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  /* 🔄 MÓDULO 2.1: BUSCA DE DADOS */
  const fetchVotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_votes_with_tracking");
      if (error) {
        console.error("[RPC ERROR]:", error);
        toast({ title: "Erro na Auditoria", description: "Falha na conexão com o banco.", variant: "destructive" });
      } else {
        setVotes((data as unknown as VoteRow[]) || []);
      }
    } catch (err) {
      console.error("[FETCH ERROR]:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVotes(); }, []);

  /* ⚡ MÓDULO 2.2: AÇÕES ADMINISTRATIVAS */
  const handleApprove = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.rpc("admin_approve_vote", { p_voto_id: id });
    if (!error) {
      setVotes(prev => prev.map(v => v.voto_id === id ? { ...v, status_aprovacao: 'aprovado', is_suspicious: false } : v));
      toast({ title: "Voto aprovado com sucesso." });
    }
    setActingId(null);
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.from("votos").update({
      status_aprovacao: "recusado",
      is_suspicious: true,
      motivo_suspicao: "Fraude manual detectada pelo Administrador."
    }).eq("id", id);
    if (!error) {
      setVotes(prev => prev.map(v => v.voto_id === id ? { ...v, status_aprovacao: 'recusado', is_suspicious: true, motivo_suspicao: "Fraude manual detectada pelo Administrador." } : v));
      toast({ title: "Voto recusado. Alerta pulsante ativado." });
    }
    setActingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar permanentemente?")) return;
    setActingId(id);
    const { error } = await supabase.rpc("admin_delete_vote", { p_voto_id: id });
    if (!error) {
      setVotes(prev => prev.filter(v => v.voto_id !== id));
      toast({ title: "Registro removido." });
    }
    setActingId(null);
  };

  const handleToggleSympathy = async (votoId: string) => {
    if (openSympathyId === votoId) { setOpenSympathyId(null); return; }
    if (!sympathyCache[votoId]) {
      const { data } = await supabase.rpc("admin_get_vote_sympathies", { p_voto_id: votoId });
      const obj = (data || {}) as any;
      const list = [obj.sympathy_1, obj.sympathy_2, obj.sympathy_3, obj.sympathy_4].filter(Boolean);
      setSympathyCache(prev => ({ ...prev, [votoId]: list }));
    }
    setOpenSympathyId(votoId);
  };

  /* ═══════════════════════════════════════════════════════
      🎨 MÓDULO 3: RENDERIZAÇÃO COM ANIMAÇÕES DE ALERTA
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      <Button onClick={fetchVotes} variant="outline" size="sm" disabled={loading} className="font-black italic uppercase">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar Base
      </Button>

      <Card className="overflow-hidden border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/20 text-[10px] font-black uppercase italic">
              <TableHead>Status / Alerta</TableHead>
              <TableHead>Clube / Torcedor</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {votes.map((v) => {
              const isSuspicious = v.is_suspicious === true;
              const isRejected = v.status_aprovacao === 'recusado';
              const isApproved = v.status_aprovacao === 'aprovado';

              return (
                <Fragment key={v.voto_id}>
                  <TableRow className={`border-border transition-all ${isSuspicious ? "bg-red-500/5 animate-pulse shadow-[inset_0_0_20px_rgba(255,0,0,0.1)]" : ""}`}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isRejected ? <Badge className="bg-red-600 font-black italic">RECUSADO</Badge> :
                         isApproved ? <Badge className="bg-green-600 font-black italic">APROVADO</Badge> :
                         isSuspicious ? (
                           <>
                             <Badge className="bg-red-500 animate-pulse font-black text-white shadow-[0_0_10px_rgba(255,0,0,0.4)] italic">SUSPEITO</Badge>
                             <span className="text-[8px] text-red-500 font-bold uppercase leading-none">{v.motivo_suspicao}</span>
                           </>
                         ) : <Badge className="bg-green-600 font-black italic">OK</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-black italic uppercase text-primary leading-tight">{v.clube_nome}</p>
                      <p className="text-[10px] font-black uppercase leading-tight">{v.user_nome || "—"}</p>
                      <p className="text-[9px] italic opacity-60 font-bold">{v.user_email}</p>
                      {(() => {
                        const sympathies = [v.sympathy_1, v.sympathy_2, v.sympathy_3, v.sympathy_4].filter(Boolean) as string[];
                        if (sympathies.length === 0) return null;
                        return (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            <Heart className="w-2.5 h-2.5 text-primary fill-primary" />
                            <span className="text-[8px] font-black italic uppercase text-primary/80 leading-tight">
                              SIMPATIAS: {sympathies.join(" • ")}
                            </span>
                          </div>
                        );
                      })()}
                      {v.referral_source === 'embaixador' ? (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <UserCheck className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-[8px] font-black italic uppercase text-emerald-400 leading-tight">
                            INDICADO POR: {v.referral_ambassador_name || "—"}
                            {v.referral_code ? ` • CÓD: ${v.referral_code}` : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                          <span className="text-[8px] font-black italic uppercase text-cyan-400 leading-tight">
                            ORGÂNICO
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-cyan-500">{v.ip_address || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-muted-foreground" />
                        <span className="text-[10px] font-black">{v.cep || "—"}</span>
                      </div>
                      {v.bairro && (
                        <p className="text-[10px] uppercase font-black text-primary leading-tight">{v.bairro}</p>
                      )}
                      <p className="text-[9px] uppercase opacity-60 leading-tight font-bold">{v.cidade}, {v.estado}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleToggleSympathy(v.voto_id)}><Heart className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-green-600 text-green-500 hover:bg-green-600/10" disabled={actingId === v.voto_id || isApproved} onClick={() => handleApprove(v.voto_id)}><Check className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-600 text-red-500 hover:bg-red-600/10" disabled={actingId === v.voto_id || isRejected} onClick={() => handleReject(v.voto_id)}><XOctagon className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-destructive text-destructive hover:bg-destructive/10" disabled={actingId === v.voto_id} onClick={() => handleDelete(v.voto_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {openSympathyId === v.voto_id && (
                    <TableRow className="bg-primary/5 animate-in slide-in-from-top-1 duration-200">
                      <TableCell colSpan={5} className="px-4 py-2 text-[10px] italic text-primary font-black uppercase text-center">
                        Simpatias: {sympathyCache[v.voto_id]?.join(", ") || "Nenhuma Registrada"}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminAuditTable;

/**
 * ═══════════════════════════════════════════════════════════════
 * 📌 RODAPÉ TÉCNICO | HEART CLUB INTELLIGENCE
 * ═══════════════════════════════════════════════════════════════
 * VERSÃO: 11.0 (MASTER SYNC)
 * MÓDULO: AdminAuditTable (Auditoria Antifraude)
 * COMPATIBILIDADE: PostgreSQL 15+ / Supabase RPC
 * STATUS: FULL RECOVERY — SINCRONIZADO
 * ═══════════════════════════════════════════════════════════════
 */
