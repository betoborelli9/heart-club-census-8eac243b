// Path: src/components/dashboard/NewsCarousel.tsx
import { motion } from "framer-motion";
import { Newspaper, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  category: string;
  imageUrl: string;
  time: string;
}

const NewsCarousel = () => {
  const { user } = useUser();
  const [teamName, setTeamName] = useState<string>("Seu Time");

  useEffect(() => {
    const getMyTeam = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      if (data?.clube_nome) setTeamName(data.clube_nome);
    };
    getMyTeam();
  }, [user]);

  // Lógica de imagens e manchetes baseadas no time de Goiânia
  const getNewsByTeam = (team: string): NewsItem[] => {
    const isVila = team.includes("Vila");
    const isGoias = team.includes("Goiás");
    
    return [
      {
        id: 1,
        title: isVila ? "OBA pulsando: Vila Nova inicia venda de ingressos para o clássico" : 
               isGoias ? "Serrinha preparada: Goiás foca em tática para subir no censo" :
               `${team} foca em recuperação para o próximo desafio`,
        summary: "A torcida promete lotar e o engajamento no Heart Club subiu 25% nas últimas horas.",
        category: "URGENTE",
        imageUrl: isVila ? "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=400" : 
                  "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=400",
        time: "5 min atrás"
      },
      {
        id: 2,
        title: `Heart Club: ${team} domina as menções em Goiânia`,
        summary: "Dados do censo mostram que a capital goiana é o novo polo de embaixadores ativos.",
        category: "CENSO",
        imageUrl: "https://images.unsplash.com/photo-1511406361295-0a5ff814c0ad?q=80&w=400",
        time: "1h atrás"
      },
      {
        id: 3,
        title: "Novos Benefícios: Resgate sua camisa de Embaixador",
        summary: "Torcedores nível Bronze de Goiânia já podem retirar o kit exclusivo no app.",
        category: "RECOMPENSA",
        imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=400",
        time: "3h atrás"
      }
    ];
  };

  const news = getNewsByTeam(teamName);

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black italic flex items-center gap-2 uppercase tracking-tighter">
            <Newspaper className="w-4 h-4" style={{ color: "var(--primary-team)" }} /> 
            Radar {teamName}
          </CardTitle>
          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Hot News</span>
          </div>
        </CardHeader>
        <CardContent>
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2">
              {news.map((item) => (
                <CarouselItem key={item.id} className="pl-2 basis-[90%] sm:basis-[48%]">
                  <div className="group cursor-pointer rounded-xl overflow-hidden border border-white/5 bg-black/40 hover:border-[var(--primary-team)]/40 transition-all duration-500">
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="text-[9px] font-black bg-black/70 backdrop-blur-md px-2 py-1 rounded border border-white/10 uppercase tracking-wider" style={{ color: "var(--primary-team)" }}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-black uppercase italic leading-tight line-clamp-2 group-hover:text-[var(--primary-team)] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                      <div className="flex items-center justify-between mt-4 opacity-60">
                        <span className="text-[9px] font-bold uppercase">{item.time}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--primary-team)]">Ler +</span>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-3 w-8 h-8 bg-black/80 border-white/10" />
            <CarouselNext className="hidden sm:flex -right-3 w-8 h-8 bg-black/80 border-white/10" />
          </Carousel>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NewsCarousel;