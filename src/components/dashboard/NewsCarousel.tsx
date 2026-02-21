import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { mockNews } from "@/data/mockDashboard";

const NewsCarousel = () => {
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" /> Últimas Notícias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2">
              {mockNews.map((news) => (
                <CarouselItem key={news.id} className="pl-2 basis-[80%] sm:basis-[45%]">
                  <div className="group cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-all duration-300">
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={news.imageUrl}
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          {news.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {news.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{news.summary}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">{news.time}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-3 w-7 h-7" />
            <CarouselNext className="hidden sm:flex -right-3 w-7 h-7" />
          </Carousel>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NewsCarousel;
