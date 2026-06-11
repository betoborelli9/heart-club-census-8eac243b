/**
 * FanaticCities.tsx — Ranking público de cidades fanáticas.
 * Cruza votos por cidade com população estimada → Densidade de Torcedores.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Loader2, Flame } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";

// População estimada (IBGE 2022) para principais cidades — base para densidade
const POPULATION: Record<string, number> = {
  "São Paulo": 11451000, "Rio de Janeiro": 6211000, "Brasília": 2817000, "Salvador": 2418000,
  "Fortaleza": 2428000, "Belo Horizonte": 2315000, "Manaus": 2063000, "Curitiba": 1773000,
  "Recife": 1488000, "Goiânia": 1437000, "Belém": 1303000, "Porto Alegre": 1332000,
  "Guarulhos": 1291000, "Campinas": 1139000, "São Luís": 1037000, "Maceió": 957000,
  "Natal": 751000, "Teresina": 866000, "João Pessoa": 833000, "Cuiabá": 650000,
  "Florianópolis": 537000, "Vitória": 322000, "Aracaju": 602000, "Campo Grande": 916000,
  "Uberlândia": 713000, "Sorocaba": 687000, "Ribeirão Preto": 698000, "Niterói": 481000,
};

type Row = { name: string; votes: number };
type Ranked = Row & { population: number; density: number };

export default function FanaticCities({ limit = 15 }: { limit?: number }) {
  const [data, setData] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.rpc("get_distinct_regions" as any, { p_level: "city" });
      const rows = (r as Row[] | null) ?? [];
      const ranked: Ranked[] = rows
        .map((row) => {
          const pop = POPULATION[row.name] ?? 0;
          const density = pop > 0 ? (row.votes / pop) * 100000 : 0;
          return { ...row, population: pop, density };
        })
        .filter((r) => r.population > 0)
        .sort((a, b) => b.density - a.density)
        .slice(0, limit);
      setData(ranked);
      setLoading(false);
    })();
  }, [limit]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const max = Math.max(1, ...data.map((d) => d.density));

  return (
    <Card style={{ fontFamily: "Verdana, sans-serif" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 italic">
          <Flame className="w-5 h-5 text-primary" /> Cidades Mais Fanáticas
        </CardTitle>
        <p className="text-xs text-muted-foreground italic">Densidade = torcedores cadastrados por 100 mil habitantes</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground italic">Sem dados suficientes ainda.</p>}
        {data.map((row, i) => {
          const pct = (row.density / max) * 100;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          return (
            <div key={row.name} className="flex items-center gap-3">
              <span className="w-8 text-center text-base">{medal}</span>
              <span className="w-32 truncate text-sm font-bold italic">{row.name}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-yellow-500 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(pct, 4)}%` }}>
                  <span className="text-[10px] font-black text-black">{row.density.toFixed(1)}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-20 text-right">{row.votes} votos</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
