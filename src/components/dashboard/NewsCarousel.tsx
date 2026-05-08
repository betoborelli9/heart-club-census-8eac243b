/**
 * [ARQUIVO]: src/components/dashboard/NewsCarousel.tsx
 * [CORREÇÃO]: RESTAURAÇÃO DE FLUXO + FALLBACK VISUAL
 */
import { useEffect, useState } from "react";
import { Loader2, Zap, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function NewsCarousel({ teamName, clubLogo }: { teamName: string | null; clubLogo?: string | null }) {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      if (!teamName) return;
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("club-news", { body: { clubName: teamName } });
        setNoticias(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [teamName]);

  if (loading)
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff6200]" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <Zap className="w-4 h-4 text-[#ff6200]" />
        <h2 className="text-[11px] font-black uppercase italic tracking-widest text-white/50">Radar: {teamName}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {noticias.slice(0, 5).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-3 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
          >
            <div className="w-20 h-20 rounded-[18px] overflow-hidden shrink-0 bg-zinc-900 border border-white/5">
              {/* Fallback inteligente: se não tem foto ou é logo de portal, mostra o seu escudo do Heart Club */}
              <img
                src={
                  !item.imageUrl || item.imageUrl.includes("google") || item.imageUrl.includes("logo")
                    ? clubLogo
                    : item.imageUrl
                }
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100"
                alt=""
              />
            </div>
            <div className="flex flex-col justify-center flex-1">
              <span className="text-[8px] font-black uppercase text-[#ff6200]">{item.source}</span>
              <h3 className="text-[12px] font-bold text-white/90 leading-tight line-clamp-2 uppercase italic">
                {item.title}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
