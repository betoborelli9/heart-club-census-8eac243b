/**
 * [CAMINHO]: src/components/entrar/PopularClubs.tsx
 * [MÓDULO]: Faixa "Toque no seu time" da porta de entrada (/entrar). NÃO é ranking: não mostra ordem, votos nem número nenhum.
 * Quem chega pelo link do story não precisa digitar nada: toca no escudo do seu time e segue para entrar.
 * A busca por nome continua logo acima para qualquer clube do mundo.
 *
 * A lista é fixa (9 clubes que o Heart Club mais tem na torcida em 22/11/2026; só serve para escolher os escudos) e os escudos vêm do cadastro público de clubes.
 * Se o cadastro não responder, a faixa simplesmente não aparece (a busca continua funcionando).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { mapCacheRow, type ClubSearchResult } from "@/lib/search-clubs";

/** nome como está no cadastro de clubes → nome escrito no botão */
export const POPULAR_CLUBS: { nome: string; label: string }[] = [
  { nome: "Vila Nova", label: "Vila Nova" },
  { nome: "Rio Verde", label: "Rio Verde" },
  { nome: "Flamengo", label: "Flamengo" },
  { nome: "Atletico Goianiense", label: "Atlético-GO" },
  { nome: "Goias", label: "Goiás" },
  { nome: "Palmeiras", label: "Palmeiras" },
  { nome: "Sao Paulo", label: "São Paulo" },
  { nome: "Vasco DA Gama", label: "Vasco" },
  { nome: "Corinthians", label: "Corinthians" },
];

export function PopularClubs({ onPick }: { onPick: (club: ClubSearchResult) => void }) {
  const { t } = useTranslationApp();
  const [items, setItems] = useState<{ club: ClubSearchResult; label: string }[]>([]);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("clubes_cache").select("*").in("nome", POPULAR_CLUBS.map((p) => p.nome));
        if (error || !Array.isArray(data)) return;
        const list: { club: ClubSearchResult; label: string }[] = [];
        for (const p of POPULAR_CLUBS) {
          // se houver mais de uma linha com o mesmo nome, vale a que tem o código oficial da API de futebol
          const rows = data.filter((r: any) => r?.nome === p.nome);
          const row = rows.find((r: any) => r.api_id) ?? rows[0];
          if (row) list.push({ club: mapCacheRow(row), label: p.label });
        }
        if (!off) setItems(list);
      } catch {
        /* sem a faixa: a busca continua */
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="entrar-popular">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-white/50">{t("entrar.popular_title")}</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ club, label }) => (
          <button
            key={club.id}
            type="button"
            onClick={() => onPick(club)}
            data-testid="entrar-popular-club"
            className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-card px-1 py-3 transition-colors hover:border-white/30 active:scale-95"
          >
            <ClubLogo src={club.logo} alt={club.name} size="md" />
            <span className="w-full truncate px-1 text-center text-[11px] font-black uppercase italic">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
