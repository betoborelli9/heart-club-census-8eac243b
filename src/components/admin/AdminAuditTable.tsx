import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, AlertTriangle, Shield, RefreshCw, Check, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  user_nascimento: string | null;
  user_genero: string | null;
  user_profissao: string | null;
}

const AdminAuditTable = () => {
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [openSympathyId, setOpenSympathyId] = useState<string | null>(null);
  const [sympathyCache, setSympathyCache] = useState<Record<string, string[]>>({});
  const [loadingSympathyId, setLoadingSympathyId] = useState<string | null>(null);
  const { toast } = useToast();

  // Group by fingerprint to detect duplicates
  const fingerprintCounts = new Map<string, number>();
  votes.forEach((v) => {
    if (v.fingerprint) {
      fingerprintCounts.set(v.fingerprint, (fingerprintCounts.get(v.fingerprint) || 0) + 1);
    }
  });

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

  const handleCleanFraud = async () => {
    setCleaning(true);
    const { data, error } = await supabase.rpc("admin_clean_fraud_by_fingerprint");
    if (error) {
      toast({ title: "Erro ao limpar fraudes", description: error.message, variant: "destructive" });
    } else {
      const result = data as unknown as { deleted_count: number; marked_count: number }[];
      const r = result?.[0];
      toast({
        title: "Fraudes limpas!",
        description: `${r?.deleted_count || 0} votos duplicados deletados, ${r?.marked_count || 0} reincidentes marcados.`,
      });
      await fetchVotes();
    }
    setCleaning(false);
  };

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
            ? { ...v, is_fraud_attempt: false, is_suspicious: false, is_original_vote: true }
            : v,
        ),
      );
      toast({ title: "Voto aprovado", description: "Passa a contar normalmente no ranking." });
    }
    setActingId(null);
  };

  const handleToggleSympathy = async (votoId: string) => {
    if (openSympathyId === votoId) {
      setOpenSympathyId(null);
      return;
    }
    if (!sympathyCache[votoId]) {
      setLoadingSympathyId(votoId);
      const { data, error } = await supabase.rpc("admin_get_vote_sympathies", { p_voto_id: votoId });
      setLoadingSympathyId(null);
      if (error) {
        toast({ title: "Erro ao carregar simpatias", description: error.message, variant: "destructive" });
        return;
      }
      const obj = (data || {}) as Record<string, string | null>;
      const list = [obj.sympathy_1, obj.sympathy_2, obj.sympathy_3, obj.sympathy_4]
        .filter((s): s is string => !!s && s.trim().length > 0);
      setSympathyCache((prev) => ({ ...prev, [votoId]: list }));
    }
    setOpenSympathyId(votoId);
  };

  const handleDeleteOne = async (votoId: string) => {
    if (!confirm("Deletar este voto definitivamente?")) return;
    setActingId(votoId);
    const { error } = await supabase.rpc("admin_delete_vote", { p_voto_id: votoId });
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      setVotes((prev) => prev.filter((v) => v.voto_id !== votoId));
      toast({ title: "Voto removido" });
    }
    setActingId(null);
  };

  const getRowClass = (vote: VoteRow): string => {
    if (approvedIds.has(vote.voto_id)) {
      return "border-l-4 border-l-green-500 bg-green-500/10";
    }
    if (vote.is_fraud_attempt && vote.is_original_vote) {
      // Reincident — kept but flagged
      return "border-l-4 border-l-orange-500 bg-orange-500/5";
    }
    if (vote.fingerprint && fingerprintCounts.get(vote.fingerprint)! > 1) {
      // Duplicate detected — not yet cleaned
      return "bg-destructive/10 border-l-4 border-l-destructive";
    }
    if (vote.is_suspicious) {
      return "bg-yellow-500/10 border-l-4 border-l-yellow-500";
    }
    return "";
  };

  const duplicateCount = Array.from(fingerprintCounts.values()).filter((c) => c > 1).reduce((sum, c) => sum + (c - 1), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-foreground">{votes.length}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Total Votos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-destructive">{duplicateCount}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Duplicatas Ativas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-orange-500">{votes.filter((v) => v.is_fraud_attempt).length}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Reincidentes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-yellow-500">{votes.filter((v) => v.is_suspicious).length}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Suspeitos</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={fetchVotes} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
        {duplicateCount > 0 && (
          <Button onClick={handleCleanFraud} variant="destructive" size="sm" disabled={cleaning}>
            {cleaning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Limpar {duplicateCount} Fraude{duplicateCount > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30 border border-destructive" /> Duplicata (mesmo fingerprint)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500" /> Reincidente (voto mantido)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500" /> Suspeito</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Clube</TableHead>
                  <TableHead className="text-muted-foreground">Usuário</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Localização</TableHead>
                  <TableHead className="text-muted-foreground">Fingerprint</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {votes.map((v) => {
                  const isOpen = openSympathyId === v.voto_id;
                  const sympathies = sympathyCache[v.voto_id];
                  return (
                  <>
                  <TableRow key={v.voto_id} className={`border-border ${getRowClass(v)}`}>
                    <TableCell>
                      {approvedIds.has(v.voto_id) ? (
                        <Badge variant="outline" className="border-green-600 text-green-500 text-[10px]">
                          <Check className="w-3 h-3 mr-1" /> Aprovado
                        </Badge>
                      ) : v.is_fraud_attempt ? (
                        <Badge variant="outline" className="border-orange-500 text-orange-500 text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Reincidente
                        </Badge>
                      ) : v.fingerprint && fingerprintCounts.get(v.fingerprint)! > 1 ? (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Duplicata
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-600 text-green-500 text-[10px]">
                          <Shield className="w-3 h-3 mr-1" /> OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-bold">{v.clube_nome}</TableCell>
                    <TableCell>{v.user_nome || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{v.user_email || "—"}</TableCell>
                    <TableCell className="text-xs">{[v.cidade, v.estado, v.pais].filter(Boolean).join(", ")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {v.fingerprint ? v.fingerprint.slice(0, 12) + "…" : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 border-primary/60 text-primary hover:bg-primary/10"
                          disabled={loadingSympathyId === v.voto_id}
                          onClick={() => handleToggleSympathy(v.voto_id)}
                          title="Ver clubes de simpatia"
                        >
                          {loadingSympathyId === v.voto_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Heart className="w-3.5 h-3.5 mr-1" />
                              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 border-green-600 text-green-500 hover:bg-green-500/10 hover:text-green-400"
                          disabled={actingId === v.voto_id || approvedIds.has(v.voto_id)}
                          onClick={() => handleApprove(v.voto_id)}
                          title="Aprovar voto"
                        >
                          {actingId === v.voto_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 border-destructive text-destructive hover:bg-destructive/10"
                          disabled={actingId === v.voto_id}
                          onClick={() => handleDeleteOne(v.voto_id)}
                          title="Deletar voto definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={v.voto_id + "-sym"} className="border-border bg-primary/5">
                      <TableCell colSpan={8} className="py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Heart className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground italic">Simpatias de {v.user_nome || "torcedor"}:</span>
                          {sympathies && sympathies.length > 0 ? (
                            sympathies.map((club, i) => (
                              <Badge key={i} variant="outline" className="border-primary/40 text-foreground">
                                {i + 1}º {club}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Nenhum clube de simpatia registrado.</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </>
                  );
                })}
                {votes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhum voto encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminAuditTable;
