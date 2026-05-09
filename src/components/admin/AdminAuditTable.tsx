/**
 * [CAMINHO]: src/components/admin/AdminAuditTable.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 7.5 (NOVAS COLUNAS: CEP, IP E GEOLOCALIZAÇÃO)
 * [OBJETIVO]: Gestão de auditoria mestre com visualização detalhada de rastro geográfico.
 */

import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, AlertTriangle, Shield, RefreshCw, Check, Heart, ChevronDown, ChevronUp, XOctagon, MapPin } from "lucide-react";
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
  cep?: string; // NOVO: CEP capturado no voto
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
  const [actingId, setActingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [openSympathyId, setOpenSympathyId] = useState<string | null>(null);
  const [sympathyCache, setSympathyCache] = useState<Record<string, string[]>>({});
  const [loadingSympathyId, setLoadingSympathyId] = useState<string | null>(null);
  const { toast } = useToast();

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
      MÓDULO 2: AÇÕES DE AUDITORIA
     ═══════════════════════════════════════════════════════════ */
  const handleApprove = async (votoId: string) => {
    setActingId(votoId);
    const { error } = await supabase.rpc("admin_approve_vote", { p_voto_id: votoId });
    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      setApprovedIds((s) => new Set(s).add(votoId));
      setVotes((prev) => prev.map((v) => v.voto_id === votoId ? { ...v, status_aprovacao: 'aprovado', is_suspicious: false } : v));
      toast({ title: "Voto aprovado!" });
    }
    setActingId(null);
  };

  const handleReject = async (votoId: string) => {
    setActingId(votoId);
    const { error } = await supabase.from("votos").update({ status_aprovacao: "recusado", is_suspicious: true, motivo_suspicao: "Recusado pelo Moderador (Lista Negra)." }).eq("id", votoId);
    if (error) {
      toast({ title: "Erro ao recusar", variant: "destructive" });
    } else {
      setRejectedIds((s) => new Set(s).add(votoId));
      setVotes((prev) => prev.map((v) => v.voto_id === votoId ? { ...v, status_aprovacao: 'recusado', is_suspicious: true } : v));
      toast({ title: "Voto Recusado!" });
    }
    setActingId(null);
  };

  const handleDeleteOne = async (votoId: string) => {
    if (!confirm("Deletar permanentemente?")) return;
    setActingId(votoId);
    const { error } = await supabase.rpc("admin_delete_vote", { p_voto_id: votoId });
    if (error) {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    } else {
      setVotes((prev) => prev.filter((v) => v.voto_id !== votoId));
      toast({ title: "Voto removido." });
    }
    setActingId(null);
  };

  const handleToggleSympathy = async (votoId: string) => {
    if (openSympathyId === votoId) { setOpenSympathyId(null); return; }
    if (!sympathyCache[votoId]) {
      setLoadingSympathyId(votoId);
      const { data, error } = await supabase.rpc("admin_get_vote_sympathies", { p_voto_id: votoId });
      setLoadingSympathyId(null);
      if (error) return;
      const obj = (data || {}) as Record<string, string | null>;
      const list = [obj.sympathy_1, obj.sympathy_2, obj.sympathy_3, obj.sympathy_4].filter((s): s is string => !!s);
      setSympathyCache((prev) => ({ ...prev, [votoId]: list }));
    }
    setOpenSympathyId(votoId);
  };

  const getRowClass = (vote: VoteRow): string => {
    if (approvedIds.has(vote.voto_id) || vote.status_aprovacao === 'aprovado') return "border-l-4 border-l-green-500 bg-green-500/10";
    if (rejectedIds.has(vote.voto_id) || vote.status_aprovacao === 'recusado') return "border-l-4 border-l-red-500 bg-red-500/10 opacity-70";
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
        <Button onClick={fetchVotes} variant="outline" size="sm" disabled={loading}><RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar Base</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/20">
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">Status / Motivo</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">Clube / Torcedor</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">IP Address</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-black">CEP / Localização</TableHead>
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
                          <div className="flex flex-col gap-1">
                            {isRejected ? <Badge className="bg-red-600 text-[9px] uppercase">Recusado</Badge> :
                             approvedIds.has(v.voto_id) ? <Badge className="bg-green-600 text-[9px] uppercase">Aprovado</Badge> :
                             v.is_suspicious ? <Badge className="bg-yellow-600 text-[9px] uppercase">Suspeito</Badge> :
                             <Badge variant="outline" className="border-green-600 text-green-500 text-[9px] uppercase">OK</Badge>}
                            
                            {v.is_suspicious && (
                              <span className="text-[8px] text-yellow-500 font-bold leading-tight uppercase max-w-[120px]">
                                {v.motivo_suspicao || "Check Duplicata"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold italic uppercase text-xs text-primary">{v.clube_nome}</p>
                          <p className="text-[10px] font-black">{v.user_nome || "—"}</p>
                          <p className="text-[9px] opacity-60">{v.user_email}</p>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-cyan-500">{v.ip_address || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1.5">
                            <MapPin size={12} className="text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-[10px] font-black text-white">{v.cep || "—"}</p>
                              <p className="text-[9px] uppercase opacity-60">{v.cidade}, {v.estado}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleToggleSympathy(v.voto_id)}><Heart className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-green-600 text-green-500" disabled={actingId === v.voto_id || approvedIds.has(v.voto_id) || isRejected} onClick={() => handleApprove(v.voto_id)}><Check className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-600 text-red-500" disabled={actingId === v.voto_id || approvedIds.has(v.voto_id) || isRejected} onClick={() => handleReject(v.voto_id)}><XOctagon className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-destructive text-destructive" disabled={actingId === v.voto_id} onClick={() => handleDeleteOne(v.voto_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-primary/5">
                          <TableCell colSpan={5} className="py-2 px-4 italic text-[10px]">
                            Simpatias: {sympathyCache[v.voto_id]?.join(", ") || "Nenhuma"}
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
 * VERSÃO: 7.5
 * - Adicionadas colunas de CEP, IP e Localização detalhada.
 * - Adicionado campo Motivo de Suspeição para transparência do Master Admin.
 */