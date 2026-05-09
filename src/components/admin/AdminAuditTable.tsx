/**
 * [CAMINHO]: src/components/admin/AdminAuditTable.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 6.0 (RECUSA LÓGICA + LISTA NEGRA)
 * [OBJETIVO]: Gerenciamento de auditoria com preservação de rastro para bloqueio de IPs.
 */

import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, AlertTriangle, Shield, RefreshCw, Check, Heart, ChevronDown, ChevronUp, XOctagon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ═══════════════════════════════════════════════════════════
    MÓDULO DE DEFINIÇÕES (INTERFACES)
   ═══════════════════════════════════════════════════════════ */
interface VoteRow {
  voto_id: string;
  user_id: string | null;
  clube_nome: string;
  pais: string;
  estado: string;
  cidade: string;
  created_at: string;
  is_fraud_attempt: boolean;
  is_original_vote: boolean;
  fingerprint: string | null;
  ip_address: string | null;
  is_suspicious: boolean | null;
  user_email: string | null;
  user_nome: string | null;
  status_aprovacao?: string;
  motivo_suspicao?: string;
}

const AdminAuditTable = () => {
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [openSympathyId, setOpenSympathyId] = useState<string | null>(null);
  const [sympathyCache, setSympathyCache] = useState<Record<string, string[]>>({});
  const [loadingSympathyId, setLoadingSympathyId] = useState<string | null>(null);
  const { toast } = useToast();

  const fingerprintCounts = new Map<string, number>();
  votes.forEach((v) => {
    if (v.fingerprint) {
      fingerprintCounts.set(v.fingerprint, (fingerprintCounts.get(v.fingerprint) || 0) + 1);
    }
  });

  /* ═══════════════════════════════════════════════════════════
      MÓDULO 1: BUSCA DE DADOS (FETCH)
     ═══════════════════════════════════════════════════════════ */
  const fetchVotes = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_votes_with_tracking");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setVotes((data as unknown as VoteRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVotes();
  }, []);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO 2: AÇÕES DE AUDITORIA (APROVAR / RECUSAR / DELETAR)
     ═══════════════════════════════════════════════════════════ */
  
  const handleApprove = async (votoId: string) => {
    setActingId(votoId);
    const { error } = await supabase.rpc("admin_approve_vote", { p_voto_id: votoId });
    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      setApprovedIds((s) => new Set(s).add(votoId));
      setVotes((prev) =>
        prev.map((v) =>
          v.voto_id === votoId
            ? { ...v, is_fraud_attempt: false, is_suspicious: false, is_original_vote: true, status_aprovacao: 'aprovado' }
            : v
        )
      );
      toast({ title: "Voto aprovado!", description: "Contabilizado no Censo." });
    }
    setActingId(null);
  };

  // NOVO: Recusa o voto mantendo o rastro para bloqueio futuro de IP
  const handleReject = async (votoId: string) => {
    setActingId(votoId);
    const { error } = await supabase
      .from("votos")
      .update({ 
        status_aprovacao: "recusado", 
        is_suspicious: true,
        motivo_suspicao: "Recusado pelo Moderador (Lista Negra)."
      })
      .eq("id", votoId);

    if (error) {
      toast({ title: "Erro ao recusar", description: error.message, variant: "destructive" });
    } else {
      setRejectedIds((s) => new Set(s).add(votoId));
      setVotes((prev) =>
        prev.map((v) =>
          v.voto_id === votoId ? { ...v, status_aprovacao: 'recusado', is_suspicious: true } : v
        )
      );
      toast({ title: "Voto Recusado!", description: "Rastro mantido na Lista Negra." });
    }
    setActingId(null);
  };

  const handleDeleteOne = async (votoId: string) => {
    if (!confirm("Deletar definitivamente? Para fraudes, prefira 'Recusar' para manter o rastro.")) return;
    setActingId(votoId);
    const { error } = await supabase.rpc("admin_delete_vote", { p_voto_id: votoId });
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      setVotes((prev) => prev.filter((v) => v.voto_id !== votoId));
      toast({ title: "Voto removido permanentemente." });
    }
    setActingId(null);
  };

  const handleToggleSympathy = async (votoId: string) => {
    if (openSympathyId === votoId) { setOpenSympathyId(null); return; }
    if (!sympathyCache[votoId]) {
      setLoadingSympathyId(votoId);
      const { data, error } = await supabase.rpc("admin_get_vote_sympathies", { p_voto_id: votoId });
      setLoadingSympathyId(null);
      if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
      const obj = (data || {}) as Record<string, string | null>;
      const list = [obj.sympathy_1, obj.sympathy_2, obj.sympathy_3, obj.sympathy_4].filter((s): s is string => !!s);
      setSympathyCache((prev) => ({ ...prev, [votoId]: list }));
    }
    setOpenSympathyId(votoId);
  };

  /* ═══════════════════════════════════════════════════════════
      MÓDULO 3: RENDERIZAÇÃO DA INTERFACE
     ═══════════════════════════════════════════════════════════ */
  const getRowClass = (vote: VoteRow): string => {
    if (approvedIds.has(vote.voto_id) || vote.status_aprovacao === 'aprovado') return "border-l-4 border-l-green-500 bg-green-500/10";
    if (rejectedIds.has(vote.voto_id) || vote.status_aprovacao === 'recusado') return "border-l-4 border-l-red-500 bg-red-500/10 opacity-70";
    if (vote.is_fraud_attempt && vote.is_original_vote) return "border-l-4 border-l-orange-500 bg-orange-500/5";
    if (vote.is_suspicious) return "bg-yellow-500/10 border-l-4 border-l-yellow-500";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card"><CardContent className="p-4 text-center"><p className="text-3xl font-black">{votes.length}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Votos Totais</p></CardContent></Card>
        <Card className="bg-card"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-yellow-500">{votes.filter(v => v.is_suspicious).length}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Suspeitos</p></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={fetchVotes} variant="outline" size="sm" disabled={loading}><RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">Status</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">Clube</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">Torcedor / Email</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">IP / Local</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {votes.map((v) => {
                  const isOpen = openSympathyId === v.voto_id;
                  const isRejected = rejectedIds.has(v.voto_id) || v.status_aprovacao === 'recusado';
                  return (
                    <Fragment key={v.voto_id}>
                      <TableRow className={`border-border ${getRowClass(v)}`}>
                        <TableCell>
                          {isRejected ? <Badge className="bg-red-600 text-[9px] uppercase">Recusado</Badge> :
                           approvedIds.has(v.voto_id) ? <Badge className="bg-green-600 text-[9px] uppercase">Aprovado</Badge> :
                           v.is_suspicious ? <Badge className="bg-yellow-600 text-[9px] uppercase">Suspeito</Badge> :
                           <Badge variant="outline" className="border-green-600 text-green-500 text-[9px] uppercase">OK</Badge>}
                        </TableCell>
                        <TableCell className="font-bold italic uppercase text-xs">{v.clube_nome}</TableCell>
                        <TableCell>
                          <p className="text-xs font-black">{v.user_nome || "—"}</p>
                          <p className="text-[10px] opacity-60">{v.user_email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-[10px] font-mono">{v.ip_address}</p>
                          <p className="text-[9px] opacity-60">{v.cidade}, {v.estado}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleToggleSympathy(v.voto_id)}><Heart className="w-3.5 h-3.5" /></Button>
                            
                            {/* BOTÃO APROVAR */}
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-green-600 text-green-500 hover:bg-green-500/10" 
                                    disabled={actingId === v.voto_id || approvedIds.has(v.voto_id) || isRejected}
                                    onClick={() => handleApprove(v.voto_id)}><Check className="w-4 h-4" /></Button>
                            
                            {/* BOTÃO RECUSAR (FICHA SUJA) */}
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-600 text-red-500 hover:bg-red-500/10"
                                    disabled={actingId === v.voto_id || approvedIds.has(v.voto_id) || isRejected}
                                    onClick={() => handleReject(v.voto_id)} title="Recusar e marcar IP como fraude"><XOctagon className="w-4 h-4" /></Button>

                            {/* BOTÃO DELETAR DEFINITIVO */}
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-destructive text-destructive"
                                    disabled={actingId === v.voto_id}
                                    onClick={() => handleDeleteOne(v.voto_id)} title="Deletar permanentemente"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-primary/5">
                          <TableCell colSpan={5} className="py-2 px-4">
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase opacity-60">Simpatias:</span>
                              {sympathyCache[v.voto_id]?.map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] uppercase italic">{s}</Badge>
                              )) || <span className="text-[9px] italic opacity-40">Nenhuma registrada</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminAuditTable;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/admin/AdminAuditTable.tsx
 * VERSÃO: 6.0
 * - Implementada Recusa Lógica (Status: 'recusado').
 * - Preservação de rastro digital para o Módulo de Auditoria v8.5.
 */