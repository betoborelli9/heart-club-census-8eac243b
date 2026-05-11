/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ CAMINHO: src/components/AddressModal.tsx                              ║
 * ║ VERSÃO: WAR ROOM TERRITORY FIX V7.0 (FINAL PERSISTENCE)              ║
 * ║ STATUS: PRODUÇÃO COM TRAVA DE LOOP                                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { MapPin, Loader2, Search, Navigation, ChevronRight, Heart } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { captureIpAudit } from "@/lib/address";
import { fetchOfficialGoianiaNeighborhoodGeoJson } from "@/lib/official-neighborhoods";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

// [MÓDULO 1: FILTRO ANTI-RUA - MANTIDO INTACTO]
const STREET_BLACKLIST = [
  "rua",
  "avenida",
  "av.",
  "av ",
  "alameda",
  "travessa",
  "praça",
  "rodovia",
  "nº",
  "número",
  "numero",
  "sn",
  "s/n",
];
function normalize(v: string = "") {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function isStreetTrash(name: string) {
  const n = normalize(name);
  return STREET_BLACKLIST.some((word) => n.includes(word));
}

function isGoiania(city?: string | null) {
  return normalize(city || "") === "goiania";
}

function contextText(feature: any, prefix: string) {
  return feature?.context?.find((c: any) => String(c.id || "").startsWith(prefix))?.text || null;
}

function toCityContext(feature: any) {
  return {
    name: feature.text,
    country: contextText(feature, "country") || "Brasil",
    state: contextText(feature, "region"),
    center: feature.center,
  };
}

function centerFromGeometry(geometry: any): [number, number] | null {
  const coords: number[][] = [];
  const walk = (value: any) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      coords.push([value[0], value[1]]);
      return;
    }
    value.forEach(walk);
  };
  walk(geometry?.coordinates);
  if (!coords.length) return null;
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

// [MÓDULO 2: ENGINE TERRITORIAL OVERPASS - MANTIDO INTACTO]
function useTerritoryEngine() {
  const searchCities = async (query: string) => {
    if (!MAPBOX_TOKEN || query.trim().length < 2) return [];
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place&language=pt&autocomplete=true&limit=10`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.features || [];
    } catch {
      return [];
    }
  };

  const searchNeighborhoods = async (query: string, cityContext: any) => {
    if (!cityContext?.name) return [];
    try {
      if (isGoiania(cityContext.name)) {
        const geojson = await fetchOfficialGoianiaNeighborhoodGeoJson();
        const unique = new Map();
        return (geojson?.features || [])
          .map((feature: any) => {
            const name = String(feature?.properties?.official_name || feature?.properties?.name || "").trim();
            const center = centerFromGeometry(feature?.geometry) || cityContext.center;
            if (!name || !center) return null;
            return {
              id: `goiania-${normalize(name)}`,
              text: name,
              place_name: `${name}, Goiânia`,
              center,
            };
          })
          .filter(Boolean)
          .filter((item: any) => !isStreetTrash(item.text))
          .filter((item: any) => (query ? normalize(item.text).includes(normalize(query)) : true))
          .filter((item: any) => {
            const key = normalize(item.text);
            if (unique.has(key)) return false;
            unique.set(key, true);
            return true;
          })
          .sort((a: any, b: any) => a.text.localeCompare(b.text, "pt-BR"));
      }

      const citySearchUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ city: cityContext.name, country: cityContext.country || "", format: "jsonv2", limit: "1" })}`;
      const cityRes = await fetch(citySearchUrl);
      const cityData = await cityRes.json();
      if (!cityData?.length) return [];
      const areaId = cityData[0].osm_type === "relation" ? 3600000000 + Number(cityData[0].osm_id) : null;
      if (!areaId) return [];

      const overpassQuery = `[out:json][timeout:25];area(${areaId})->.searchArea;(node["place"~"suburb|neighbourhood|quarter"](area.searchArea);way["place"~"suburb|neighbourhood|quarter"](area.searchArea);relation["place"~"suburb|neighbourhood|quarter"](area.searchArea););out center tags;`;
      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
      });
      const overpassData = await overpassRes.json();
      if (!overpassData?.elements?.length) return [];

      const unique = new Map();
      return overpassData.elements
        .map((item: any) => {
          const name = item.tags?.name;
          if (!name) return null;
          return {
            id: `${item.type}-${item.id}`,
            text: name,
            place_name: `${name}, ${cityContext.name}`,
            center: [item.center?.lon || item.lon, item.center?.lat || item.lat],
          };
        })
        .filter(Boolean)
        .filter((item: any) => Number.isFinite(item.center?.[0]) && Number.isFinite(item.center?.[1]))
        .filter((item: any) => !isStreetTrash(item.text))
        .filter((item: any) => (query ? normalize(item.text).includes(normalize(query)) : true))
        .filter((item: any) => {
          const key = normalize(item.text);
          if (unique.has(key)) return false;
          unique.set(key, true);
          return true;
        })
        .sort((a: any, b: any) => {
          const aStarts = normalize(a.text).startsWith(normalize(query));
          const bStarts = normalize(b.text).startsWith(normalize(query));
          return aStarts && !bStarts ? -1 : !aStarts && bStarts ? 1 : a.text.localeCompare(b.text);
        })
        .slice(0, query ? 20 : 5000);
    } catch (e) {
      return [];
    }
  };
  return { searchCities, searchNeighborhoods };
}

