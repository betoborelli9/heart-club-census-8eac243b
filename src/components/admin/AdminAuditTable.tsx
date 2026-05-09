/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 CAMINHO: src/components/admin/AdminAuditTable.tsx
 * 🧠 MÓDULO: CENTRAL DE AUDITORIA E CONTROLE DE FRAUDES
 * 🔥 STATUS: PRODUÇÃO — VERSÃO 10.6 (FINAL RECOVERY)
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, Check, Heart, XOctagon, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ═══════════════════════════════════════════════════════════
    🧩 MÓDULO 1: TIPAGEM E INTERFACES
   ═══════════════════════════════════════════════════════════ */
interface VoteRow {
  voto_id: string;
  clube_nome: string;
  user_email: string | null;
  user_nome: string | null;
  ip_address: string | null;
  cep?: string;
  cidade: string;
  estado: string;
  is_suspicious: boolean | null;
  status_aprovacao?: string;
  motivo_suspicao?: string;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════
    🧠 MÓDULO 2: COMPONENTE DE AUDITORIA
   ═══════════════════════════════════════════════════════════ */
const AdminAuditTable = () => {
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openSympathyId, setOpenSympathyId] = useState<string | null>(null);
  const [sympathyCache, setSympathyCache] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  const fetchVotes = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_votes_with_tracking");
    if (!error) {
      setVotes((data as unknown as VoteRow[]) || []);
    } else {
      console.error("[RPC ERROR]:", error);
      toast({ title: "Erro na Auditoria", description: "Execute o SQL de DROP/CREATE no Supabase.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchVotes(); }, []);

  const handleApprove = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.rpc("admin_approve_vote", { p_voto_id: id });
    if (!error) {
      setVotes(prev => prev.map(v => v.voto_id === id ? { ...v, status_aprovacao: 'aprovado', is_suspicious: false } : v));
      toast({ title: "Voto Aprovado!" });
    }
    setActingId(null);
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.from("votos").update({ 
      status_aprovacao: "recusado", 
      is_suspicious: true, 
      motivo_suspicao: "Recusado pelo Moderador." 
    }).eq("id", id);
    if (!error) {
      setVotes(prev => prev.map(v => v.voto_id === id ? { ...v, status_aprovacao: 'recusado', is_suspicious: true } : v));
      toast({ title: "Voto Recusado!" });
    }
    setActingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar permanentemente?")) return;
    setActingId(id);
    const { error } = await supabase.rpc("admin_delete_vote", { p_voto_id: id });
    if (!error) {
      setVotes(prev => prev.filter(v => v.voto_id !== id));
      toast({ title: "Removido." });
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

  return (
    <div className="space-y-6">
      <Button onClick={fetchVotes} variant="outline" size="sm" disabled={loading} className="font-black italic uppercase">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar Base
      </Button>

      <Card className="overflow-hidden border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/20 text-[10px] font-black uppercase">
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
                  <TableRow className={`border-border transition-all ${isSuspicious ? "bg-red-500/5 animate-pulse" : ""}`}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isRejected ? <Badge className="bg-red-600 font-black">RECUSADO</Badge> :
                         isApproved ? <Badge className="bg-green-600 font-black">APROVADO</Badge> :
                         isSuspicious ? (
                           <>
                             <Badge className="bg-red-500 animate-pulse font-black text-white shadow-[0_0_10px_rgba(255,0,0,0.3)]">SUSPEITO</Badge>
                             <span className="text-[8px] font-bold uppercase text-red-400">{v.motivo_suspicao || "IP/ID REPETIDO"}</span>
                           </>
                         ) : <Badge className="bg-green-600 font-black">OK</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-black italic uppercase text-primary leading-tight">{v.clube_nome}</p>
                      <p className="text-[10px] font-black uppercase leading-tight">{v.user_nome || "—"}</p>
                      <p className="text-[9px] italic opacity-60">{v.user_email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-cyan-500">{v.ip_address || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-muted-foreground" />
                        <span className="text-[10px] font-black">{v.cep || "—"}</span>
                      </div>
                      <p className="text-[9px] uppercase opacity-60 leading-tight">{v.cidade}, {v.estado}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleToggleSympathy(v.voto_id)}><Heart className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-green-600 text-green-500 hover:bg-green-600/10" disabled={actingId === v.voto_id || isApproved} onClick={() => handleApprove(v.voto_id)}><Check className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-600 text-red-500 hover:bg-red-600/10" disabled={actingId === v.voto_id || isRejected} onClick={() => handleReject(v.voto_id)}><XOctagon className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-destructive text-destructive" disabled={actingId === v.voto_id} onClick={() => handleDelete(v.voto_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {openSympathyId === v.voto_id && (
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={5} className="px-4 py-2 text-[10px] italic text-primary font-bold uppercase text-center">
                        SIMPATIAS: {sympathyCache[v.voto_id]?.join(", ") || "NENHUMA REGISTRADA"}
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
 * VERSÃO: 10.6 (FINAL)
 * MÓDULO: AdminAuditTable
 * COMPATIBILIDADE: admin_get_votes_with_tracking
 * ═══════════════════════════════════════════════════════════════
 */