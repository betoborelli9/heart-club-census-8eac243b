/**
 * [CAMINHO]: src/components/dashboard/RivalsBlock.tsx
 * [MÓDULO]: Bloco de rivais históricos com CTA de convocação
 */
import { Swords, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getHistoricalRivals } from "@/lib/rivalries";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";

interface Props {
  clubName: string | null;
  refCode?: string | null;
  primaryColor?: string;
}

export default function RivalsBlock({ clubName, refCode, primaryColor = "#ff6200" }: Props) {
  const navigate = useNavigate();
  const rivals = clubName ? getHistoricalRivals(clubName, 4) : [];

  const findLogo = (name: string) => {
    const c = CLUBS_DATA.find((x: any) => x.nome?.toLowerCase() === name.toLowerCase());
    return (c as any)?.logoUrl || (c as any)?.escudo_url || null;
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Swords className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tight">Rivais Históricos</h2>
      </header>

      {!clubName || rivals.length === 0 ? (
        <p className="text-sm italic text-white/40 py-4">Sem rivalidades cadastradas para este clube.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rivals.map((r) => (
              <div
                key={r}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                <ClubLogo src={findLogo(r)} alt={r} size="md" />
                <span className="text-[10px] font-black uppercase italic text-center text-white">{r}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate(refCode ? `/convite?ref=${refCode}` : "/convite")}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-black italic uppercase text-sm hover:scale-[1.02] transition-transform"
            style={{ background: primaryColor, color: "#000" }}
          >
            <Megaphone className="w-4 h-4" />
            Convoque os Torcedores
          </button>
        </>
      )}
    </section>
  );
}
