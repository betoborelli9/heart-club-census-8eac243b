/**
 * [CAMINHO]: src/pages/ParceiroRelatorio.tsx
 * [MÓDULO]: RELATÓRIOS EM PDF (premium) — o navegador salva a página como PDF (botão "Salvar PDF").
 * ?s=completo | crescimento | clubes | geografia | genero | idade | profissoes | embaixadores  → parceiro/master
 * ?s=visitas&d=30 → visitas por página: SÓ admin/master (o banco recusa os demais) — o Beto envia em PDF ao parceiro.
 * Só números somados; grupos com menos de 3 pessoas nunca aparecem (garantido no banco).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
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
  cidades: Geo;
  genero: { resp: number; homens: number; mulheres: number; outros: number };
  idade: { resp: number; ate20: number; f21_35: number; f36_50: number; f51: number };
  profissoes: { resp: number; top: Item[] };
  embaixadores: { indicacoes: number; compartilhamentos: number };
};
type Visits = {
  gerado_em: string;
  dias: number;
  total: number;
  unicos: number;
  por_pagina: { pagina: string; visitas: number; unicos: number }[];
  por_dia: { dia: string; visitas: number; unicos: number }[];
  por_plataforma: { platform: string; visitas: number }[];
};

const SECTIONS = ["completo", "crescimento", "clubes", "geografia", "genero", "idade", "profissoes", "embaixadores", "visitas"] as const;
type Section = (typeof SECTIONS)[number];

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const ORANGE = "#ff6200";
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/* ───────── peças visuais (cores fixas: o PDF é sempre claro) ───────── */
function Bars({ items, total, fmt, others, othersLabel }: { items: Item[]; total: number; fmt: (n: number) => string; others?: number; othersLabel: string }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {items.map((i, idx) => (
        <div key={i.nome} style={{ display: "grid", gridTemplateColumns: "22px 150px 1fr 90px", alignItems: "center", gap: 8, fontSize: 12 }}>
          <b style={{ color: "#bbb", fontStyle: "italic" }}>{idx + 1}</b>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nome}</span>
          <div style={{ height: 10, background: "#f1f1f1", borderRadius: 6 }}>
            <div style={{ height: 10, width: `${Math.max(3, (i.n / max) * 100)}%`, background: `linear-gradient(90deg, ${ORANGE}, #ffb36b)`, borderRadius: 6 }} />
          </div>
          <span style={{ textAlign: "right" }}>
            <b>{fmt(i.n)}</b> <span style={{ color: "#999" }}>{pct(i.n, total)}%</span>
          </span>
        </div>
      ))}
      {!!others && others > 0 && (
        <p style={{ margin: 0, paddingLeft: 30, fontSize: 11, color: "#999" }}>
          {othersLabel}: {fmt(others)} ({pct(others, total)}%)
        </p>
      )}
    </div>
  );
}

