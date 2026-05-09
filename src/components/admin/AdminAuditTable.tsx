/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 CAMINHO: src/components/admin/AdminAuditTable.tsx
 * 🧠 MÓDULO: PAINEL GLOBAL DE AUDITORIA ANTIFRAUDE
 * 🔥 STATUS: PRODUÇÃO — VERSÃO 10.0
 *
 * OBJETIVO:
 * Central de auditoria administrativa do Heart Club.
 *
 * RESPONSABILIDADES:
 * - Aprovar votos
 * - Recusar votos
 * - Exibir score de fraude
 * - Detectar duplicidade
 * - Exibir comportamento suspeito
 * - Gestão de simpatias
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState, Fragment } from "react";

import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import {
  Trash2,
  RefreshCw,
  Check,
  Heart,
  XOctagon,
  MapPin,
  ShieldAlert,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

/* ═══════════════════════════════════════════════════════════
    🧩 MÓDULO 1 — TIPAGEM
   ═══════════════════════════════════════════════════════════ */

interface VoteRow {
  voto_id: string;

  clube_nome: string;

  cidade: string;

  estado: string;

  bairro?: string;

  cep?: string;

  ip_address: string | null;

  is_suspicious: boolean | null;

  user_email: string | null;

  user_nome: string | null;

  status_aprovacao?: string;

  motivo_suspicao?: string;

  fraud_score?: number;

  fraud_flags?: string[];
}

/* ═══════════════════════════════════════════════════════════
    🧠 MÓDULO 2 — COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */

const AdminAuditTable = () => {
  const [votes, setVotes] = useState<VoteRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [actingId, setActingId] = useState<string | null>(null);

  const [openSympathyId, setOpenSympathyId] = useState<string | null>(null);

  const [sympathyCache, setSympathyCache] = useState<Record<string, string[]>>({});

  const { toast } = useToast();

  /* ═══════════════════════════════════════════════════════
      🔄 FETCH
  ═══════════════════════════════════════════════════════ */

  const fetchVotes = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc("admin_get_votes_with_tracking");

    if (!error) {
      setVotes((data as unknown as VoteRow[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchVotes();
  }, []);

  /* ═══════════════════════════════════════════════════════
      ✅ APROVAÇÃO
  ═══════════════════════════════════════════════════════ */

  const handleApprove = async (id: string) => {
    setActingId(id);

    const { error } = await supabase.rpc("admin_approve_vote", {
      p_voto_id: id,
    });

    if (!error) {
      setVotes((prev) =>
        prev.map((v) =>
          v.voto_id === id
            ? {
                ...v,
                status_aprovacao: "aprovado",
                is_suspicious: false,
              }
            : v,
        ),
      );

      toast({
        title: "Voto aprovado com sucesso.",
      });
    }

    setActingId(null);
  };

  /* ═══════════════════════════════════════════════════════
      ❌ RECUSA
  ═══════════════════════════════════════════════════════ */

  const handleReject = async (id: string) => {
    setActingId(id);

    const { error } = await supabase
      .from("votos")
      .update({
        status_aprovacao: "recusado",
        is_suspicious: true,
        motivo_suspicao: "Fraude confirmada manualmente.",
      })
      .eq("id", id);

    if (!error) {
      setVotes((prev) =>
        prev.map((v) =>
          v.voto_id === id
            ? {
                ...v,
                status_aprovacao: "recusado",
                is_suspicious: true,
              }
            : v,
        ),
      );

      toast({
        title: "Voto recusado.",
      });
    }

    setActingId(null);
  };

  /* ═══════════════════════════════════════════════════════
      🗑 DELETE
  ═══════════════════════════════════════════════════════ */

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente deletar este voto?")) return;

    setActingId(id);

    const { error } = await supabase.rpc("admin_delete_vote", {
      p_voto_id: id,
    });

    if (!error) {
      setVotes((prev) => prev.filter((v) => v.voto_id !== id));

      toast({
        title: "Registro removido.",
      });
    }

    setActingId(null);
  };

  /* ═══════════════════════════════════════════════════════
      ❤️ SIMPATIAS
  ═══════════════════════════════════════════════════════ */

  const handleToggleSympathy = async (votoId: string) => {
    if (openSympathyId === votoId) {
      setOpenSympathyId(null);

      return;
    }

    if (!sympathyCache[votoId]) {
      const { data } = await supabase.rpc("admin_get_vote_sympathies", {
        p_voto_id: votoId,
      });

      const obj = (data || {}) as any;

      const list = [
        obj.sympathy_1,
        obj.sympathy_2,
        obj.sympathy_3,
        obj.sympathy_4,
      ].filter(Boolean);

      setSympathyCache((prev) => ({
        ...prev,
        [votoId]: list,
      }));
    }

    setOpenSympathyId(votoId);
  };

  /* ═══════════════════════════════════════════════════════
      🎨 RENDER
  ═══════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      <Button
        onClick={fetchVotes}
        variant="outline"
        size="sm"
        disabled={loading}
        className="font-black italic uppercase"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
        />

        Atualizar Auditoria
      </Button>

      <Card className="overflow-hidden border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/20">
              <TableHead>Status</TableHead>

              <TableHead>Torcedor</TableHead>

              <TableHead>Fraud Score</TableHead>

              <TableHead>Localização</TableHead>

              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {votes.map((v) => {
              const isOpen = openSympathyId === v.voto_id;

              const isDanger = (v.fraud_score || 0) >= 80;

              const isMedium = (v.fraud_score || 0) >= 30;

              return (
                <Fragment key={v.voto_id}>
                  <TableRow
                    className={`
                      border-border
                      transition-all

                      ${isDanger ? "bg-red-600/10 animate-pulse shadow-[0_0_20px_rgba(255,0,0,0.25)]" : ""}

                      ${isMedium && !isDanger ? "bg-yellow-500/10" : ""}
                    `}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isDanger ? (
                          <Badge className="bg-red-600 font-black animate-pulse">
                            FRAUDE ALTA
                          </Badge>
                        ) : isMedium ? (
                          <Badge className="bg-yellow-500 text-black font-black">
                            SUSPEITO
                          </Badge>
                        ) : (
                          <Badge className="bg-green-600">OK</Badge>
                        )}

                        {v.motivo_suspicao && (
                          <span className="text-[9px] uppercase text-red-400 font-bold">
                            {v.motivo_suspicao}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <p className="text-xs font-black uppercase text-primary italic">
                        {v.clube_nome}
                      </p>

                      <p className="text-[10px] font-black uppercase">
                        {v.user_nome || "Não informado"}
                      </p>

                      <p className="text-[9px] italic opacity-60">
                        {v.user_email}
                      </p>

                      <p className="text-[9px] text-cyan-500 font-mono mt-1">
                        {v.ip_address || "IP oculto"}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShieldAlert
                          size={14}
                          className={
                            isDanger
                              ? "text-red-500"
                              : isMedium
                              ? "text-yellow-400"
                              : "text-green-500"
                          }
                        />

                        <span className="font-black">
                          {v.fraud_score || 0}%
                        </span>
                      </div>

                      {!!v.fraud_flags?.length && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {v.fraud_flags.map((flag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[8px]"
                            >
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin
                          size={10}
                          className="text-muted-foreground"
                        />

                        <span className="text-[10px] font-black">
                          {v.cep || "CEP não informado"}
                        </span>
                      </div>

                      <p className="text-[9px] uppercase opacity-60">
                        {v.bairro || "Bairro"} • {v.cidade}, {v.estado}
                      </p>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggleSympathy(v.voto_id)}
                        >
                          <Heart className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-green-600 text-green-500"
                          disabled={actingId === v.voto_id}
                          onClick={() => handleApprove(v.voto_id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-red-600 text-red-500"
                          disabled={actingId === v.voto_id}
                          onClick={() => handleReject(v.voto_id)}
                        >
                          <XOctagon className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-destructive text-destructive"
                          disabled={actingId === v.voto_id}
                          onClick={() => handleDelete(v.voto_id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow className="bg-primary/5">
                      <TableCell
                        colSpan={5}
                        className="px-4 py-2 text-[10px] italic text-primary"
                      >
                        Simpatias:
                        {" "}
                        {sympathyCache[v.voto_id]?.join(", ") ||
                          "Nenhuma registrada"}
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
 * 📌 RODAPÉ TÉCNICO
 * ═══════════════════════════════════════════════════════════════
 *
 * SISTEMA IMPLEMENTADO:
 *
 * ✅ Fraud Score Visual
 * ✅ Detecção de fraude alta
 * ✅ Auditoria geográfica
 * ✅ Painel administrativo inteligente
 * ✅ Sistema modular
 * ✅ Flags detalhadas
 * ✅ Aprovação manual
 * ✅ Glow de alerta
 * ✅ Pulsação visual
 *
 * FUTURAS EVOLUÇÕES:
 *
 * 🔥 Heatmap antifraude
 * 🔥 IA comportamental
 * 🔥 Risk Timeline
 * 🔥 Device Analytics
 * 🔥 VPN Detection
 *
 * 🧠 Heart Club Admin Intelligence
 * 🔥 Borelli Defense System
 * ═══════════════════════════════════════════════════════════════
 */