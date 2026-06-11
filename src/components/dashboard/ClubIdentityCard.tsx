/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubIdentityCard.tsx
 * [MÓDULO]: DASHBOARD — IDENTIDADE DO CLUBE DO CORAÇÃO
 * [DESCRIÇÃO]: Cartão delicado em DUAS LINHAS FINAS e simétricas.
 *   Linha 1: quadradinhos de cores (2/3/4) centralizados.
 *   Linha 2: mascote • fundação • cidade • estádio • feminino • divisão.
 *   Exibido SOMENTE para o clube do coração do torcedor.
 *   Inclui link discreto "Corrigir dados" -> /correcao.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Trophy, Heart, Building2, Pencil, PawPrint } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";

interface Props {
  clubName: string;
}

interface CacheRow {
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  mascote: string | null;
  fundado: number | null;
  cidade: string | null;
  pais: string | null;
  estadio_nome: string | null;
  estadio_capacidade: number | null;
  tem_feminino: boolean | null;
  division: string | null;
  api_id: string | null;
}

interface ActiveComp {
  l_id: number;
  l_name: string;
}

const ColorChip = ({ hex }: { hex: string }) => (
  <div
    className="w-5 h-5 rounded-full shadow-sm"
    style={{
      background: hex,
      // contorno duplo: anel externo claro + anel interno escuro = destaca preto/branco
      boxShadow:
        "0 0 0 1px rgba(255,255,255,0.65), 0 0 0 2px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4)",
    }}
    title={hex.toUpperCase()}
  />
);

const Pill = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80 italic whitespace-nowrap">
    <Icon className="w-3.5 h-3.5 text-[#ff6200] shrink-0" />
    {children}
  </span>
);

export default function ClubIdentityCard({ clubName }: Props) {
  const [data, setData] = useState<CacheRow | null>(null);
  const [comps, setComps] = useState<ActiveComp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clubes_cache")
        .select(
          "cor_primaria, cor_secundaria, cor_terciaria, cor_quarta, mascote, fundado, cidade, pais, estadio_nome, estadio_capacidade, tem_feminino, division, api_id",
        )
        .ilike("nome", clubName)
        .maybeSingle();
      if (cancelled) return;
      const row = (data as CacheRow) || null;
      setData(row);

      // Fonte da verdade: edge function league-standings
      // Retorna apenas competições ATIVAS (com fixture futuro/ao vivo) — automático.
      try {
        const { data: ls } = await supabase.functions.invoke("league-standings", {
          body: { clubName },
        });
        const list = ((ls as any)?.competitions || [])
          .map((c: any) => ({ l_id: c.leagueId, l_name: c.leagueName }))
          .filter((c: ActiveComp) => c?.l_name);
        // dedup por leagueId
        const seen = new Set<number>();
        const uniq = list.filter((c: ActiveComp) => (seen.has(c.l_id) ? false : (seen.add(c.l_id), true)));
        if (!cancelled) setComps(uniq);
      } catch {
        if (!cancelled) setComps([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 mt-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] h-16 animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const colors = [data.cor_primaria, data.cor_secundaria, data.cor_terciaria, data.cor_quarta]
    .map((c) => (c && /^#?[0-9a-fA-F]{6}$/.test(c.trim()) ? (c.startsWith("#") ? c : `#${c}`) : null))
    .filter(Boolean) as string[];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-3">
      <div className="relative rounded-xl border border-white/5 bg-white/[0.025] px-4 py-2.5">
        {/* LINHA 1 — CORES (centralizadas) */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {colors.map((c, i) => (
            <ColorChip key={`${c}-${i}`} hex={c} />
          ))}
        </div>

        {/* LINHA 2 — DADOS (centralizados, separados por bullet) */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {data.mascote && <Pill icon={PawPrint}>{data.mascote}</Pill>}
          {data.fundado && <Pill icon={Calendar}>Fundado em {data.fundado}</Pill>}
          {(data.cidade || data.pais) && (
            <Pill icon={MapPin}>{[data.cidade, data.pais].filter(Boolean).join(", ")}</Pill>
          )}
          {data.estadio_nome && (
            <Pill icon={Building2}>
              {data.estadio_nome}
              {data.estadio_capacidade ? ` · ${data.estadio_capacidade.toLocaleString("pt-BR")}` : ""}
            </Pill>
          )}
          {comps.map((c) => (
            <Pill key={c.l_id} icon={Trophy}>{c.l_name}</Pill>
          ))}
          <Pill icon={Heart}>Feminino: {data.tem_feminino ? "Sim" : "Não"}</Pill>
        </div>

        {/* BOTÃO DE DESTAQUE — Corrigir dados */}
        <Link
          to="/correcao"
          title="Algo errado? Corrija aqui"
          className="absolute top-2 right-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase italic tracking-wider text-white bg-[#ff6200] hover:bg-[#ff7a1f] px-3 py-1.5 rounded-full shadow-[0_0_18px_rgba(255,98,0,0.55)] hover:shadow-[0_0_24px_rgba(255,98,0,0.85)] transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
          Corrigir
        </Link>
      </div>
    </div>
  );
}