function Donut({ parts }: { parts: { n: number; color: string; label: string }[] }) {
  const total = parts.reduce((a, b) => a + b.n, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg viewBox="0 0 100 100" width="170" height="170" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f1f1" strokeWidth="14" />
        {total > 0 &&
          parts.map((p) => {
            const len = (p.n / total) * C;
            const el = <circle key={p.label} cx="50" cy="50" r={R} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
            acc += len;
            return el;
          })}
      </svg>
      <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
        {parts.map((p) => (
          <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i style={{ width: 11, height: 11, borderRadius: 11, background: p.color, display: "inline-block" }} />
            {p.label} <b>{pct(p.n, total)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function Area({ points }: { points: number[] }) {
  const W = 680;
  const H = 150;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? W / (points.length - 1) : W;
  const pts = points.map((v, i) => [i * step, H - 12 - (v / max) * (H - 32)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="150" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.4" />
          <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#rg)" />
      <path d={line} fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({ v, label }: { v: string; label: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 30, fontWeight: 900, fontStyle: "italic", color: ORANGE, lineHeight: 1 }}>{v}</div>
      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#888" }}>{label}</div>
    </div>
  );
}

function Sheet({ title, children, footer, page }: { title?: string; children: React.ReactNode; footer: string; page: number }) {
  return (
    <section className="sheet">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${ORANGE}`, paddingBottom: 12, marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logo} alt="" width="30" height="30" style={{ objectFit: "contain" }} />
          <b style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: ORANGE }}>Heart Club</b>
        </div>
        {title && <b style={{ fontSize: 15, fontStyle: "italic", textTransform: "uppercase" }}>{title}</b>}
      </div>
      <div style={{ flex: 1, display: "grid", alignContent: "start", gap: 26 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa", borderTop: "1px solid #eee", paddingTop: 10 }}>
        <span>{footer}</span>
        <span>{page}</span>
      </div>
    </section>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: ORANGE }}>{children}</h3>
);

/* ───────── página ───────── */
const ParceiroRelatorio = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t, language } = useTranslationApp();
  const { isAuthReady, isAuthenticated } = useUser();
  const { isPartner, ready } = usePartnerStatus();

  const raw = params.get("s") as Section | null;
  const section: Section = raw && (SECTIONS as readonly string[]).includes(raw) ? raw : "completo";
  const days = Math.max(1, Math.min(365, Number(params.get("d")) || 30));

  const [ov, setOv] = useState<Overview | null>(null);
  const [vis, setVis] = useState<Visits | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !ready) return;
    if (!isAuthenticated || !isPartner) navigate("/dashboard", { replace: true });
  }, [isAuthReady, ready, isAuthenticated, isPartner, navigate]);

  useEffect(() => {
    if (!isPartner) return;
    let alive = true;
    (async () => {
      const { data, error: err } =
        section === "visitas" ? await rpc("admin_get_page_visits", { p_days: days }) : await rpc("partner_get_overview");
      if (!alive) return;
      if (err || !data) return setError(true);
      if (section === "visitas") setVis(data as Visits);
      else setOv(data as Overview);
    })();
    return () => {
      alive = false;
    };
  }, [isPartner, section, days]);

  const nf = useMemo(() => new Intl.NumberFormat(language), [language]);
  const fmt = (n: number) => nf.format(n);
  const dateStr = new Date().toLocaleDateString(language, { day: "2-digit", month: "long", year: "numeric" });
  const footer = `${t("report.footer")} · ${dateStr}`;

  useEffect(() => {
    const prev = document.title;
    document.title = `Heart-Club-${section}-${new Date().toISOString().slice(0, 10)}`;
    return () => {
      document.title = prev;
    };
  }, [section]);

  const countryName = (code: string) => {
    try {
      return new Intl.DisplayNames([language], { type: "region" }).of(code.toUpperCase()) || code;
    } catch {
      return code;
    }
  };

  const loading = !isAuthReady || !ready || !isPartner || (!error && !ov && !vis);

  const body = () => {
    if (error)
      return (
        <p style={{ padding: 40, textAlign: "center", color: "#777" }}>
          {section === "visitas" ? t("report.admin_only") : t("partner.reconnecting")}
        </p>
      );
    if (vis) {
      const maxPag = vis.por_pagina.map((p) => ({ nome: p.pagina, n: p.visitas }));
      return (
        <Sheet title={t("report.visits_title")} footer={footer} page={1}>
          <div>
            <h2 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase" }}>{t("report.visits_title")}</h2>
            <p style={{ margin: "6px 0 0", color: "#777", fontSize: 13 }}>{t("report.period", { d: vis.dias })}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Kpi v={fmt(vis.total)} label={t("report.total_visits")} />
            <Kpi v={fmt(vis.unicos)} label={t("report.unique_visitors")} />
          </div>
          <div>
            <H>{t("report.visits_by_day")}</H>
            <Area points={vis.por_dia.map((d) => d.visitas)} />
          </div>
          <div>
            <H>{t("report.visits_by_page")}</H>
            <Bars items={maxPag} total={vis.total} fmt={fmt} othersLabel={t("partner.others")} />
          </div>
          {vis.por_plataforma.length > 0 && (
            <div>
              <H>{t("report.visits_by_platform")}</H>
              <Bars items={vis.por_plataforma.map((p) => ({ nome: p.platform, n: p.visitas }))} total={vis.total} fmt={fmt} othersLabel={t("partner.others")} />
            </div>
          )}
        </Sheet>
      );
    }
    if (!ov) return null;

    const T = ov.totais;
    const full = section === "completo";
    const show = (s: Section) => full || section === s;
    const pages: React.ReactNode[] = [];
    let n = 0;
    const add = (title: string, content: React.ReactNode) => {
      n += 1;
      pages.push(
        <Sheet key={title + n} title={title} footer={footer} page={n + (full ? 1 : 0)}>
          {content}
        </Sheet>,
      );
    };

    if (show("crescimento"))
      add(
        t("partner.growth"),
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            <Kpi v={fmt(T.torcedores)} label={t("partner.k_fans")} />
            <Kpi v={fmt(T.clubes)} label={t("partner.k_clubs")} />
            <Kpi v={fmt(T.paises)} label={t("partner.k_countries")} />
            <Kpi v={fmt(T.cidades)} label={t("partner.k_cities")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <Kpi v={`+${fmt(T.h24)}`} label={t("partner.new_24h")} />
            <Kpi v={`+${fmt(T.d7)}`} label={t("partner.new_7d")} />
            <Kpi v={`+${fmt(T.d30)}`} label={t("partner.new_30d")} />
          </div>
          <div>
            <H>{t("partner.growth")}</H>
            <Area points={ov.por_dia.map((d) => d.n)} />
          </div>
        </>,
      );
    if (show("clubes"))
      add(
        t("partner.top_clubs"),
        <div>
          <H>{t("partner.top_clubs")}</H>
          <Bars items={ov.clubes} total={T.torcedores} fmt={fmt} othersLabel={t("partner.others")} />
        </div>,
      );
    if (show("geografia"))
      add(
        t("report.geo"),
        <>
          <div>
            <H>{t("partner.countries")}</H>
            <Bars items={ov.paises.top.map((p) => ({ ...p, nome: countryName(p.nome) }))} total={T.torcedores} fmt={fmt} others={ov.paises.outros} othersLabel={t("partner.others")} />
          </div>
          <div>
            <H>{t("partner.cities")}</H>
            <Bars items={ov.cidades.top} total={T.torcedores} fmt={fmt} others={ov.cidades.outros} othersLabel={t("partner.others")} />
          </div>
        </>,
      );
    if (show("genero"))
      add(
        t("raiox.gender"),
        <div>
          <H>{t("raiox.gender")}</H>
          {ov.genero.resp > 0 ? (
            <Donut
              parts={[
                { n: ov.genero.homens, color: ORANGE, label: t("raiox.men") },
                { n: ov.genero.mulheres, color: "#ffc27a", label: t("raiox.women") },
                { n: ov.genero.outros, color: "#bbb", label: t("raiox.others") },
              ]}
            />
          ) : (
            <p style={{ color: "#999" }}>—</p>
          )}
          <p style={{ fontSize: 11, color: "#999" }}>{t("report.based_on", { n: fmt(ov.genero.resp) })}</p>
        </div>,
      );
    if (show("idade"))
      add(
        t("raiox.age"),
        <div>
          <H>{t("raiox.age")}</H>
          <Bars
            items={[
              { nome: t("raiox.age_20"), n: ov.idade.ate20 },
              { nome: t("raiox.age_21_35"), n: ov.idade.f21_35 },
              { nome: t("raiox.age_36_50"), n: ov.idade.f36_50 },
              { nome: t("raiox.age_51"), n: ov.idade.f51 },
            ]}
            total={ov.idade.resp}
            fmt={fmt}
            othersLabel={t("partner.others")}
          />
          <p style={{ fontSize: 11, color: "#999" }}>{t("report.based_on", { n: fmt(ov.idade.resp) })}</p>
        </div>,
      );
    if (show("profissoes"))
      add(
        t("raiox.jobs"),
        <div>
          <H>{t("raiox.jobs")}</H>
          {ov.profissoes.top.length > 0 ? (
            <Bars items={ov.profissoes.top} total={ov.profissoes.resp} fmt={fmt} othersLabel={t("partner.others")} />
          ) : (
            <p style={{ color: "#999" }}>{t("raiox.jobs_none")}</p>
          )}
          <p style={{ fontSize: 11, color: "#999" }}>{t("report.based_on", { n: fmt(ov.profissoes.resp) })}</p>
        </div>,
      );
    if (show("embaixadores"))
      add(
        t("partner.ambassadors"),
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Kpi v={fmt(ov.embaixadores.indicacoes)} label={t("partner.referrals")} />
          <Kpi v={fmt(ov.embaixadores.compartilhamentos)} label={t("partner.shares")} />
        </div>,
      );

    return (
      <>
        {full && (
          <section className="sheet cover">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={logo} alt="" width="46" height="46" style={{ objectFit: "contain" }} />
              <b style={{ letterSpacing: 5, fontSize: 13, textTransform: "uppercase", color: ORANGE }}>Heart Club</b>
            </div>
            <div style={{ marginTop: "auto" }}>
              <p style={{ margin: 0, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: ORANGE, fontWeight: 800 }}>{t("report.cover_kicker")}</p>
              <h1 style={{ margin: "10px 0 0", fontSize: 54, lineHeight: 1, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase" }}>{t("report.cover_title")}</h1>
              <p style={{ margin: "18px 0 0", fontSize: 15, color: "#cfcfcf", maxWidth: 420 }}>{t("report.cover_sub")}</p>
              <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, maxWidth: 560 }}>
                {[
                  [fmt(T.torcedores), t("partner.k_fans")],
                  [fmt(T.clubes), t("partner.k_clubs")],
                  [fmt(T.paises), t("partner.k_countries")],
                  [fmt(T.cidades), t("partner.k_cities")],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 30, fontWeight: 900, fontStyle: "italic" }}>{v}</div>
                    <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: ORANGE }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ margin: "60px 0 0", fontSize: 11, color: "#888" }}>{dateStr}</p>
          </section>
        )}
        {pages}
      </>
    );
  };

  return (
    <div className="report-root">
      <style>{`
        .report-root { background:#d9d9d9; min-height:100vh; padding:20px 0 60px; color:#111; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
        .report-root .sheet { width:210mm; min-height:297mm; margin:0 auto 18px; background:#fff; padding:16mm 16mm 12mm; display:flex; flex-direction:column; box-shadow:0 6px 28px rgba(0,0,0,.22); box-sizing:border-box; break-after:page; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .report-root .cover { background:radial-gradient(ellipse at 80% 0%, rgba(255,98,0,.55), transparent 55%), #0a0a0a; color:#fff; }
        .report-toolbar { position:sticky; top:0; z-index:5; display:flex; gap:10px; justify-content:center; padding:10px; }
        .report-toolbar button { display:inline-flex; align-items:center; gap:8px; border:0; border-radius:999px; padding:10px 20px; font-weight:800; cursor:pointer; }
        @media screen and (max-width: 860px) { .report-root .sheet { zoom: .45; } }
        @media print {
          @page { size: A4; margin: 0; }
          .report-root { background:#fff; padding:0; }
          .report-root .sheet { margin:0; box-shadow:none; }
          .report-toolbar { display:none !important; }
        }
      `}</style>

      <div className="report-toolbar">
        <button onClick={() => navigate(-1)} style={{ background: "#fff", color: "#111" }}>
          <ArrowLeft size={16} /> {t("partner.back")}
        </button>
        <button onClick={() => window.print()} style={{ background: ORANGE, color: "#fff" }} disabled={loading || error}>
          <Printer size={16} /> {t("report.save_pdf")}
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        body()
      )}
    </div>
  );
};

export default ParceiroRelatorio;
