/**
 * [CAMINHO]: src/components/store/AffiliateStore.tsx
 * [STATUS]: PRODUÇÃO - v1.0
 * [CONTEXTO]: Loja do Torcedor — Marketplace de Afiliados dinâmico baseado no
 * Clube Principal + 4 Simpatias. Placeholders para Nike / Centauro / Netshoes
 * com tracking ID do Heart Club (?ref=heartclub-{userId}).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { ClubLogo } from "@/components/ClubLogo";
import { useClubLogos, normalizeClubName } from "@/lib/club-logo-resolver";
import { ShoppingBag, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const HEART_REF = "heartclub";

type Vote = {
  clube_nome: string;
  sympathy_1: string | null;
  sympathy_2: string | null;
  sympathy_3: string | null;
  sympathy_4: string | null;
};

type Partner = { id: string; name: string; build: (q: string) => string };

const PARTNERS: Partner[] = [
  { id: "nike", name: "Nike", build: (q) => `https://www.nike.com.br/nk/search?w=${encodeURIComponent(q)}&utm_source=${HEART_REF}` },
  { id: "centauro", name: "Centauro", build: (q) => `https://www.centauro.com.br/busca?q=${encodeURIComponent(q)}&utm_source=${HEART_REF}` },
  { id: "netshoes", name: "Netshoes", build: (q) => `https://www.netshoes.com.br/busca?nsCat=Natural&q=${encodeURIComponent(q)}&utm_source=${HEART_REF}` },
];

export default function AffiliateStore() {
  const { user } = useUser();
  const [vote, setVote] = useState<Vote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("votos")
        .select("clube_nome,sympathy_1,sympathy_2,sympathy_3,sympathy_4")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      setVote(data as Vote | null);
      setLoading(false);
    })();
  }, [user]);

  const trackClick = async (partnerId: string, partnerName: string, clubName: string) => {
    try {
      await supabase.from("partner_clicks").insert({
        partner_id: partnerId,
        partner_name: partnerName,
        user_id: user?.id ?? null,
        referrer_url: `${clubName}|${window.location.pathname}`,
      });
    } catch {}
  };

  const allClubNames = vote
    ? [vote.clube_nome, vote.sympathy_1, vote.sympathy_2, vote.sympathy_3, vote.sympathy_4]
        .filter((c): c is string => Boolean(c && c.trim()))
    : [];
  const clubLogoMap = useClubLogos(allClubNames);

  if (loading) return null;
  if (!vote) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
        <ShoppingBag className="w-8 h-8 text-primary/40 mx-auto mb-2" />
        <p className="italic opacity-60 text-sm">Vote em seu clube para abrir a Loja do Torcedor.</p>
      </div>
    );
  }

  const clubs = allClubNames;

  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-black via-zinc-950 to-black p-5 shadow-[0_0_30px_rgba(255,98,0,0.12)]">
      <header className="flex items-center gap-2 mb-1">
        <ShoppingBag className="text-primary w-5 h-5" />
        <h2 className="text-lg font-black italic uppercase tracking-tight">Loja do Torcedor</h2>
      </header>
      <p className="text-[11px] italic opacity-60 mb-4">
        Produtos selecionados para você — baseado no seu clube e nas suas {clubs.length - 1} simpatias.
      </p>

      <div className="space-y-4">
        {clubs.map((clubName, idx) => (
          <div key={clubName} className={`rounded-xl border p-3 ${idx === 0 ? "border-primary bg-primary/5" : "border-white/10 bg-white/5"}`}>
            <div className="flex items-center gap-3 mb-2">
              <ClubLogo src={clubLogoMap[normalizeClubName(clubName)]} alt={clubName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-black italic text-sm truncate uppercase">{clubName}</p>
                <p className="text-[9px] opacity-60 uppercase font-bold flex items-center gap-1">
                  {idx === 0 ? <><Sparkles size={9} className="text-primary" /> Coração</> : `Simpatia ${idx}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PARTNERS.map((p) => (
                <a
                  key={p.id}
                  href={p.build(`camisa ${clubName}`)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() => trackClick(p.id, p.name, clubName)}
                  className="rounded-lg border border-white/10 bg-black/60 hover:border-primary hover:bg-primary/10 transition-all px-2 py-2 text-center group"
                >
                  <p className="text-[10px] font-black italic uppercase tracking-tight group-hover:text-primary">{p.name}</p>
                  <p className="text-[8px] opacity-50 flex items-center justify-center gap-0.5 mt-0.5">
                    Camisa <ExternalLink size={8} />
                  </p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] italic opacity-40 mt-3 text-center">
        Heart Club recebe comissão sobre vendas geradas — sem custo extra para você.
      </p>
    </section>
  );
}
