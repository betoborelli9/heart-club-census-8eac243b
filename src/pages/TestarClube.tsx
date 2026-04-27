/**
 * [CAMINHO/ARQUIVO]: src/pages/TestarClube.tsx
 * [MÓDULO]: ADMIN MASTER — RESULTADO DO TESTE DE CLUBE
 * [DESCRIÇÃO]:
 *   Página exclusiva para o e-mail master (betoborelli9@gmail.com).
 *   Recebe ?club=<nome> via /voting?test=1 e exibe o ClubBanner + ClubIdentityCard
 *   exatamente como apareceriam no Dashboard, sem afetar o voto real do usuário.
 */

import { useEffect } from "react";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import ClubBanner from "@/components/dashboard/ClubBanner";
import ClubIdentityCard from "@/components/dashboard/ClubIdentityCard";
import { FlaskConical, ArrowLeft } from "lucide-react";

const MASTER_EMAIL = "betoborelli9@gmail.com";

export default function TestarClube() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const clubName = searchParams.get("club") || "";

  useEffect(() => {
    document.title = clubName
      ? `Testar: ${clubName} • Heart Club`
      : "Testar Clube • Heart Club";
  }, [clubName]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/60 italic">
        Carregando…
      </div>
    );
  }

  if (user.email !== MASTER_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!clubName) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4">
        <FlaskConical className="w-10 h-10 text-[#ff6200]" />
        <p className="italic text-white/70 text-center">
          Nenhum clube selecionado. Use o link <strong>TESTAR CLUBE</strong> para abrir o modo teste.
        </p>
        <Link
          to="/voting?test=1"
          className="px-4 py-2 rounded-lg bg-[#ff6200] text-black font-bold italic text-xs uppercase"
        >
          Iniciar teste
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-[#ff6200]" />
            <div>
              <h1 className="text-base font-bold italic" style={{ fontFamily: "Verdana" }}>
                MODO TESTE — {clubName.toUpperCase()}
              </h1>
              <p className="text-[11px] text-white/60 italic">
                Voto não contabilizado. Seu Clube do Coração permanece intacto.
              </p>
            </div>
          </div>
          <Link
            to="/voting?test=1"
            className="inline-flex items-center gap-1 text-xs text-[#ff6200] hover:underline italic"
          >
            <ArrowLeft className="w-3 h-3" /> testar outro
          </Link>
        </header>

        <ClubBanner clubName={clubName} pageLabel="PRÉ-VISUALIZAÇÃO" />
        <ClubIdentityCard clubName={clubName} />
      </div>
    </div>
  );
}
