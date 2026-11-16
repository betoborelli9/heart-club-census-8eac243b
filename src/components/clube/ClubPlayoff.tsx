/**
 * [CAMINHO]: src/components/clube/ClubPlayoff.tsx
 * [MÓDULO]: Aba PLAY-OFF da página do clube (junto de Jogos, Chances, Simular e Elenco): a tabela do play-off com os 4 clubes e a
 * chance de cada um subir, mais o detalhe de cada disputa (as duas partidas e por que um tem mais chance que o outro).
 * Dados prontos de league-prognosis (mesma consulta compartilhada da aba Chances).
 */
import { Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLeaguePrognosis } from "@/hooks/useLeaguePrognosis";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import PlayoffSection, { type PlayoffSeries } from "./PlayoffSection";
import PlayoffTable from "./PlayoffTable";

type Payload = { supported?: boolean; groups?: { teams?: any[]; playoff?: { series: PlayoffSeries[] } }[] };

export default function ClubPlayoff({ teamId, leagueId, season, accent = "#ff6200" }: { teamId: number; leagueId: number; season: number; accent?: string }) {
  const { t } = useTranslationApp();
  const navigate = useNavigate();
  const { data, error } = useLeaguePrognosis<any>(leagueId, season) as { data: Payload | null; error: boolean };

  if (error) return <p className="py-10 text-center text-sm text-white/50">{t("chances.error")}</p>;
  if (!data)
    return (
      <div className="space-y-3" data-testid="playoff-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    );
  const grp = data.groups?.find((g) => g.playoff?.series?.length) ?? null;
  if (!data.supported || !grp?.playoff) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center" data-testid="playoff-not-started">
        <Info className="mx-auto mb-2 h-6 w-6 text-white/40" />
        <p className="text-sm text-white/70">{t("playoff.not_started")}</p>
      </div>
    );
  }
  const series = grp.playoff.series;
  const teams = (grp.teams ?? []) as any[];
  return (
    <div className="space-y-4" data-testid="club-playoff">
      <PlayoffTable
        series={series}
        teams={teams}
        meTeamId={teamId}
        accent={accent}
        onOpenTeam={(id) => id !== teamId && navigate(`/clube/${id}?liga=${leagueId}&temp=${season}&aba=playoff`)}
      />
      <PlayoffSection series={series} teams={teams} teamId={teamId} accent={accent} />
    </div>
  );
}
