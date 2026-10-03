import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, RefreshCw, Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SympathyRow {
  voto_id: string;
  user_id: string | null;
  clube_coracao: string;
  clube_simpatia: string;
  slot: number;
  pais: string;
  estado: string;
  cidade: string;
  created_at: string;
  fingerprint: string | null;
  user_email: string | null;
  user_nome: string | null;
}

const slotColors: Record<number, string> = {
  1: "border-primary text-primary",
  2: "border-yellow-500 text-yellow-500",
  3: "border-blue-500 text-blue-500",
  4: "border-purple-500 text-purple-500",
};

const AdminSympathyTable = () => {
  const [rows, setRows] = useState<SympathyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [clubFilter, setClubFilter] = useState<string>("");
  const { toast } = useToast();

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_sympathy_votes");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setRows((data as unknown as SympathyRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (clubFilter && r.clube_simpatia !== clubFilter) return false;
      if (!q) return true;
      return (
        r.clube_simpatia?.toLowerCase().includes(q) ||
        r.clube_coracao?.toLowerCase().includes(q) ||
        r.user_nome?.toLowerCase().includes(q) ||
        r.user_email?.toLowerCase().includes(q) ||
        r.cidade?.toLowerCase().includes(q) ||
        r.estado?.toLowerCase().includes(q)
      );
    });
  }, [rows, query, clubFilter]);

  const topClubs = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => counts.set(r.clube_simpatia, (counts.get(r.clube_simpatia) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const uniqueUsers = useMemo(() => new Set(rows.map((r) => r.user_id)).size, [rows]);

  const exportCSV = () => {
    const header = ["Slot", "Clube Simpatia", "Clube Coração", "Usuário", "Email", "Cidade", "Estado", "País", "Data"];
    const lines = filtered.map((r) =>
      [
        r.slot,
        r.clube_simpatia,
        r.clube_coracao,
        r.user_nome ?? "",
        r.user_email ?? "",
        r.cidade ?? "",
        r.estado ?? "",
        r.pais ?? "",
        r.created_at ? new Date(r.created_at).toISOString() : "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simpatias-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-foreground">{rows.length}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Simpatias Registradas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-primary">{uniqueUsers}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Torcedores Únicos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-yellow-500">{topClubs.length}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Clubes Distintos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-blue-400 truncate">{topClubs[0]?.[0] ?? "—"}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase">Mais Citado ({topClubs[0]?.[1] ?? 0})</p>
          </CardContent>
        </Card>
      </div>

      {/* Top clubs chips */}
      {topClubs.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Top Clubes de Simpatia</p>
            <div className="flex flex-wrap gap-2">
              {topClubs.slice(0, 20).map(([club, count]) => (
                <button
                  key={club}
                  onClick={() => setClubFilter(clubFilter === club ? "" : club)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-bold transition ${
                    clubFilter === club
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground hover:border-primary"
                  }`}
                >
                  {club} <span className="opacity-70">({count})</span>
                </button>
              ))}
              {clubFilter && (
                <button
                  onClick={() => setClubFilter("")}
                  className="text-xs px-3 py-1.5 rounded-full border border-destructive text-destructive font-bold"
                >
                  Limpar filtro ✕
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={fetchRows} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
        <Button onClick={exportCSV} variant="outline" size="sm" disabled={!filtered.length}>
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por clube, torcedor, e-mail, cidade…"
            className="pl-9 bg-card border-border"
          />
        </div>
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
                  <TableHead className="text-muted-foreground">Slot</TableHead>
                  <TableHead className="text-muted-foreground">Clube de Simpatia</TableHead>
                  <TableHead className="text-muted-foreground">Coração</TableHead>
                  <TableHead className="text-muted-foreground">Usuário</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Localização</TableHead>
                  <TableHead className="text-muted-foreground">Fingerprint</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={`${r.voto_id}-${r.slot}`} className="border-border">
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${slotColors[r.slot] ?? "border-border"}`}>
                        <Heart className="w-3 h-3 mr-1" /> #{r.slot}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{r.clube_simpatia}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.clube_coracao}</TableCell>
                    <TableCell>{r.user_nome || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.user_email || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {[r.cidade, r.estado, r.pais].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {r.fingerprint ? r.fingerprint.slice(0, 12) + "…" : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhuma simpatia encontrada.
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

export default AdminSympathyTable;
