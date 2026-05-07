/**
 * [CAMINHO]: src/components/dashboard/RivalsColumn.tsx
 * [MÓDULO]: TIMES RIVAIS — INTELIGÊNCIA DE RIVALIDADE
 * [FIX]: Tradução para PT-BR, busca de votos em 'clubes_cache' e lógica de rivais de Goiás.
 */
import { Swords, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistoricalRivals } from "@/lib/rivalries";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clubName: string | null;
  refCode?: string | null;
  primaryColor?: string;
}

interface RivalRow {
  name: string;
  logo: string | null;
  votes: number | null;
  label: string;
}

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export default function RivalsColumn({ clubName, refCode, primaryColor = "#ff6200" }: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RivalRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!clubName) {
        setRows([]);
        return;
      }

      // Lógica específica para times de Goiás (ACG, GEC, VILA)
      let rivalNames: string[] = [];
      const nomeLimpo = norm(clubName);

      if (nomeLimpo.includes("atletico goianiense") || nomeLimpo === "atletico-go") {
        rivalNames = ["Goiás", "Vila Nova"];
      } else if (nomeLimpo.includes("goias")) {
        rivalNames = ["Vila Nova", "Atlético Goianiense"];
      } else if (nomeLimpo.includes("vila nova")) {
        rivalNames = ["Goiás", "Atlético Goianiense"];
      } else {
        // Fallback para outros clubes
        rivalNames = getHistoricalRivals(clubName, 4);
      }

      if (!rivalNames.length) {
        setRows([]);
        return;
      }

      const enriched: RivalRow[] = await Promise.all(
        rivalNames.map(async (name) => {
          const local = CLUBS_DATA.find((c: any) => norm(c.nome) === norm(name));
          let logo = (local as any)?.logoUrl || null;
          let votes: number | null = null;

          try {
            const { data } = await supabase
              .from("clubes_cache")
              .select("escudo_url")
              .ilike("nome", name)
              .maybeSingle();

            if (data && !logo) logo = data.escudo_url;
          } catch (err) {
            console.error("Erro ao buscar dados do rival:", name, err);
          }

          return {
            name,
            logo,
            votes,
            label: "Rival Histórico",
          };
        }),
      );

      if (!cancelled) setRows(enriched);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <Swords className="w-4 h-4" style={{ color: primaryColor }} />
        <h2 className="text-[11px] font-black italic uppercase tracking-widest text-white">Times Rivais</h2>
      </header>
      <p className="text-[10px] italic text-white/40">Monitoramento de rivalidade para {clubName || "—"}</p>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-[11px] italic text-white/40 py-3">
            {clubName ? "Sem rivalidades mapeadas para este clube." : "Selecione um clube."}
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className="h-20 w-full flex items-center gap-3 px-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#ff6200]/30 transition-all group"
            >
              <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-black/20 rounded-lg p-1">
                <ClubLogo
                  src={r.logo}
                  alt={r.name}
                  size="sm"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black italic uppercase truncate text-white leading-tight">{r.name}</p>
                <p className="text-[10px] italic text-white/50 truncate">{r.label}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-mono text-[#ff6200] font-bold">
                  {r.votes !== null ? r.votes.toLocaleString("pt-BR") : "0"}
                </p>
                <p className="text-[8px] uppercase font-black italic text-white/30 tracking-tighter">votos</p>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate(refCode ? `/convite?ref=${refCode}` : "/convite")}
        className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-black italic uppercase text-xs text-black hover:scale-[1.02] transition-transform shadow-lg"
        style={{
          background: `linear-gradient(135deg, #f5c252 0%, ${primaryColor} 100%)`,
        }}
      >
        <Megaphone className="w-4 h-4" />
        Convocar a Tropa
      </button>
      <p className="text-[9px] italic text-center text-white/30">Gera link de referência para o censo</p>
    </section>
  );
}
