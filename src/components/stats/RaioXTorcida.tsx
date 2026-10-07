/**
 * [CAMINHO]: src/components/stats/RaioXTorcida.tsx
 * [MÓDULO]: "RAIO-X DA TORCIDA" — números SOMADOS de um clube (gênero, faixa etária, profissões, cidades).
 * Os números chegam prontos do banco (public_get_raio_x), que já aplica as regras de privacidade:
 * mínimo de 30 respostas por bloco e profissão/cidade só com 3+ pessoas. Aqui só desenhamos.
 * Público: qualquer torcedor vê o clube dele ou pesquisa outro clube. Nunca aparece dado de uma pessoa.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, CalendarRange, MapPin, ScanLine, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";

type Block<T> = ({ resp: number } & Partial<T>) | undefined;
type RaioX = {
  minimo: number;
  total_votos: number;
  genero?: Block<{ homens: number; mulheres: number; outros: number }>;
  idade?: Block<{ ate20: number; f21_35: number; f36_50: number; f51: number }>;
  profissoes?: Block<{ top: { nome: string; n: number }[]; outras: number }>;
  cidades?: Block<{ top: { nome: string; n: number }[]; outras: number }>;
};

const CACHE = new Map<string, { at: number; data: RaioX }>();
const TTL_MS = 5 * 60 * 1000;

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function Bar({ value, tone = "bg-primary" }: { value: number; tone?: string }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
      <motion.div
        className={`h-full rounded-full ${tone}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="relative mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

type Skeleton = "split" | "bands" | "list" | "cities";

/** Gráfico "esqueleto" borrado e apagado: dá a pista do que será liberado, sem mostrar número nenhum. */
function SkeletonChart({ kind }: { kind: Skeleton }) {
  const bar = (w: number, key: number, label = false) => (
    <div key={key} className="flex items-center gap-2">
      {label && <span className="h-2 w-5 rounded bg-white/40" />}
      <span className="h-2 w-16 shrink-0 rounded bg-white/50" />
      <span className="h-2 rounded-full bg-primary/70" style={{ width: `${w}%` }} />
    </div>
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none p-4 pt-10 opacity-25 blur-[3px]" data-testid="raiox-skeleton">
      {kind === "split" ? (
        <div className="space-y-3 pt-2">
          <div className="flex h-3 overflow-hidden rounded-full">
            <span className="w-[58%] bg-primary" />
            <span className="w-[36%] bg-amber-300" />
            <span className="w-[6%] bg-white/40" />
          </div>
          <div className="flex gap-4">
            <span className="h-2 w-16 rounded bg-white/50" />
            <span className="h-2 w-16 rounded bg-white/50" />
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(kind === "bands" ? [25, 70, 55, 30] : kind === "cities" ? [80, 50, 30] : [65, 45, 25]).map((w, i) => bar(w, i, kind === "cities"))}
        </div>
      )}
    </div>
  );
}

function Locked({ total, min, kind }: { total: number; min: number; kind: Skeleton }) {
  const { t } = useTranslationApp();
  const enough = total >= min;
  return (
    <>
      <SkeletonChart kind={kind} />
      <div className="relative space-y-2.5">
        <p className="text-sm font-bold text-white/85">{t("raiox.building")}</p>
        <div className="flex items-center gap-2">
          <Bar value={pct(total, min)} />
          <span className="text-[11px] font-black tabular-nums text-white/70">
            {Math.min(total, min)}/{min}
          </span>
        </div>
        <p className="text-xs text-white/55">{enough ? t("raiox.need_answers") : t("raiox.missing", { n: Math.max(0, min - total) })}</p>
      </div>
    </>
  );
}