export default function AddressModal({ open, onOpenChange, clubName, onSuccess }: any) {
  const { toast } = useToast();
  const { searchCities, searchNeighborhoods } = useTerritoryEngine();
  const [canShowModal, setCanShowModal] = useState(false);
  const [step, setStep] = useState<"detecting" | "welcome" | "searching_city" | "searching_bairro">("detecting");
  const [loading, setLoading] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [bairrosCache, setBairrosCache] = useState<any[]>([]);
  const [loadingBairros, setLoadingBairros] = useState(false);
  const searchTimeout = useRef<any>(null);

  // [PORTARIA: NUNCA MOSTRA O MODAL SE address_confirmed JÁ ESTÁ TRUE NO BANCO]
  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      setCanShowModal(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onOpenChange(false);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("address_confirmed").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      if (profile?.address_confirmed) {
        setCanShowModal(false);
        onOpenChange(false);
        return;
      }
      setStep("detecting");
      setCanShowModal(true);
    };
    if (open) checkStatus();
    else setCanShowModal(false);
    return () => {
      cancelled = true;
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (step !== "searching_bairro" || !selectedCity?.name) return;
    let cancelled = false;
    setLoadingBairros(true);
    (async () => {
      const all = await searchNeighborhoods("", selectedCity);
      if (cancelled) return;
      setBairrosCache(all);
      setLoadingBairros(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, selectedCity?.name]);

  const handleDetection = useCallback(async () => {
    const ipAudit = await captureIpAudit();
    if (ipAudit.cidade) {
      setDetectedLocation({
        name: ipAudit.cidade,
        country: ipAudit.pais || "Brasil",
        state: ipAudit.estado,
        center: Number.isFinite(ipAudit.lng) && Number.isFinite(ipAudit.lat) ? [ipAudit.lng, ipAudit.lat] : null,
      });
      setStep("welcome");
      return;
    }

    if (!MAPBOX_TOKEN) {
      setStep("searching_city");
      return;
    }

    if (!navigator.geolocation) {
      setStep("searching_city");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,region,country&language=pt`,
          );
          const data = await res.json();
          const city = data.features?.find((f: any) => f.place_type.includes("place"));
          const state = data.features?.find((f: any) => f.place_type.includes("region"));
          const country = data.features?.find((f: any) => f.place_type.includes("country"));
          if (city) {
            setDetectedLocation({ name: city.text, country: country?.text || "Brasil", state: state?.text, center: city.center });
            setStep("welcome");
          } else {
            setStep("searching_city");
          }
        } catch {
          setStep("searching_city");
        }
      },
      () => setStep("searching_city"),
    );
  }, []);

  useEffect(() => {
    if (open && canShowModal) handleDetection();
  }, [open, canShowModal, handleDetection]);

  const onTypeSearch = (val: string) => {
    setSearchQuery(val);
    if (step === "searching_bairro") {
      const q = normalize(val);
      if (!q) {
        setSuggestions(bairrosCache.slice(0, 50));
        return;
      }
      const filtered = bairrosCache.filter((b) => normalize(b.text).includes(q));
      setSuggestions(filtered.slice(0, 30));
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      if (val.length < 2) {
        setSuggestions([]);
        return;
      }
      const results = await searchCities(val);
      setSuggestions(results);
    }, 350);
  };

  useEffect(() => {
    if (step === "searching_bairro" && !searchQuery && bairrosCache.length) setSuggestions(bairrosCache.slice(0, 50));
  }, [bairrosCache, step, searchQuery]);

  // [SAVE COM FORCE RELOAD PARA QUEBRAR O LOOP]
  const handleFinalSave = async (feature: any) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          bairro: feature.text,
          cidade: selectedCity.name,
          pais: selectedCity.country || "Brasil",
          latitude: feature.center[1],
          longitude: feature.center[0],
          address_confirmed: true, // AQUI É O INGRESSO DA FESTA
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Território Confirmado!", description: "Bem-vindo ao mapa global!" });
      onOpenChange(false);
      onSuccess?.();

      // REFRESH PARA O SISTEMA LER O BANCO NOVO E LIBERAR O DASHBOARD
      window.location.reload();
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar território" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-black text-white rounded-[32px] p-0 overflow-hidden shadow-[0_0_60px_rgba(255,98,0,0.25)]">
        <div className="p-8 space-y-6">
          <header className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-[#ff6200]/10 border border-[#ff6200]/30 rounded-2xl flex items-center justify-center">
              <Heart className="text-[#ff6200] w-8 h-8 fill-[#ff6200]/20" />
            </div>
            <h2 className="text-2xl font-black italic uppercase">Onde pulsa seu coração?</h2>
            <p className="text-zinc-500 text-sm italic">
              Seu território alimenta o mapa global do{" "}
              <span className="text-[#ff6200] font-bold uppercase">{clubName}</span>
            </p>
          </header>

          {step === "welcome" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 text-center">
              <div className="bg-zinc-900/50 border border-[#ff6200]/20 p-6 rounded-2xl">
                <p className="text-zinc-400 text-sm italic mb-1">Detectamos sua cidade:</p>
                <p className="text-xl font-black uppercase italic text-white">{detectedLocation?.name}</p>
                <p className="text-[#ff6200] text-xs font-bold mt-4 italic text-center w-full block">Você mora aqui?</p>
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
                  className="h-16 bg-zinc-900 border-white/10 pl-12 rounded-2xl focus:border-[#ff6200] text-lg font-bold italic"
                  value={searchQuery}
                  onChange={(e) => onTypeSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (step === "searching_city") {
                        setSelectedCity({
                          name: item.text,
                          country: item.context?.find((c: any) => c.id.includes("country"))?.text || "Brasil",
                          center: item.center,
                        });
                        setStep("searching_bairro");
                        setSearchQuery("");
                        setSuggestions([]);
                      } else {
                        handleFinalSave(item);
                      }
                    }}
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
                {step === "searching_bairro" && loadingBairros && (
                  <div className="flex items-center justify-center gap-3 p-6 text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff6200]" />
                    <span className="text-xs italic uppercase tracking-widest text-center">Carregando bairros...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <footer className="flex items-start gap-3 bg-[#ff6200]/5 p-4 rounded-2xl border border-[#ff6200]/10">
            <Navigation className="w-4 h-4 text-[#ff6200] shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 italic leading-tight">
              Privacidade total: sua rua nunca aparece publicamente. Apenas o território alimenta o censo global.
            </p>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
