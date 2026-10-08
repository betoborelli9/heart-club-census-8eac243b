import { useTranslation } from "react-i18next";
import { Tv, Landmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { isMasterEmail } from "@/lib/master";
import type { Fixture } from "@/hooks/useHeartClubFixture";
import { useMatchCardInfo } from "@/hooks/useMatchCardInfo";
import { ClubLogo } from "@/components/ClubLogo";

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Card do próximo jogo, com as cores do clube do torcedor (ou do clube pesquisado), estádio e onde assistir. */
export function MatchCountdownCard({ fixture, diffMs, teamId }: { fixture: Fixture; diffMs: number; teamId?: number | null }) {
  const { t, i18n } = useTranslation();
  const info = useMatchCardInfo(fixture, teamId);
  const { realUser, simActive } = useUser();
  // Botão só para o Beto (Master) e nunca na simulação de torcedor novo: o torcedor comum jamais vê.
  const canRemoveWatch = isMasterEmail(realUser?.email) && !simActive;

  const removeWatch = async () => {
    const { error } = await (supabase as any).rpc("admin_set_fixture_watch", { p_fixture: fixture.id, p_canais: [] });
    if (error) {
      toast.error("Não foi possível remover agora.");
      return;
    }
    info.markRemoved();
    toast.success("Onde assistir removido deste jogo.");
  };
  const dt = new Intl.DateTimeFormat(i18n.language, {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(fixture.date));

  const soft = info.textColor === "#ffffff" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)";

  return (
    <div
      className="w-full overflow-hidden rounded-2xl p-3 sm:p-4"
      style={{
        color: info.textColor,
        background: `linear-gradient(135deg, ${info.primary} 0%, ${info.primary} 62%, ${info.secondary} 160%)`,
        border: `2px solid ${info.secondary}`,
        boxShadow: `0 0 24px ${info.primary}55`,
      }}
      data-testid="match-card"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ClubLogo src={fixture.home.logo} alt={fixture.home.name} clubName={fixture.home.name} size="sm" />
          <span className="truncate text-sm font-bold sm:text-base">{fixture.home.name}</span>
        </div>
        <span className="shrink-0 text-xs font-black opacity-70">×</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-bold sm:text-base">{fixture.away.name}</span>
          <ClubLogo src={fixture.away.logo} alt={fixture.away.name} clubName={fixture.away.name} size="sm" />
        </div>
      </div>

      <p className="mt-2 text-[11px] font-semibold opacity-80 sm:text-xs">
        {fixture.league.name} • {dt}
      </p>

      <div className="mt-2 space-y-1.5 text-[11px] sm:text-xs">
        {info.stadium && (
          <p className="flex items-center gap-1.5 font-semibold" data-testid="match-stadium">
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">{info.stadium}</span>
          </p>
        )}
        {!info.hideWatch && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="match-watch">
          <Tv className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">{t("match.where_to_watch")}:</span>
          {info.canais === null ? null : info.canais.length > 0 ? (
            info.canais.map((c) => (
              <span key={c} className="rounded-full px-2 py-0.5 text-[10px] font-bold sm:text-[11px]" style={{ background: soft }}>
                {c}
              </span>
            ))
          ) : (
            <span className="opacity-70">{t("match.tbc")}</span>
          )}
          {canRemoveWatch && info.canais && info.canais.length > 0 && (
            <button
              onClick={removeWatch}
              title="Remover o onde assistir deste jogo (só você vê este botão)"
              aria-label="Remover onde assistir"
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: soft }}
            >
              <Trash2 className="h-3 w-3" /> remover
            </button>
          )}
        </div>
        )}
      </div>

      <div className="mt-3 text-center">
        <div className="text-[10px] uppercase tracking-wider opacity-75">{t("match.starts_in")}</div>
        <div className="font-mono text-xl sm:text-2xl">{fmt(diffMs)}</div>
      </div>
    </div>
  );
}
