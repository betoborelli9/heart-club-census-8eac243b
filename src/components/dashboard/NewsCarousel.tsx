// Path: src/components/dashboard/NewsCarousel.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface NewsCarouselProps {
  teamName: string;
}

const NewsCarousel = ({ teamName }: NewsCarouselProps) => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealNews = async () => {
      if (!teamName) return;
      setLoading(true);
      
      try {
        // Buscando via Google News RSS (convertido para JSON via RSS2JSON)
        // Filtramos pelo nome do clube para garantir veracidade
        const query = encodeURIComponent(`${teamName} futebol`);
        const rssUrl = `https://news.google.com/rss/search?q=${query}+when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          // Formatamos os dados para o nosso layout
          const formattedNews = data.items.slice(0, 6).map((item: any) => ({
            title: item.title.split(" - ")[0], // Remove o nome do site do título
            source: item.author || "Portal de Notícias",
            link: item.link,
            time: new Date(item.pubDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            // Como RSS não traz imagem fácil, usamos uma de estádio genérica de alta qualidade
            img: `https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800` 
          }));
          setNews(formattedNews);
        }
      } catch (error) {
        console.error("Erro ao carregar notícias reais:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealNews();
  }, [teamName]);

  if (loading) return (
    <div className="h-[300px] flex flex-col items-center justify-center bg-zinc-900/20 rounded-3xl border border-white/5">
      <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Buscando notícias verídicas...</span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
        <CardHeader className="pb-4 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black italic flex items-center gap-2 uppercase tracking-tighter">
            <Newspaper className="w-4 h-4 text-red-600" /> 
            Radar de Notícias: {teamName}
          </CardTitle>
          <div className="px-2 py-1 bg-red-600/10 border border-red-600/20 rounded-md">
             <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Tempo Real</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Carousel className="w-full">
            <CarouselContent>
              {news.map((item, index) => (
                <CarouselItem key={index}>
                  <div className="relative h-[320px] w-full group cursor-pointer">
                    <img src={item.img} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000" alt="Estádio" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/60 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 p-8 w-full">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black bg-red-600 px-2 py-0.5 rounded text-white uppercase tracking-tighter">
                          {item.source}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase">
                          <Clock className="w-3 h-3" /> {item.time}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black italic uppercase leading-none tracking-tighter text-white mb-4 line-clamp-2">
                        {item.title}
                      </h3>
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors"
                      >
                        Ler matéria completa <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4 bg-black/50 border-white/10" />
            <CarouselNext className="right-4 bg-black/50 border-white/10" />
          </Carousel>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NewsCarousel;