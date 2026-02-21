import { motion } from "framer-motion";
import { ShoppingBag, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockProducts } from "@/data/mockDashboard";

const Marketplace = () => {
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Loja Oficial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {mockProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="group relative rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
              >
                {product.tag && (
                  <span className="absolute top-2 right-2 z-10 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {product.tag}
                  </span>
                )}
                <div className="h-28 overflow-hidden bg-muted/30">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-2.5">
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">{product.name}</h4>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-sm font-black text-primary">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-[10px] text-muted-foreground line-through">{product.originalPrice}</span>
                    )}
                  </div>
                  <Button size="sm" className="w-full mt-2 h-7 text-[10px] font-bold gap-1">
                    Comprar <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Marketplace;
