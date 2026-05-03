/**
 * NeighborhoodDominance.tsx
 * Relatório de Dominância Geográfica:
 *  - Cabeçalho premium (logo + título Verdana Italic + glow neon)
 *  - Seletor de Escopo: Nacional → Estado → Cidade
 *  - Top 10 bairros (com clube líder + % dominância)
 *  - Pesquisa por CLUBE: lista bairros/cidades onde o clube tem mais votos
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Search, Trophy, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import logo from "@/assets/logo.png";
import { exportBrandedPdf } from "@/lib/pdf-export";

type DomRow = {
  estado: string;
  cidade: string;
  bairro: string;
  leader: string;
  leader_votes: number;
  total_votes: number;
  dominance_pct: number;
};

type ClubRow = {
  estado: string;
  cidade: string;
  bairro: string;
  club_votes: number;
  total_votes: number;
  leader: string;
  is_leader: boolean;
  share_pct: number;
};

const ALL = "__ALL__";

const NeighborhoodDominance = () => {
  const [rows, setRows] = useState<DomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [scopeState, setScopeState] = useState<string>(ALL);
  const [scopeCity, setScopeCity] = useState<string>(ALL);

  // Club search
  const [clubQuery, setClubQuery] = useState("");
  const [clubRows, setClubRows] = useState<ClubRow[] | null>(null);
  const [clubLoading, setClubLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_get_neighborhood_dominance", { p_limit: 500 });
      if (!error && data) setRows(data as DomRow[]);
      setLoading(false);
    })();
  }, []);

  const states = useMemo(
    () => Array.from(new Set(rows.map((r) => r.estado).filter(Boolean))).sort(),
    [rows]
  );
  const cities = useMemo(() => {
    const list = rows.filter((r) => scopeState === ALL || r.estado === scopeState);
    return Array.from(new Set(list.map((r) => r.cidade).filter(Boolean))).sort();
  }, [rows, scopeState]);

  const scoped = useMemo(
    () =>
      rows.filter(
        (r) =>
          (scopeState === ALL || r.estado === scopeState) &&
          (scopeCity === ALL || r.cidade === scopeCity)
      ),
    [rows, scopeState, scopeCity]
  );

  const filtered = scoped.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      r.cidade?.toLowerCase().includes(q) ||
      r.bairro?.toLowerCase().includes(q) ||
      r.leader?.toLowerCase().includes(q)
    );
  });

  const top10 = useMemo(
    () => [...scoped].sort((a, b) => b.total_votes - a.total_votes).slice(0, 10),
    [scoped]
  );

  const searchClub = async () => {
    if (!clubQuery.trim()) return;
    setClubLoading(true);
    const { data, error } = await supabase.rpc("admin_get_club_neighborhood_ranking", {
      p_club_name: clubQuery.trim(),
      p_state: scopeState === ALL ? null : scopeState,
      p_limit: 50,
    });
    if (!error && data) setClubRows(data as ClubRow[]);
    else setClubRows([]);
    setClubLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <div
        className="rounded-2xl p-6 flex items-center gap-4 bg-black"
        style={{
          border: "1px solid hsl(var(--primary) / 0.5)",
          boxShadow: "0 0 36px hsl(var(--primary) / 0.25), inset 0 0 24px hsl(var(--primary) / 0.08)",
        }}
      >
        <img src={logo} alt="Heart Club" className="h-12 w-12 object-contain" />
        <div>
          <h2
            className="text-2xl md:text-3xl font-black italic tracking-wide text-primary"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            Relatório de Dominância Geográfica
          </h2>
          <p className="text-xs text-muted-foreground italic">
            Top bairros, líderes locais e ranking por clube — pronto para exportação executiva.
          </p>
        </div>
      </div>

      {/* Escopo Geográfico */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Escopo</label>
          <div className="flex gap-2">
            <Select
              value={scopeState}
              onValueChange={(v) => {
                setScopeState(v);
                setScopeCity(ALL);
              }}
            >
              <SelectTrigger className="w-[180px] bg-card border-border">
                <SelectValue placeholder="Nacional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>🇧🇷 Nacional</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={scopeCity} onValueChange={setScopeCity} disabled={scopeState === ALL && cities.length > 100}>
              <SelectTrigger className="w-[200px] bg-card border-border">
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as cidades</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Input
          placeholder="Filtrar por cidade, bairro ou clube..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm bg-card border-border"
        />
        <Button size="sm" variant="outline" onClick={() => exportBrandedPdf({
          filename: `heartclub-bairros-${Date.now()}.pdf`,
          title: "Dominância Geográfica por Bairro",
          subtitle: scopeState !== ALL ? `Estado: ${scopeState}` : "Visão Nacional",
          sections: [{
            title: "Top Bairros",
            head: ["#", "Cidade", "Bairro", "Líder", "Votos", "Dominância"],
            body: scoped.slice(0, 50).map((r, i) => [i+1, r.cidade, r.bairro, r.leader, r.leader_votes, `${r.dominance_pct}%`]),
          }],
        })}>
          <FileDown className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {scoped.length} bairros no escopo
        </span>
      </div>

      {/* Top 10 Bairros */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "hsl(var(--primary) / 0.3)", boxShadow: "0 0 24px hsl(var(--primary) / 0.15)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black italic">TOP 10 — Bairros Mais Disputados</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-card/50 hover:bg-card/50">
              <TableHead className="text-primary font-black w-12">#</TableHead>
              <TableHead className="text-primary font-black">Cidade / Bairro</TableHead>
              <TableHead className="text-primary font-black">Clube Líder</TableHead>
              <TableHead className="text-primary font-black text-right">Votos</TableHead>
              <TableHead className="text-primary font-black text-right">Dominância</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top10.map((r, i) => (
              <TableRow key={`${r.estado}-${r.cidade}-${r.bairro}`}>
                <TableCell className="font-black text-primary">{i + 1}</TableCell>
                <TableCell className="text-sm">
                  <div className="font-medium">{r.bairro}</div>
                  <div className="text-xs text-muted-foreground">{r.cidade} / {r.estado}</div>
                </TableCell>
                <TableCell className="text-sm italic">{r.leader}</TableCell>
                <TableCell className="text-right text-sm">{r.total_votes}</TableCell>
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
            {top10.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">Sem dados no escopo selecionado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pesquisa por Clube */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "hsl(var(--primary) / 0.3)", boxShadow: "0 0 24px hsl(var(--primary) / 0.15)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
          <Search className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black italic">Onde meu CLUBE domina?</h3>
        </div>
        <div className="p-4 flex gap-2 flex-wrap">
          <Input
            placeholder="Digite o nome exato do clube (ex: Flamengo)"
            value={clubQuery}
            onChange={(e) => setClubQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchClub()}
            className="max-w-sm bg-background border-border"
          />
          <Button onClick={searchClub} disabled={clubLoading || !clubQuery.trim()} className="btn-orange-gradient">
            {clubLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>

        {clubRows && (
          <Table>
            <TableHeader>
              <TableRow className="bg-card/50 hover:bg-card/50">
                <TableHead className="text-primary font-black">Estado</TableHead>
                <TableHead className="text-primary font-black">Cidade</TableHead>
                <TableHead className="text-primary font-black">Bairro</TableHead>
                <TableHead className="text-primary font-black text-right">Votos do Clube</TableHead>
                <TableHead className="text-primary font-black text-right">Total</TableHead>
                <TableHead className="text-primary font-black text-right">Share</TableHead>
                <TableHead className="text-primary font-black text-center">Líder?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubRows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-muted-foreground">{r.estado}</TableCell>
                  <TableCell className="text-sm">{r.cidade}</TableCell>
                  <TableCell className="text-sm font-medium">{r.bairro}</TableCell>
                  <TableCell className="text-right text-sm">{r.club_votes}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{r.total_votes}</TableCell>
                  <TableCell className="text-right text-sm font-bold text-primary">{r.share_pct}%</TableCell>
                  <TableCell className="text-center">
                    {r.is_leader ? (
                      <span className="text-xs font-black text-primary">👑 SIM</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">não ({r.leader})</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {clubRows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">Nenhum bairro encontrado para esse clube.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Tabela completa */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "hsl(var(--primary) / 0.3)", boxShadow: "0 0 24px hsl(var(--primary) / 0.15)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black italic">Densidade por Bairro ({filtered.length})</h3>
        </div>
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
