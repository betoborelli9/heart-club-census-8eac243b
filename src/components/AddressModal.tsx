/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ CAMINHO: src/components/AddressModal.tsx                              ║
 * ║ CONTEXTO: Modal de Endereço com trava geográfica e busca resiliente  ║
 * ║ LOCALHOST: C:\Users\betob\Desktop\GitHub\heart-club                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, Check, Search, Navigation, ChevronRight, Heart } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

// --- MÓDULO DE LÓGICA (HOOK) ---
function useGeoLocation() {
  const [loading, setLoading] = useState(false);

  const getCityFromCoords = async (lon: number, lat: number) => {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place,country&language=pt`,
    );
    return await res.json();
  };

  const searchPlaces = async (query: string, type: string, cityCenter?: number[]) => {
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=pt&autocomplete=true`;

    if (type === "city") {
      url += `&types=place`;
    } else {
      // Ajuste: neighborhood, locality e address para garantir que o Coimbra apareça
      url += `&types=neighborhood,locality,address`;
      if (cityCenter) {
        const [lon, lat] = cityCenter;
        url += `&proximity=${lon},${lat}&bbox=${lon - 0.3},${lat - 0.3},${lon + 0.3},${lat + 0.3}`;
      }
    }
    const res = await fetch(url);
    return await res.json();
  };

  return { getCityFromCoords, searchPlaces, loading, setLoading };
}

// --- COMPONENTE PRINCIPAL ---
export default function AddressModal({ open, onOpenChange, clubName, onSuccess }: any) {
  const { toast } = useToast();
  const { getCityFromCoords, searchPlaces, setLoading } = useGeoLocation();

  const [step, setStep] = useState<"detecting" | "welcome" | "searching_city" | "searching_bairro">("detecting");
  const [detectedLocation, setDetectedLocation] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleDetection = useCallback(async () => {
    if (!navigator.geolocation) return setStep("searching_city");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const data = await getCityFromCoords(pos.coords.longitude, pos.coords.latitude);
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
  }, [getCityFromCoords]);

  useEffect(() => {
    if (open) handleDetection();
  }, [open, handleDetection]);

  const onTypeSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }
    const data = await searchPlaces(val, step === "searching_city" ? "city" : "bairro", selectedCity?.center);
    setSuggestions(data.features || []);
  };

  const handleFinalSave = async (feature: any) => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
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

    if (!error) {
      toast({ title: "Território Confirmado!" });
      onOpenChange(false);
      onSuccess?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md border-white/10 bg-black text-white rounded-[32px] p-0 overflow-hidden shadow-[0_0_50px_rgba(255,98,0,0.3)]">
        <div className="p-8 space-y-6">
          <header className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-[#ff6200]/10 border border-[#ff6200]/30 rounded-2xl flex items-center justify-center">
              <Heart className="text-[#ff6200] w-8 h-8 fill-[#ff6200]/20" />
            </div>
            <h2 className="text-2xl font-black italic uppercase">Onde pulsa seu coração?</h2>
            <p className="text-zinc-500 text-sm italic">
              Confirme seu território no mapa do <span className="text-[#ff6200] font-bold uppercase">{clubName}</span>.
            </p>
          </header>

          {step === "detecting" && (
            <div className="py-10 flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff6200]" />
              <p className="text-sm italic text-zinc-400">Rastreando seu território...</p>
            </div>
          )}

          {step === "welcome" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
              <div className="bg-zinc-900/50 border border-[#ff6200]/20 p-6 rounded-2xl text-center">
                <p className="text-zinc-400 text-sm italic mb-1">Detectamos que você está em:</p>
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
                  className="text-zinc-500 hover:text-white uppercase font-bold text-xs"
                >
                  Não, moro em outra cidade
                </Button>
              </div>
            </div>
          )}

          {(step === "searching_city" || step === "searching_bairro") && (
            <div className="space-y-4 animate-in fade-in">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  autoFocus
                  placeholder={
                    step === "searching_city" ? "Qual a sua cidade?" : `Qual o seu bairro em ${selectedCity?.name}?`
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
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 hover:border-[#ff6200]/50 hover:bg-[#ff6200]/5 rounded-xl transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-zinc-600 group-hover:text-[#ff6200]" />
                      <div>
                        <p className="font-black italic uppercase text-sm">{item.text}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{item.place_name}</p>
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
              Sua privacidade é sagrada. O endereço nunca será público. Apenas o bairro alimentará o mapa global.
            </p>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ LOG TÉCNICO:                                                         ║
 * ║ - Ajustado filtro Mapbox para (neighborhood, locality, address)      ║
 * ║ - Implementado useGeoLocation Hook para separação de lógica          ║
 * ║ - Corrigido bug de sugestão única (agora sempre exibe o box)         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
