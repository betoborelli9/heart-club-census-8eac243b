/**
 * [CAMINHO]: src/pages/Parceiro.tsx
 * [MÓDULO]: PAINEL DO PARCEIRO — página exclusiva, só para parceiro autorizado (ou admin/master).
 * Números SOMADOS do censo, atualizando sozinhos a cada 15 s ("ao vivo"). Nunca mostra dado de uma pessoa
 * (o banco só devolve somas e grupos com 3+ pessoas). As visitas por página NÃO estão aqui: só no Admin.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { animate, motion } from "framer-motion";
import { ArrowLeft, Briefcase, FileDown, Globe2, Loader2, MapPin, Megaphone, Radio, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { usePartnerStatus } from "@/hooks/usePartnerStatus";
import logo from "@/assets/logo.png";

type Item = { nome: string; n: number };
type Geo = { top: Item[]; outros: number };
type Overview = {
  gerado_em: string;
  totais: { torcedores: number; clubes: number; paises: number; cidades: number; h24: number; d7: number; d30: number };
  por_dia: { dia: string; n: number }[];
  clubes: Item[];
  paises: Geo;
  estados: Geo;
  cidades: Geo;
  genero: { resp: number; homens: number; mulheres: number; outros: number };
  idade: { resp: number; ate20: number; f21_35: number; f36_50: number; f51: number };
  profissoes: { resp: number; top: Item[] };
  embaixadores: { indicacoes: number; compartilhamentos: number };
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const fmt = (n: number) => new Intl.NumberFormat().format(n);

/** Número que "corre" até o valor novo (efeito de contador ao vivo). */
function Counter({ value, className = "" }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <span className={`tabular-nums ${className}`}>{fmt(shown)}</span>;
}

