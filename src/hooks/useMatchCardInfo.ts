/**
 * [CAMINHO]: src/hooks/useMatchCardInfo.ts
 * [MÓDULO]: Dados extras do card do próximo jogo: cores do clube do torcedor (ou do clube pesquisado),
 * nome do estádio e onde assistir. Tudo vem do banco (clubes_cache / fixture_watch) — não chama API externa.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClubTheme } from "@/hooks/useClubTheme";
import type { Fixture } from "@/hooks/useHeartClubFixture";

type ClubRow = { cor_primaria: string | null; cor_secundaria: string | null; estadio_nome: string | null };

const HEX = /^#[0-9a-fA-F]{6}$/;
const okHex = (v?: string | null) => (v && HEX.test(v.trim()) ? v.trim() : null);

export const isLightColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
};

export function useMatchCardInfo(fixture: Fixture, teamId?: number | null) {
  // O "nosso" lado do jogo: o time do torcedor (ou o pesquisado pelo Master). Sem id, usa o mandante.
  const ours = teamId && fixture.away.id === teamId ? fixture.away : fixture.home;
  const isHome = ours.id === fixture.home.id;
  const nameTheme = useClubTheme(ours.name);
  const [club, setClub] = useState<ClubRow | null>(null);
  const [canais, setCanais] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    setClub(null);
    (async () => {
      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, estadio_nome")
        .eq("api_id", String(ours.id))
        .maybeSingle();
      if (alive) setClub((data as ClubRow) || null);
    })();
    return () => {
      alive = false;
    };
  }, [ours.id]);

  useEffect(() => {
    let alive = true;
    setCanais(null);
    (async () => {
      const { data } = await (supabase as any).from("fixture_watch").select("canais").eq("fixture_id", fixture.id).maybeSingle();
      if (alive) setCanais(Array.isArray(data?.canais) ? data.canais : []);
    })();
    return () => {
      alive = false;
    };
  }, [fixture.id]);

  const primary = okHex(club?.cor_primaria) || okHex(nameTheme.primaryHex) || "#111111";
  const secondary = okHex(club?.cor_secundaria) || okHex(nameTheme.secondaryHex) || "#ffffff";
  const light = isLightColor(primary);

  return {
    primary,
    secondary,
    textColor: light ? "#111111" : "#ffffff",
    stadium: fixture.venue || (isHome ? club?.estadio_nome || null : null),
    canais, // null = carregando; [] = ainda a confirmar
    ourName: ours.name,
  };
}
