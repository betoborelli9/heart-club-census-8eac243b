/**
 * [CAMINHO]: src/components/admin/AdminCorrectionsTable.tsx
 * [MÓDULO]: ADMIN — AUDITORIA DE CORREÇÕES DE CLUBE PELOS TORCEDORES
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Row {
  id: string;
  user_display_name: string | null;
  user_email: string | null;
  clube_nome: string;
  field_name: string;
  old_value: string | null;
  suggested_value: string | null;
  applied_value: string | null;
  ai_verdict: string | null;
  ai_reasoning: string | null;
  status: string;
  created_at: string;
}

const verdictColor = (v: string | null) => {
  if (v === "confirmed") return "bg-emerald-600/20 text-emerald-300 border-emerald-600/30";
  if (v === "corrected") return "bg-amber-600/20 text-amber-300 border-amber-600/30";
  if (v === "rejected") return "bg-red-600/20 text-red-300 border-red-600/30";
  if (v === "user_override") return "bg-[#ff6200]/20 text-[#ff6200] border-[#ff6200]/30";
  return "bg-white/10 text-white/70";
};

const verdictLabel = (v: string | null) => {
  if (v === "confirmed") return "✓ Correto";
  if (v === "corrected") return "✎ IA ajustou";
  if (v === "rejected") return "✗ Torcedor errou";
  if (v === "user_override") return "★ Torcedor";
  return v || "—";
};

export default function AdminCorrectionsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyWrong, setOnlyWrong] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("club_corrections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = onlyWrong ? rows.filter((r) => r.ai_verdict === "rejected") : rows;
  const wrongCount = rows.filter((r) => r.ai_verdict === "rejected").length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-foreground">📝 Correções dos Torcedores</CardTitle>
        <button
          onClick={() => setOnlyWrong((v) => !v)}
          className={`text-xs px-3 py-1 rounded-md border transition ${
            onlyWrong
              ? "bg-red-600/30 border-red-500/50 text-red-200"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          }`}
        >
          {onlyWrong ? "Mostrar todas" : `⚠ Só erros (${wrongCount})`}
        </button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 italic">Nenhuma correção registrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Torcedor</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Clube</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead>De → Para</TableHead>
                <TableHead>Auditoria IA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const isWrong = r.ai_verdict === "rejected";
                return (
                <TableRow key={r.id} className={isWrong ? "bg-red-950/30" : ""}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm font-bold">{r.user_display_name || "—"}</TableCell>
                  <TableCell className="text-xs font-mono text-white/70">{r.user_email || "—"}</TableCell>
                  <TableCell className="text-sm">{r.clube_nome}</TableCell>
                  <TableCell className="text-xs font-mono uppercase">{r.field_name}</TableCell>
                  <TableCell className="text-xs">
                    <span className="text-white/50 line-through">{r.old_value || "—"}</span>
                    <span className="text-white/30 mx-1">→</span>
                    <span className="text-[#ff6200] font-bold">{r.applied_value || "—"}</span>
                    {r.ai_reasoning && (
                      <div className={`text-[10px] italic mt-0.5 ${isWrong ? "text-red-300" : "text-white/50"}`}>
                        {isWrong && "⚠ "}{r.ai_reasoning}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={verdictColor(r.ai_verdict)}>
                      {verdictLabel(r.ai_verdict)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
