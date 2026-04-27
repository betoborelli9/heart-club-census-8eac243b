/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubIdentityCard.tsx
 * [MÓDULO]: DASHBOARD — IDENTIDADE DO CLUBE DO CORAÇÃO
 * [DESCRIÇÃO]: Cartão com cores (2/3/4 quadradinhos), mascote, fundação,
 *              cidade, estádio, time feminino e divisão.
 *              Exibido SOMENTE para o clube do coração do torcedor.
 *              Inclui link "Corrigir dados" -> /correcao.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Trophy, Heart, Building2, Pencil } from "lucide-react";

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
  estadio_cidade: string | null;
  estadio_capacidade: number | null;
  tem_feminino: boolean | null;
  division: string | null;
}

const ColorChip = ({ hex }: { hex: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="w-12 h-12 md:w-14 md:h-14 rounded-lg border border-white/10 shadow-md"
      style={{ background: hex }}
      title={hex}
    />
    <span className="text-[9px] font-mono text-white/60 uppercase tracking-wider">{hex}</span>
  </div>
);

const InfoCell = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2.5 bg-white/5 border border-white/5 rounded-xl px-3 py-2.5">
    <Icon className="w-4 h-4 text-[#ff6200] shrink-0 mt-0.5" />
    <div className="min-w-0">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/50 italic">{label}</div>
      <div className="text-sm font-bold text-white truncate">{value}</div>
    </div>
  </div>
);

export default function ClubIdentityCard({ clubName }: Props) {
  const [data, setData] = useState<CacheRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clubes_cache")
        .select(
          "cor_primaria, cor_secundaria, cor_terciaria, cor_quarta, mascote, fundado, cidade, pais, estadio_nome, estadio_cidade, estadio_capacidade, tem_feminino, division",
        )
        .ilike("nome", clubName)
        .maybeSingle();
      if (!cancelled) {
        setData((data as CacheRow) || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 mt-4">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] h-32 animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const colors = [data.cor_primaria, data.cor_secundaria, data.cor_terciaria, data.cor_quarta]
    .map((c) => (c && /^#?[0-9a-fA-F]{6}$/.test(c.trim()) ? (c.startsWith("#") ? c : `#${c}`) : null))
    .filter(Boolean) as string[];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-4">
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs md:text-sm font-black italic uppercase tracking-[0.25em] text-white/80">
            Identidade do Clube
          </h3>
          <Link
            to="/correcao"
            className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase italic text-[#ff6200] hover:text-orange-400 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            Corrigir dados
          </Link>
        </div>

        {/* LINHA 1 — CORES */}
        {colors.length > 0 && (
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-widest text-white/50 italic mb-2">
              Cores oficiais ({colors.length})
            </div>
            <div className="flex flex-wrap gap-3">
              {colors.map((c, i) => (
                <ColorChip key={`${c}-${i}`} hex={c} />
              ))}
            </div>
          </div>
        )}

        {/* LINHA 2 — DADOS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {data.mascote && <InfoCell icon={Trophy} label="Mascote" value={data.mascote} />}
          {data.fundado && <InfoCell icon={Calendar} label="Fundação" value={String(data.fundado)} />}
          {(data.cidade || data.pais) && (
            <InfoCell
              icon={MapPin}
              label="Sede"
              value={[data.cidade, data.pais].filter(Boolean).join(", ")}
            />
          )}
          {data.estadio_nome && (
            <InfoCell
              icon={Building2}
              label="Estádio"
              value={
                data.estadio_capacidade
                  ? `${data.estadio_nome} (${data.estadio_capacidade.toLocaleString("pt-BR")})`
                  : data.estadio_nome
              }
            />
          )}
          {data.division && <InfoCell icon={Trophy} label="Divisão" value={data.division} />}
          <InfoCell
            icon={Heart}
            label="Time feminino"
            value={data.tem_feminino ? "Sim" : "Não"}
          />
        </div>

        <p className="mt-4 text-[10px] md:text-[11px] italic text-white/40 leading-relaxed">
          Encontrou algum erro nas cores, mascote, fundação ou em outro dado do seu clube?
          Clique em <span className="text-[#ff6200] font-bold">Corrigir dados</span> e nosso sistema irá conferir e ajustar.
        </p>
      </div>
    </div>
  );
}
