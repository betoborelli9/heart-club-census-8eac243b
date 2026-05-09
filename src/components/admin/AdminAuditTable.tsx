/**
 * [CAMINHO]: src/components/admin/AdminAuditTable.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 7.8 (SINAL VERMELHO + MOTIVO DETALHADO)
 * [OBJETIVO]: Identificar fraudes visualmente com alerta berrante para o Moderador.
 */

import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, RefreshCw, Check, Heart, XOctagon, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoteRow {
  voto_id: string;
  user_id: string | null;
  clube_nome: string;
  pais: string;
  estado: string;
  cidade: string;
  cep?: string;
  created_at: string;
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
  const { toast } = useToast();

  const fetchVotes = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_votes_with_tracking");
    if (error) {
      toast({ title: "Erro ao buscar", variant: "destructive" });
    } else {
      setVotes((data as unknown as VoteRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVotes(); }, []);

  const handleApprove = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.rpc("admin_approve_vote", { p_voto_id: id });
    if (!error) {
      setApprovedIds(s => new Set(s).add(id));
      setVotes(prev => prev.map(v => v.voto_id === id ? { ...v, status_aprovacao: 'aprovado', is_suspicious: false } : v));
      toast({ title: "Voto Aprovado" });
    }
    setActingId(null);
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.from("votos").update({ status_aprovacao: "recusado", is_suspicious: true, motivo_suspicao: "Recusado pelo Moderador (Lista Negra)." }).eq("id", id);
    if (!error) {
      setRejectedIds(s => new Set(s).add(id));
      setVotes(prev => prev.map(v => v.voto_id === id ? { ...v, status_aprovacao: 'recusado', is_suspicious: true } : v));
      toast({ title: "Voto Recusado" });
    }
    setActingId(null);
  };

  const getRowClass = (vote: VoteRow): string => {
    if (approvedIds.has(vote.voto_id) || vote.status_aprovacao === 'aprovado') return "border-l-4 border-l-green-500 bg-green-500/10";
    if (rejectedIds.has(vote.voto_id) || vote.status_aprovacao === 'recusado') return "border-l-4 border-l-red-500 bg-red-500/10 opacity-70";
    if (vote.is_suspicious) return "bg-red-500/5 border-l-4 border-l-red-500 animate-pulse";
    return "";
  };

  return (
    <div className="space-y-6">
      <Button onClick={fetchVotes} variant="outline" size="sm" disabled={loading} className="font-black italic">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> ATUALIZAR BASE
      </Button>

      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 border-border">
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Status / Alerta</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Clube / Torcedor</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground">IP Address</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Localização</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {votes.map((v) => {
              const isApproved = approvedIds.has(v.voto_id) || v.status_aprovacao === 'aprovado';
              const isRejected = rejectedIds.has(v.voto_id) || v.status_aprovacao === 'recusado';
              return (
                <TableRow key={v.voto_id} className={`border-border ${getRowClass(v)}`}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {isRejected ? <Badge className="bg-red-600 text-[8px]">RECUSADO</Badge> :
                       isApproved ? <Badge className="bg-green-600 text-[8px]">APROVADO</Badge> :
                       v.is_suspicious ? (
                         <>
                           <Badge className="bg-red-500 animate-pulse text-[8px] font-black text-white">SUSPEITO</Badge>
                           <span className="text-[7px] text-red-400 font-bold leading-none uppercase max-w-[100px]">{v.motivo_suspicao}</span>
                         </>
                       ) : (
                         <Badge variant="outline" className="border-green-600 text-green-500 text-[8px]">OK</Badge>
                       )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold italic text-xs uppercase text-primary">{v.clube_nome}</p>
                    <p className="text-[10px] font-black uppercase">{v.user_nome || "—"}</p>
                    <p className="text-[9px] opacity-60 italic">{v.user_email}</p>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-cyan-500">{v.ip_address || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} className="text-muted-foreground" />
                      <span className="text-[10px] font-black">{v.cep || "—"}</span>
                    </div>
                    <p className="text-[9px] uppercase opacity-50">{v.cidade}, {v.estado}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-green-600 text-green-500" disabled={actingId === v.voto_id || isApproved || isRejected} onClick={() => handleApprove(v.voto_id)}><Check className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-600 text-red-500" disabled={actingId === v.voto_id || isApproved || isRejected} onClick={() => handleReject(v.voto_id)}><XOctagon className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
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
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/admin/AdminAuditTable.tsx
 * VERSÃO: 7.8 - Badge vermelho pulsante para fraude detectada.
 */