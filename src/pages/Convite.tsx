/**
 * 📁 src/pages/Convite.tsx
 * 🎟️ Landing de Indicação — Heart Club
 * Acessada via /convite?ref=USER_ID. Guarda o ref no localStorage para
 * ser convertido após o voto (lógica de pontos do indicador).
 */

import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Sparkles, Trophy, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Convite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get("ref") || "";

  useEffect(() => {
    if (ref) {
      try {
        localStorage.setItem("hc_ref_code", ref);
        localStorage.setItem("hc_ref_at", new Date().toISOString());
      } catch {}
    }
  }, [ref]);

  const ctaGo = () => navigate("/login");

  const refShort = useMemo(() => (ref ? ref.slice(0, 8).toUpperCase() : "—"), [ref]);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-transparent to-black pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-3xl mx-auto px-5 py-14 space-y-10">
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
