/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ CAMINHO: src/components/AddressModal.tsx                              ║
 * ║ STATUS: WAR ROOM EDITION - GLOBAL & INTELLIGENT                      ║
 * ║ VERSÃO: v7.0.0 (Beto Borelli Edition)                                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, Globe, Check, Search, Navigation, X, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 1 — CONFIGURAÇÕES E TOKENS
   ══════════════════════════════════════════════════════════════════════ */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 2 — COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════ */
export default function AddressModal({ open, onOpenChange, clubName, onSuccess }: any) {
  const { toast } = useToast();
  const [step, setStep] = useState<"detecting" | "welcome" | "searching_city" | "searching_bairro">("detecting");
  const [loading, setLoading] = useState(false);

  // Estados de Localização
  const [detectedLocation, setDetectedLocation] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  /* ══════════════════════════════════════════════════════════════════════
     MÓDULO 3 — DETECÇÃO PROATIVA (IP/GPS)
     ══════════════════════════════════════════════════════════════════════ */
  const detectLocation = useCallback(async () => {
    setStep("detecting");
    if (!navigator.geolocation) {
      setStep("searching_city");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,country`,
          );
          const data = await res.json();
          const city = data.features.find((f: any) => f.place_type.includes("place"));
          const country = data.features.find((f: any) => f.place_type.includes("country"));

          if (city) {
            setDetectedLocation({
              name: city.text,
              full: city.place_name,
              country: country?.text || "",
              center: city.center,
            });
            setStep("welcome");
          } else {
            setStep("searching_city");
          }
        } catch (e) {
          setStep("searching_city");
        }
      },
      () => setStep("searching_city"),
    );
  }, []);

  useEffect(() => {
    if (open) detectLocation();
  }, [open, detectLocation]);

  /* ══════════════════════════════════════════════════════════════════════
     MÓDULO 4 — BUSCA GLOBAL (CIDADES E BAIRROS)
     ══════════════════════════════════════════════════════════════════════ */
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSuggestions([]);
      return;
    }

    const type = step === "searching_city" ? "place" : "neighborhood,locality";
    const proximity = selectedCity ? `&proximity=${selectedCity.center[0]},${selectedCity.center[1]}` : "";

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${MAPBOX_TOKEN}&types=${type}${proximity}&language=pt`,
      );
      const data = await res.json();
      setSuggestions(data.features);
    } catch (e) {
      console.error(e);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
     MÓDULO 5 — PERSISTÊNCIA FINAL (SUPABASE)
     ══════════════════════════════════════════════════════════════════════ */
  const confirmFinalAddress = async (bairroFeature: any) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        bairro: bairroFeature.text,
        cidade: selectedCity.name,
        pais: selectedCity.country,
        latitude: bairroFeature.center[1],
        longitude: bairroFeature.center[0],
        address_confirmed: true,
      };

      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;

      toast({ title: "Território Confirmado!", description: "Seja bem-vindo ao mapa global." });
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md border-white/10 bg-black text-white rounded-[32px] p-0 overflow-hidden shadow-[0_0_50px_rgba(255,98,0,0.2)]">
        <div className="p-8 space-y-6">
          {/* HEADER WAR ROOM */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-[#ff6200]/10 border border-[#ff6200]/30 rounded-2xl flex items-center justify-center">
              <Globe className="text-[#ff6200] w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Território do Coração</h2>
            <p className="text-zinc-500 text-sm italic">
              O mapa do <span className="text-[#ff6200] font-bold uppercase">{clubName || "Seu Clube"}</span> começa
              aqui.
            </p>
          </div>

          {/* ESTADO 1: DETECTANDO */}
          {step === "detecting" && (
            <div className="py-10 flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff6200]" />
              <p className="text-sm italic text-zinc-400">Rastreando localização global...</p>
            </div>
          )}

          {/* ESTADO 2: BOAS-VINDAS (Goiânia?) */}
          {step === "welcome" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl text-center">
                <p className="text-lg">
                  Vimos que você está em <br />
                  <span className="text-[#ff6200] font-black uppercase text-xl">{detectedLocation?.name}</span>?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => {
                    setSelectedCity(detectedLocation);
                    setStep("searching_bairro");
                    setSearchQuery("");
                  }}
                  className="bg-[#ff6200] hover:bg-[#ff8230] text-white font-black italic uppercase h-14 rounded-2xl"
                >
                  Sim, moro aqui
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
                  Não, moro em outro lugar
                </Button>
              </div>
            </div>
          )}

          {/* ESTADO 3: BUSCA DE CIDADE OU BAIRRO */}
          {(step === "searching_city" || step === "searching_bairro") && (
            <div className="space-y-4 animate-in fade-in">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  autoFocus
                  placeholder={
                    step === "searching_city"
                      ? "Em qual cidade você mora?"
                      : `Qual o seu bairro em ${selectedCity?.name}?`
                  }
                  className="h-16 bg-zinc-900 border-white/10 pl-12 rounded-2xl focus:border-[#ff6200] transition-all text-lg font-bold"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* BOX DE SUGESTÕES (Estilo Busca de Clubes) */}
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (step === "searching_city") {
                        setSelectedCity({
                          name: item.text,
                          full: item.place_name,
                          country: item.context?.find((c: any) => c.id.includes("country"))?.text || "",
                          center: item.center,
                        });
                        setStep("searching_bairro");
                        setSearchQuery("");
                        setSuggestions([]);
                      } else {
                        confirmFinalAddress(item);
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 hover:border-[#ff6200]/50 hover:bg-[#ff6200]/5 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-zinc-600 group-hover:text-[#ff6200]" />
                      <div className="text-left">
                        <p className="font-black italic uppercase text-sm">{item.text}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {item.place_name.split(",").slice(1).join(",")}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-[#ff6200]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRIVACIDADE */}
          <div className="flex items-start gap-3 bg-[#ff6200]/5 p-4 rounded-2xl border border-[#ff6200]/10">
            <Navigation className="w-4 h-4 text-[#ff6200] shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 italic leading-tight">
              Sua privacidade é sagrada. O endereço completo nunca será público. Apenas os dados territoriais alimentam
              o mapa global.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
