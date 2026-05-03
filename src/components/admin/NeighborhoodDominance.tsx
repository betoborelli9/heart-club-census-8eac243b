/**
 * NeighborhoodDominance.tsx
 * Tabela de Densidade por Bairro: Cidade → Bairro → Clube Líder → % Dominância
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  estado: string;
  cidade: string;
  bairro: string;
  leader: string;
  leader_votes: number;
  total_votes: number;
  dominance_pct: number;
};

const NeighborhoodDominance = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_get_neighborhood_dominance", { p_limit: 200 });
      if (!error && data) setRows(data as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      r.cidade?.toLowerCase().includes(q) ||
      r.bairro?.toLowerCase().includes(q) ||
      r.leader?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-black italic">Densidade por Bairro</h3>
          <span className="text-xs text-muted-foreground">({rows.length} bairros)</span>
        </div>
        <Input
          placeholder="Filtrar por cidade, bairro ou clube..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm bg-card border-border"
        />
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "hsl(var(--primary) / 0.3)", boxShadow: "0 0 24px hsl(var(--primary) / 0.15)" }}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead className="text-primary font-black">Estado</TableHead>
              <TableHead className="text-primary font-black">Cidade</TableHead>
              <TableHead className="text-primary font-black">Bairro</TableHead>
              <TableHead className="text-primary font-black">Clube Líder</TableHead>
              <TableHead className="text-primary font-black text-right">Votos Líder</TableHead>
              <TableHead className="text-primary font-black text-right">Total</TableHead>
              <TableHead className="text-primary font-black text-right">Dominância</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs text-muted-foreground">{r.estado}</TableCell>
                <TableCell className="text-sm">{r.cidade}</TableCell>
                <TableCell className="text-sm font-medium">{r.bairro}</TableCell>
                <TableCell className="text-sm italic">{r.leader}</TableCell>
                <TableCell className="text-right text-sm">{r.leader_votes}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{r.total_votes}</TableCell>
                <TableCell className="text-right">
                  <span
                    className="inline-block px-2 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${Math.min(0.15 + r.dominance_pct / 200, 0.5)})`,
                      color: "hsl(var(--primary))",
                    }}
                  >
                    {r.dominance_pct}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8 italic">
                  Nenhum bairro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default NeighborhoodDominance;