function Panel({ icon: Icon, title, children, className = "" }: { icon: typeof Users; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-5 ${className}`}>
      <p className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
        <Icon className="h-4 w-4" /> {title}
      </p>
      {children}
    </section>
  );
}

function Rows({ items, total, outros, outrosLabel }: { items: Item[]; total: number; outros?: number; outrosLabel: string }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <div className="space-y-2.5">
      {items.map((i, idx) => (
        <div key={i.nome} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-center text-[11px] font-black italic text-white/35">{idx + 1}</span>
          <span className="w-32 shrink-0 truncate text-xs text-white/85 sm:w-40" title={i.nome}>
            {i.nome}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber-300"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(3, (i.n / max) * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-black tabular-nums">
            {fmt(i.n)} <span className="text-white/40">{pct(i.n, total)}%</span>
          </span>
        </div>
      ))}
      {!!outros && outros > 0 && (
        <p className="pl-8 text-[11px] text-white/40">
          {outrosLabel}: {fmt(outros)} ({pct(outros, total)}%)
        </p>
      )}
    </div>
  );
}

/** Rosca de gênero em SVG simples. */
function Donut({ parts }: { parts: { n: number; color: string; label: string }[] }) {
  const total = parts.reduce((a, b) => a + b.n, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
        {total > 0 &&
          parts.map((p) => {
            const len = (p.n / total) * C;
            const el = (
              <circle
                key={p.label}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={p.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      <div className="space-y-1.5 text-xs">
        {parts.map((p) => (
          <p key={p.label} className="flex items-center gap-2 text-white/80">
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            {p.label} <b className="text-white">{pct(p.n, total)}%</b>
          </p>
        ))}
      </div>
    </div>
  );
}

/** Gráfico de área dos últimos 30 dias. */
function Growth({ days }: { days: { dia: string; n: number }[] }) {
  const W = 600;
  const H = 140;
  const max = Math.max(1, ...days.map((d) => d.n));
  const step = days.length > 1 ? W / (days.length - 1) : W;
  const pts = days.map((d, i) => [i * step, H - 10 - (d.n / max) * (H - 30)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6200" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff6200" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gr)" />
      <path d={line} fill="none" stroke="#ff8a3d" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4.5" fill="#fff" />}
    </svg>
  );
}

const Parceiro = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslationApp();
  const { isAuthReady, isAuthenticated } = useUser();
  const { isPartner, ready } = usePartnerStatus();
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [secs, setSecs] = useState(0);
  const fetchedAt = useRef<number>(Date.now());

  // Porteiro: só parceiro autorizado (o banco também recusa os demais)
  useEffect(() => {
    if (!isAuthReady || !ready) return;
    if (!isAuthenticated || !isPartner) navigate("/dashboard", { replace: true });
  }, [isAuthReady, ready, isAuthenticated, isPartner, navigate]);

  const load = useCallback(async () => {
    const { data: res, error } = await rpc("partner_get_overview");
    if (error || !res) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setData(res as Overview);
    fetchedAt.current = Date.now();
    setSecs(0);
  }, []);

  useEffect(() => {
    if (!isPartner) return;
    void load();
    const poll = setInterval(() => {
      if (!document.hidden) void load();
    }, 15_000);
    const tick = setInterval(() => setSecs(Math.round((Date.now() - fetchedAt.current) / 1000)), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [isPartner, load]);

  const countryName = (code: string) => {
    try {
      return new Intl.DisplayNames([language], { type: "region" }).of(code.toUpperCase()) || code;
    } catch {
      return code;
    }
  };

  if (!isAuthReady || !ready || !isPartner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const T = data?.totais;
  const outrosLabel = t("partner.others");

  return (
    <div className="min-h-screen bg-black pb-24 text-white" style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(255,98,0,.14), transparent 55%)" }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="Heart Club" className="h-9 w-9 object-contain" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Heart Club</p>
              <h1 className="truncate text-lg font-black italic uppercase leading-tight">{t("partner.p_title")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[11px] font-black uppercase text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {failed ? t("partner.reconnecting") : t("partner.live")}
              <span className="hidden font-normal normal-case text-green-300/70 sm:inline">· {t("partner.updated", { s: secs })}</span>
            </span>
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label={t("partner.back")}>
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {!data || !T ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl border border-white/10 bg-zinc-950" />
            ))}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: t("partner.k_fans"), v: T.torcedores, icon: Users, hot: true },
                { label: t("partner.k_clubs"), v: T.clubes, icon: Trophy },
                { label: t("partner.k_countries"), v: T.paises, icon: Globe2 },
                { label: t("partner.k_cities"), v: T.cidades, icon: MapPin },
              ].map((k) => (
                <div
                  key={k.label}
                  className={`rounded-3xl border p-5 ${k.hot ? "border-primary/50 bg-gradient-to-br from-primary/25 to-zinc-950" : "border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950"}`}
                >
                  <k.icon className="mb-2 h-5 w-5 text-primary" />
                  <Counter value={k.v} className="block text-4xl font-black italic leading-none sm:text-5xl" />
                  <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-white/50">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Crescimento */}
            <Panel icon={Radio} title={t("partner.growth")}>
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  { l: t("partner.new_24h"), v: T.h24 },
                  { l: t("partner.new_7d"), v: T.d7 },
                  { l: t("partner.new_30d"), v: T.d30 },
                ].map((c) => (
                  <span key={c.l} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                    <b className="text-primary">+{fmt(c.v)}</b> <span className="text-white/60">· {c.l}</span>
                  </span>
                ))}
              </div>
              <Growth days={data.por_dia} />
            </Panel>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel icon={Trophy} title={t("partner.top_clubs")}>
                <Rows items={data.clubes} total={T.torcedores} outrosLabel={outrosLabel} />
              </Panel>

              <div className="space-y-5">
                <Panel icon={Globe2} title={t("partner.countries")}>
                  <Rows
                    items={data.paises.top.map((p) => ({ ...p, nome: countryName(p.nome) }))}
                    total={T.torcedores}
                    outros={data.paises.outros}
                    outrosLabel={outrosLabel}
                  />
                </Panel>
                <Panel icon={MapPin} title={t("partner.cities")}>
                  <Rows items={data.cidades.top} total={T.torcedores} outros={data.cidades.outros} outrosLabel={outrosLabel} />
                </Panel>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Panel icon={Users} title={t("raiox.gender")}>
                {data.genero.resp > 0 ? (
                  <Donut
                    parts={[
                      { n: data.genero.homens, color: "#ff6200", label: t("raiox.men") },
                      { n: data.genero.mulheres, color: "#fcd34d", label: t("raiox.women") },
                      { n: data.genero.outros, color: "#a1a1aa", label: t("raiox.others") },
                    ]}
                  />
                ) : (
                  <p className="text-xs text-white/50">—</p>
                )}
              </Panel>
              <Panel icon={Users} title={t("raiox.age")}>
                <Rows
                  items={[
                    { nome: t("raiox.age_20"), n: data.idade.ate20 },
                    { nome: t("raiox.age_21_35"), n: data.idade.f21_35 },
                    { nome: t("raiox.age_36_50"), n: data.idade.f36_50 },
                    { nome: t("raiox.age_51"), n: data.idade.f51 },
                  ]}
                  total={data.idade.resp}
                  outrosLabel={outrosLabel}
                />
              </Panel>
              <Panel icon={Briefcase} title={t("raiox.jobs")}>
                {data.profissoes.top.length > 0 ? (
                  <Rows items={data.profissoes.top} total={data.profissoes.resp} outrosLabel={outrosLabel} />
                ) : (
                  <p className="text-xs text-white/50">{t("raiox.jobs_none")}</p>
                )}
              </Panel>
            </div>

            <Panel icon={Megaphone} title={t("partner.ambassadors")}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Counter value={data.embaixadores.indicacoes} className="block text-3xl font-black italic" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/50">{t("partner.referrals")}</p>
                </div>
                <div>
                  <Counter value={data.embaixadores.compartilhamentos} className="block text-3xl font-black italic" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/50">{t("partner.shares")}</p>
                </div>
              </div>
            </Panel>

            <Panel icon={FileDown} title={t("report.pdf_panel")}>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate("/parceiro/relatorio?s=completo")}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase italic text-white shadow-[0_0_18px_rgba(255,98,0,0.35)] hover:brightness-110"
                >
                  {t("report.pdf_full")}
                </button>
                {[
                  ["crescimento", t("partner.growth")],
                  ["clubes", t("partner.top_clubs")],
                  ["geografia", t("report.geo")],
                  ["genero", t("raiox.gender")],
                  ["idade", t("raiox.age")],
                  ["profissoes", t("raiox.jobs")],
                  ["embaixadores", t("partner.ambassadors")],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => navigate(`/parceiro/relatorio?s=${k}`)}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-bold text-white/80 hover:border-primary hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-white/40">{t("report.pdf_hint")}</p>
            </Panel>

            <p className="pt-2 text-center text-[11px] text-white/35">{t("partner.footer_note")}</p>
          </>
        )}
      </main>
    </div>
  );
};

export default Parceiro;
