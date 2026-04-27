/**
 * [CAMINHO/ARQUIVO]: src/pages/TestarClube.tsx
 * [MÓDULO]: ADMIN MASTER — TESTE DE CLUBES (sem alterar Clube do Coração)
 * [DESCRIÇÃO]:
 *   Página exclusiva para o e-mail master (betoborelli9@gmail.com).
 *   Permite buscar qualquer clube, visualizar o ClubBanner + ClubIdentityCard
 *   e, como efeito colateral, lançar o clube no clubes_cache via pipeline
 *   de busca (searchClubsWithFallback → cache/API/AI).
 *   NÃO altera o voto/clube do coração do usuário.
 */

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import ClubBanner from "@/components/dashboard/ClubBanner";
import ClubIdentityCard from "@/components/dashboard/ClubIdentityCard";
import { ClubSearchResult } from "@/lib/search-clubs";
import { FlaskConical, X } from "lucide-react";

const MASTER_EMAIL = "betoborelli9@gmail.com";

export default function TestarClube() {
  const { user } = useUser();
  const [selected, setSelected] = useState<ClubSearchResult | null>(null);

  useEffect(() => {
    document.title = "Testar Clube • Heart Club";
  }, []);

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-[#ff6200]" />
          <div>
            <h1 className="text-xl font-bold italic" style={{ fontFamily: "Verdana" }}>
              TESTAR CLUBE
            </h1>
            <p className="text-xs text-white/60 italic">
              Modo Master — visualize qualquer clube sem afetar seu Clube do Coração.
              A busca lança automaticamente o clube no <code>clubes_cache</code>.
            </p>
          </div>
        </header>

        <section className="bg-[#0f0f0f] border border-white/10 rounded-lg p-4">
          <ClubSearch onSelect={(club) => setSelected(club)} />
          {selected && (
            <div className="mt-3 flex items-center justify-between text-xs text-white/70">
              <span className="italic">
                Visualizando: <strong className="text-white">{selected.name}</strong>
              </span>
              <button
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 text-[#ff6200] hover:underline"
              >
                <X className="w-3 h-3" /> limpar
              </button>
            </div>
          )}
        </section>

        {selected && (
          <section className="space-y-4">
            <ClubBanner clubName={selected.name} pageLabel="PRÉ-VISUALIZAÇÃO" />
            <ClubIdentityCard clubName={selected.name} />
          </section>
        )}

        {!selected && (
          <p className="text-center text-white/40 italic py-12">
            Busque um clube acima para visualizar seu banner e identidade.
          </p>
        )}
      </div>
    </div>
  );
}
