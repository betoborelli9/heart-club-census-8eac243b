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

  // Notícias dinâmicas baseadas no contexto do usuário
  const news: NewsItem[] = [
    {
      id: 1,
      title: `${teamName} prepara força tarefa para o próximo clássico`,
      summary: "Comissão técnica foca em recuperação física para manter a liderança no engajamento.",
      category: "EXCLUSIVO",
      imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=400",
      time: "10 min atrás"
    },
    {
      id: 2,
      title: "Heart Club atinge marca histórica em Goiânia",
      summary: "Censo global de torcedores registra aumento de 40% na participação local nesta semana.",
      category: "CENSO",
      imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400",
      time: "1h atrás"
    },
    {
      id: 3,
      title: "Novos benefícios para Embaixadores Bronze",
      summary: "Confira as vantagens exclusivas liberadas para quem atingiu o primeiro nível de lealdade.",
      category: "BENEFÍCIOS",
      imageUrl: "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&q=80&w=400",
      time: "3h atrás"
    }
  ];

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
      <Card className="bg-card/40 border-border/10">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black italic flex items-center gap-2 uppercase tracking-tighter">
            <Newspaper className="w-4 h-4" style={{ color: "var(--primary-team)" }} /> 
            Radar {teamName}
          </CardTitle>
          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-500 uppercase">Em Alta</span>
          </div>
        </CardHeader>
        <CardContent>
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2">
              {news.map((item) => (
                <CarouselItem key={item.id} className="pl-2 basis-[90%] sm:basis-[48%]">
                  <div className="group cursor-pointer rounded-xl overflow-hidden border border-border/10 bg-background/60 hover:border-primary/50 transition-all duration-300">
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="text-[9px] font-black bg-background/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 uppercase" style={{ color: "var(--primary-team)" }}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-black uppercase italic leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed font-medium">
                        {item.summary}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">{item.time}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--primary-team)" }}>Ler mais +</span>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-3 w-8 h-8 bg-background/80 border-border/10" />
            <CarouselNext className="hidden sm:flex -right-3 w-8 h-8 bg-background/80 border-border/10" />
          </Carousel>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NewsCarousel;