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
  return "bg-white/10 text-white/70";
};

export default function AdminCorrectionsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">📝 Correções dos Torcedores</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 italic">Nenhuma correção registrada ainda.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Torcedor</TableHead>
                <TableHead>Clube</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead>De → Para</TableHead>
                <TableHead>IA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm font-bold">{r.user_display_name || "—"}</TableCell>
                  <TableCell className="text-sm">{r.clube_nome}</TableCell>
                  <TableCell className="text-xs font-mono uppercase">{r.field_name}</TableCell>
                  <TableCell className="text-xs">
                    <span className="text-white/50 line-through">{r.old_value || "—"}</span>
                    <span className="text-white/30 mx-1">→</span>
                    <span className="text-[#ff6200] font-bold">{r.applied_value || "—"}</span>
                    {r.suggested_value && r.suggested_value !== r.applied_value && (
                      <div className="text-[10px] italic text-white/40">
                        sugerido: {r.suggested_value}
                      </div>
                    )}
                    {r.ai_reasoning && (
                      <div className="text-[10px] italic text-white/50 mt-0.5">{r.ai_reasoning}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={verdictColor(r.ai_verdict)}>
                      {r.ai_verdict || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === "applied" ? "bg-emerald-600/20 text-emerald-300" : "bg-red-600/20 text-red-300"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
