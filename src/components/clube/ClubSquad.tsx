/**
 * [CAMINHO]: src/components/clube/ClubSquad.tsx
 * [MÓDULO]: ELENCO do clube (aba da página do clube): técnico, jogadores por posição com foto/camisa/idade,
 * selo NOVO para quem chegou há pouco, e chegadas/saídas recentes. Dados de club-squad (cache compartilhado).
 * Mobile-first: cartões grandes para toque, sem rolagem lateral. Sem valores em dinheiro.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";

type Player = { id: number; name: string; age: number | null; number: number | null; pos: string | null; photo: string | null; isNew?: boolean };
type Move = { dir: "in" | "out"; player: string; playerId: number; date: string; type: "loan" | "return" | "signing"; club: { id: number; name: string; logo: string | null } | null };
type Squad = { teamId: number; updatedAt: string; coach: { name: string; photo: string | null; age: number | null; nationality: string | null } | null; players: Player[]; moves: Move[] };

const ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"] as const;
export const groupKey = (pos: string | null): (typeof ORDER)[number] | "Other" =>
  (ORDER as readonly string[]).includes(pos || "") ? (pos as (typeof ORDER)[number]) : "Other";

function Face({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  return src && !broken ? (
    <img src={src} alt={name} width={size} height={size} loading="lazy" onError={() => setBroken(true)} className="shrink-0 rounded-full bg-white/10 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-white/10 text-white/40" style={{ width: size, height: size }}>
      <UserRound className="h-1/2 w-1/2" />
    </span>
  );
}

export default function ClubSquad({ teamId, accent = "#ff6200" }: { teamId: number; accent?: string }) {
  const { t, language } = useTranslationApp();
  const [data, setData] = useState<Squad | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    (async () => {
      const { data: res, error: err } = await supabase.functions.invoke("club-squad", { body: { teamId } });
      if (!alive) return;
      if (err || !res || (res as any).error) return setError(true);
      setData(res as Squad);
    })();
    return () => {
      alive = false;
    };
  }, [teamId]);

  const groups = useMemo(() => {
    const g: Record<string, Player[]> = { Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [], Other: [] };
    for (const p of data?.players ?? []) g[groupKey(p.pos)].push(p);
    for (const k of Object.keys(g)) g[k].sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
    return g;
  }, [data]);

  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(language, { day: "2-digit", month: "short", year: "2-digit" }).replace(".", "");
  const moves = useMemo(() => {
    const out: Move[] = [];
    for (const m of data?.moves ?? []) {
      const dup = out.some((k) => k.playerId === m.playerId && k.dir === m.dir && Math.abs(new Date(k.date).getTime() - new Date(m.date).getTime()) < 7 * 24 * 3600 * 1000);
      if (!dup) out.push(m);
    }
    return out.slice(0, 12);
  }, [data]);

  if (error) return <p className="py-10 text-center text-sm text-white/50">{t("squad.error")}</p>;
  if (!data)
    return (
      <div className="space-y-2" data-testid="squad-loading">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.05]" />
        ))}
      </div>
    );

  return (
    <div className="space-y-5" data-testid="squad">
      {data.coach && (
        <section className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3" data-testid="squad-coach">
          <Face src={data.coach.photo} name={data.coach.name} size={56} />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
              {t("squad.coach")}
            </p>
            <p className="truncate text-base font-extrabold">{data.coach.name}</p>
            {data.coach.nationality && <p className="text-[11px] text-white/50">{data.coach.nationality}</p>}
          </div>
        </section>
      )}

      {([...ORDER, "Other"] as const).map((k) =>
        groups[k].length ? (
          <section key={k} data-testid={`squad-group-${k}`}>
            <h3 className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70">
              {t(`squad.pos_${k}`)} <span className="text-white/30">{groups[k].length}</span>
            </h3>
            <ul className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2">
              {groups[k].map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2" style={{ minHeight: 56 }}>
                  <Face src={p.photo} name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{p.name}</p>
                    <p className="text-[11px] text-white/50">{p.age != null ? t("squad.age", { n: p.age }) : ""}</p>
                  </div>
                  {p.isNew && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase text-black" style={{ background: accent }} data-testid="squad-new">
                      {t("squad.new")}
                    </span>
                  )}
                  {p.number != null && <span className="w-7 shrink-0 text-right text-lg font-black italic text-white/30">{p.number}</span>}
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {moves.length > 0 && (
        <section data-testid="squad-moves">
          <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/70">{t("squad.moves")}</h3>
          <ul className="space-y-1.5">
            {moves.map((m, i) => (
              <li key={`${m.playerId}-${m.date}-${i}`} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2" style={{ minHeight: 48 }}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.dir === "in" ? "bg-green-600/25 text-green-400" : "bg-red-600/25 text-red-400"}`}>
                  {m.dir === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{m.player}</p>
                  <p className="truncate text-[11px] text-white/50">
                    {m.dir === "in" ? t("squad.in") : t("squad.out")} · {t(`squad.kind_${m.type}`)}
                    {m.club ? ` · ${m.club.name}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-white/40">{dateFmt(m.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
