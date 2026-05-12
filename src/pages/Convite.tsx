/**
 * 📁 src/pages/Convite.tsx
 * 🎟️ Landing de Indicação — Heart Club
 * Acessada via /convite?ref=CODIGO. Identifica quem convidou (nome + clube),
 * mostra banner de alta conversão e mantém slot fixo de patrocinador.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Sparkles, Trophy, Users, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { CLUBS_DATA, type ClubData } from "@/clubes-data";

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const Convite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get("ref") || "";

  const [inviterName, setInviterName] = useState<string | null>(null);
  const [inviterClub, setInviterClub] = useState<string | null>(null);
  const [inviterClubData, setInviterClubData] = useState<ClubData | null>(null);

  useEffect(() => {
    if (ref) {
      try {
        localStorage.setItem("hc_ref_code", ref);
        localStorage.setItem("hc_ref_at", new Date().toISOString());
      } catch {}
    }
  }, [ref]);

  /* Identifica quem convidou (por código de indicação ou user_id) */
  useEffect(() => {
    if (!ref) return;
    const load = async () => {
      // RPC pública (SECURITY DEFINER) — funciona mesmo sem auth/RLS do convidado
      const { data: rpcData } = await supabase.rpc("get_inviter_info" as any, { _ref: ref });
      const inviter = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!inviter?.nome_exibicao) return;
      setInviterName(inviter.nome_exibicao);
      // Não buscamos clube do convidador — exibimos apenas o nome.
      return;
      // eslint-disable-next-line no-unreachable
      let prof: any = null;

      const { data: voto } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", prof.id)
        .eq("is_original_vote", true)
        .maybeSingle();

      const clubName = voto?.clube_nome || null;
      setInviterClub(clubName);
      if (clubName) {
        const cd = CLUBS_DATA.find((c) => normalize(c.nome) === normalize(clubName)) ?? null;
        setInviterClubData(cd);
      }
    };
    load();
  }, [ref]);

  const ctaGo = () => navigate(ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login");

  const refShort = useMemo(() => (ref ? ref.slice(0, 8).toUpperCase() : "—"), [ref]);
  const inviterFirst = inviterName?.split(" ")[0] || "Um torcedor";

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-transparent to-black pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-3xl mx-auto px-5 py-8 space-y-8">
        {/* [SLOT FIXO DE PATROCINADOR — visível em todo acesso] */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary shrink-0">
              Parceiro Oficial
            </span>
            <span className="text-xs text-white/70 italic truncate">
              Seu negócio aqui — apoie o censo das torcidas.
            </span>
          </div>
          <a
            href="mailto:admin@heartclubapp.com?subject=Quero%20ser%20Parceiro%20Heart%20Club"
            className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline shrink-0"
          >
            Anunciar
          </a>
        </div>

        {/* [BANNER DE QUEM CONVIDOU] */}
        {ref && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border border-primary/40 p-5 md:p-6"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary) / 0.18), rgba(0,0,0,0.6) 70%)`,
              boxShadow: "0 0 40px hsl(var(--primary) / 0.25), inset 0 0 30px hsl(var(--primary) / 0.15)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-primary/60 bg-primary/10 flex items-center justify-center text-2xl font-black italic text-primary">
                {inviterFirst.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  Convite pessoal
                </p>
                <h2 className="text-xl md:text-2xl font-black italic leading-tight">
                  {inviterName ? `${inviterName} te convidou` : "Você foi convidado"} para o Heart Club.
                </h2>
              </div>
            </div>
          </motion.section>
        )}

        <motion.header
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] tracking-widest font-black text-primary uppercase">
              Convite oficial · #{refShort}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic leading-tight">
            Você foi convidado para o <span className="text-primary">Censo Sagrado</span>.
          </h1>
          <p className="text-white/70 text-base md:text-lg italic">
            1 pessoa. 1 voto. Para sempre. Mostre ao mundo qual é o seu clube de coração.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30 rounded-3xl p-6 md:p-8"
        >
          <p className="font-black italic text-xl flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> O que é o Heart Club?
          </p>
          <p className="text-white/80 text-sm md:text-base mt-2 leading-relaxed">
            O primeiro censo global de torcidas. Cada voto é único, blindado e permanente —
            nasce um mapa real de paixão pelo seu clube, bairro a bairro, país a país.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li className="flex gap-2"><Trophy className="h-4 w-4 text-primary mt-0.5" /> Ranking ao vivo do seu clube por bairro, cidade, estado e país.</li>
            <li className="flex gap-2"><Users className="h-4 w-4 text-primary mt-0.5" /> Cada voto seu reforça a torcida do seu time no mundo todo.</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-primary mt-0.5" /> Voto Sagrado: 1 pessoa = 1 voto, blindado contra fraude.</li>
            <li className="flex gap-2"><Heart className="h-4 w-4 text-primary mt-0.5" /> Além do seu time do coração, você pode escolher até 4 clubes de simpatia para completar o seu perfil torcedor.</li>
            <li className="flex gap-2"><Sparkles className="h-4 w-4 text-primary mt-0.5" /> Quem te convidou ganha pontos a cada novo torcedor.</li>
          </ul>
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-center space-y-3"
        >
          <Button
            onClick={ctaGo}
            size="lg"
            className="bg-primary text-black hover:bg-primary/90 font-black italic text-lg px-8 h-14 rounded-full"
          >
            Votar agora <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <p className="text-[11px] text-white/50 italic">
            Leva menos de 1 minuto. Seu voto fica registrado para sempre.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Convite;
