/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ CAMINHO: src/components/AddressModal.tsx                              ║
 * ║ STATUS: WAR ROOM - FILTRO DE ELITE PARA SETORES E BAIRROS            ║
 * ║ LOCALHOST: C:\Users\betob\Desktop\GitHub\heart-club                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { MapPin, Loader2, Check, Search, Navigation, ChevronRight, Heart } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 1: MOTOR GEOGRÁFICO COM FILTRO DE TERRITÓRIO
   ══════════════════════════════════════════════════════════════════════ */
function useTerritoryEngine() {
  const filterStreetTrash = (features: any[]) => {
    // Lista negra: Se o nome contiver isso, é rua/casa e nós deletamos.
    const blacklist = [
      "rua",
      "avenida",
      "ave.",
      "av.",
      "alameda",
      "travessa",
      "praça",
      "rodovia",
      "quadra",
      "lote",
      "nº",
    ];

    return features.filter((f) => {
      const name = (f.text || "").toLowerCase();
      const fullName = (f.place_name || "").toLowerCase();

      // Só aceita se não tiver termos de logradouro no nome principal
      const isStreet = blacklist.some((word) => name.includes(word));

      // No Heart Club, queremos Neighborhood ou Locality.
      // Se o Mapbox trouxer como 'address', a gente checa se o nome é puramente o bairro.
      return !isStreet;
    });
  };

  const searchPlaces = async (query: string, mode: "city" | "neighborhood", context?: any) => {
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=pt&autocomplete=true&limit=10`;

    if (mode === "city") {
      url += `&types=place`;
    } else {
      // Pedimos múltiplos tipos para não perder o "Setor Coimbra" caso ele não esteja como neighborhood
      url += `&types=neighborhood,locality,place`;
      if (context?.center) {
        const [lon, lat] = context.center;
        // Trava o GPS no raio da cidade (aprox 20km)
        url += `&proximity=${lon},${lat}&bbox=${lon - 0.2},${lat - 0.2},${lon + 0.2},${lat + 0.2}`;
      }
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      const results = mode === "neighborhood" ? filterStreetTrash(data.features || []) : data.features;
      // Garante que o usuário veja algo, mesmo que o filtro seja rigoroso
      return results.length > 0 ? results : (data.features || []).slice(0, 5);
    } catch (e) {
      return [];
    }
  };

  return { searchPlaces };
}

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 2: INTERFACE DO PORTEIRO
   ══════════════════════════════════════════════════════════════════════ */
export default function AddressModal({ open, onOpenChange, clubName, onSuccess }: any) {
  const { toast } = useToast();
  const { searchPlaces } = useTerritoryEngine();

  const [step, setStep] = useState<"detecting" | "welcome" | "searching_city" | "searching_bairro">("detecting");
  const [loading, setLoading] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const searchTimeout = useRef<any>(null);

  const handleDetection = useCallback(async () => {
    if (!navigator.geolocation) return setStep("searching_city");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,country&language=pt`,
        );
        const data = await res.json();
        const city = data.features?.find((f: any) => f.place_type.includes("place"));
        const country = data.features?.find((f: any) => f.place_type.includes("country"));

        if (city) {
          setDetectedLocation({ name: city.text, country: country?.text || "Brasil", center: city.center });
          setStep("welcome");
        } else {
          setStep("searching_city");
        }
      },
      () => setStep("searching_city"),
    );
  }, []);

  useEffect(() => {
    if (open) handleDetection();
  }, [open, handleDetection]);

  const onTypeSearch = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      if (val.length < 2) {
        setSuggestions([]);
        return;
      }
      const res = await searchPlaces(val, step === "searching_city" ? "city" : "neighborhood", selectedCity);
      setSuggestions(res);
    }, 300);
  };

  const handleFinalSave = async (feature: any) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({
          bairro: feature.text,
          cidade: selectedCity.name,
          pais: selectedCity.country,
          latitude: feature.center[1],
          longitude: feature.center[0],
          address_confirmed: true,
        })
        .eq("id", user.id);

      toast({ title: "Território Confirmado!", description: "Bem-vindo ao mapa, torcedor!" });
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md border-white/10 bg-black text-white rounded-[32px] p-0 overflow-hidden shadow-[0_0_60px_rgba(255,98,0,0.25)]">
        <div className="p-8 space-y-6">
          <header className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-[#ff6200]/10 border border-[#ff6200]/30 rounded-2xl flex items-center justify-center">
              <Heart className="text-[#ff6200] w-8 h-8 fill-[#ff6200]/20" />
            </div>
            <h2 className="text-2xl font-black italic uppercase">Onde pulsa seu coração?</h2>
            <p className="text-zinc-500 text-sm italic">
              Localize seu bairro para o mapa do <span className="text-[#ff6200] font-bold uppercase">{clubName}</span>.
            </p>
          </header>

          {step === "welcome" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-zinc-900/50 border border-[#ff6200]/20 p-6 rounded-2xl text-center">
                <p className="text-zinc-400 text-sm italic mb-1">Parece que você está em:</p>
                <p className="text-xl font-black uppercase italic text-white">{detectedLocation?.name}</p>
                <p className="text-[#ff6200] text-xs font-bold mt-4 italic">Você mora nesta cidade?</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setSelectedCity(detectedLocation);
                    setStep("searching_bairro");
                    setSearchQuery("");
                    setSuggestions([]);
                  }}
                  className="bg-[#ff6200] hover:bg-[#ff8230] text-white font-black italic uppercase h-14 rounded-2xl"
                >
                  Sim, moro aqui!
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("searching_city");
                    setSearchQuery("");
                    setSuggestions([]);
                  }}
                  className="text-zinc-500 hover:text-white uppercase font-bold text-xs h-12"
                >
                  Não, moro em outro lugar
                </Button>
              </div>
            </div>
          )}

          {(step === "searching_city" || step === "searching_bairro") && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  autoFocus
                  placeholder={
                    step === "searching_city" ? "Digite sua cidade..." : `Qual o seu bairro em ${selectedCity?.name}?`
                  }
                  className="h-16 bg-zinc-900 border-white/10 pl-12 rounded-2xl focus:border-[#ff6200] text-lg font-bold"
                  value={searchQuery}
                  onChange={(e) => onTypeSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      step === "searching_city"
                        ? (setSelectedCity({ name: item.text, country: "Brasil", center: item.center }),
                          setStep("searching_bairro"),
                          setSearchQuery(""),
                          setSuggestions([]))
                        : handleFinalSave(item)
                    }
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/40 border border-white/5 hover:border-[#ff6200]/50 hover:bg-[#ff6200]/5 rounded-xl transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-zinc-600 group-hover:text-[#ff6200]" />
                      <div>
                        <p className="font-black italic uppercase text-sm">{item.text}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.place_name}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <footer className="flex items-start gap-3 bg-[#ff6200]/5 p-4 rounded-2xl border border-[#ff6200]/10">
            <Navigation className="w-4 h-4 text-[#ff6200] shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 italic leading-tight">
              Privacidade: Sua rua nunca será pública. Apenas o bairro alimenta o censo global.
            </p>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ RODAPÉ TÉCNICO:                                                      ║
 * ║ - Ajustado filtro para permitir 'place' caso 'neighborhood' falhe    ║
 * ║ - Implementada Blacklist de termos de logradouro (Anti-Rua)          ║
 * ║ - Bbox de 0.2 para garantir cobertura total de Goiânia               ║
 * ║ - Foco no menor esforço: Seleção rápida por lista                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