export default function RaioXTorcida({ clubName, onRally }: { clubName: string | null; onRally?: () => void }) {
  const { t } = useTranslationApp();
  const [data, setData] = useState<RaioX | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clubName) return;
    const hit = CACHE.get(clubName);
    if (hit && Date.now() - hit.at < TTL_MS) {
      setData(hit.data);
      setFailed(false);
      return;
    }
    let alive = true;
    setData(null);
    setFailed(false);
    (async () => {
      const { data: res, error } = await supabase.rpc("public_get_raio_x" as any, { p_club: clubName });
      if (!alive) return;
      if (error || !res) {
        console.warn("[RAIO-X] não carregou:", error?.message);
        setFailed(true);
        return;
      }
      CACHE.set(clubName, { at: Date.now(), data: res as RaioX });
      setData(res as RaioX);
    })();
    return () => {
      alive = false;
    };
  }, [clubName]);

  if (!clubName || failed) return null;

  const min = data?.minimo ?? 30;
  const total = data?.total_votos ?? 0; // meta única: torcedores do clube (a mesma para os 4 quadros)

  const gender = data?.genero;
  const genderReady = !!gender && gender.homens !== undefined;
  const age = data?.idade;
  const ageReady = !!age && age.f21_35 !== undefined;
  const jobs = data?.profissoes;
  const jobsReady = !!jobs && jobs.top !== undefined;
  const cities = data?.cidades;
  const citiesReady = !!cities && cities.top !== undefined;

  const bands = ageReady
    ? [
        { key: "age_20", n: age!.ate20 ?? 0 },
        { key: "age_21_35", n: age!.f21_35 ?? 0 },
        { key: "age_36_50", n: age!.f36_50 ?? 0 },
        { key: "age_51", n: age!.f51 ?? 0 },
      ]
    : [];
  const anyLocked = !!data && !(genderReady && ageReady && jobsReady && citiesReady);
  const dominant = bands.reduce((a, b) => (b.n > a.n ? b : a), bands[0] ?? { key: "", n: -1 });

  return (
    <section className="space-y-3" aria-label="Raio-X da torcida">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-black italic uppercase tracking-wider">
            <ScanLine className="h-4 w-4 text-primary" /> {t("raiox.title")}
          </p>
          <p className="text-[11px] text-white/45">{t("raiox.note")}</p>
        </div>
        {data && (
          <p className="text-[11px] font-bold text-white/50">{t("raiox.total", { n: data.total_votos })}</p>
        )}
      </div>

      {!data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-zinc-950" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* GÊNERO */}
          <Card icon={Users} title={t("raiox.gender")}>
            {genderReady ? (
              <div className="space-y-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="bg-primary" style={{ width: `${pct(gender!.homens ?? 0, gender!.resp)}%` }} />
                  <div className="bg-amber-300" style={{ width: `${pct(gender!.mulheres ?? 0, gender!.resp)}%` }} />
                  <div className="bg-white/40" style={{ width: `${pct(gender!.outros ?? 0, gender!.resp)}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-white/80">
                    <i className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />
                    {t("raiox.men")} <b>{pct(gender!.homens ?? 0, gender!.resp)}%</b>
                  </span>
                  <span className="text-white/80">
                    <i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />
                    {t("raiox.women")} <b>{pct(gender!.mulheres ?? 0, gender!.resp)}%</b>
                  </span>
                  {(gender!.outros ?? 0) > 0 && (
                    <span className="text-white/60">
                      <i className="mr-1 inline-block h-2 w-2 rounded-full bg-white/40" />
                      {t("raiox.others")} <b>{pct(gender!.outros ?? 0, gender!.resp)}%</b>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <Locked total={total} min={min} kind="split" />
            )}
          </Card>

          {/* FAIXA ETÁRIA */}
          <Card icon={CalendarRange} title={t("raiox.age")}>
            {ageReady ? (
              <div className="space-y-2">
                {bands.map((b) => (
                  <div key={b.key} className="flex items-center gap-2">
                    <span className={`w-24 shrink-0 text-[11px] ${b.key === dominant.key ? "font-black text-primary" : "text-white/70"}`}>
                      {t(`raiox.${b.key}`)}
                    </span>
                    <Bar value={pct(b.n, age!.resp)} tone={b.key === dominant.key ? "bg-primary" : "bg-white/40"} />
                    <span className="w-9 shrink-0 text-right text-[11px] font-black tabular-nums">{pct(b.n, age!.resp)}%</span>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-white/50">
                  {t("raiox.dominant")}: <b className="text-primary">{t(`raiox.${dominant.key}`)}</b>
                </p>
              </div>
            ) : (
              <Locked total={total} min={min} kind="bands" />
            )}
          </Card>

          {/* TOP PROFISSÕES */}
          <Card icon={Briefcase} title={t("raiox.jobs")}>
            {jobsReady ? (
              (jobs!.top ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(jobs!.top ?? []).map((j) => (
                    <div key={j.nome} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 truncate text-[11px] text-white/80" title={j.nome}>
                        {j.nome}
                      </span>
                      <Bar value={pct(j.n, jobs!.resp)} />
                      <span className="w-9 shrink-0 text-right text-[11px] font-black tabular-nums">{pct(j.n, jobs!.resp)}%</span>
                    </div>
                  ))}
                  {(jobs!.outras ?? 0) > 0 && (
                    <p className="text-[11px] text-white/45">
                      {t("raiox.other_label")}: {pct(jobs!.outras ?? 0, jobs!.resp)}%
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-white/50">{t("raiox.jobs_none")}</p>
              )
            ) : (
              <Locked total={total} min={min} kind="list" />
            )}
          </Card>

          {/* PRINCIPAIS REDUTOS */}
          <Card icon={MapPin} title={t("raiox.cities")}>
            {citiesReady ? (
              (cities!.top ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(cities!.top ?? []).map((c, i) => (
                    <div key={c.nome} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-[11px] font-black italic text-white/40">#{i + 1}</span>
                      <span className="w-24 shrink-0 truncate text-[11px] text-white/80" title={c.nome}>
                        {c.nome}
                      </span>
                      <Bar value={pct(c.n, cities!.resp)} />
                      <span className="w-9 shrink-0 text-right text-[11px] font-black tabular-nums">{pct(c.n, cities!.resp)}%</span>
                    </div>
                  ))}
                  {(cities!.outras ?? 0) > 0 && (
                    <p className="text-[11px] text-white/45">
                      {t("raiox.other_label")}: {pct(cities!.outras ?? 0, cities!.resp)}%
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-white/50">{t("raiox.cities_none")}</p>
              )
            ) : (
              <Locked total={total} min={min} kind="cities" />
            )}
          </Card>
        </div>
      )}

      {anyLocked && onRally && (
        <button
          onClick={onRally}
          className="w-full rounded-2xl bg-[#ff6200] px-4 py-3.5 text-sm font-black uppercase italic tracking-wide text-white shadow-[0_0_24px_rgba(255,98,0,0.45)] transition hover:brightness-110 active:scale-[0.98]"
        >
          {t("raiox.rally_unlock")}
        </button>
      )}
    </section>
  );
}
