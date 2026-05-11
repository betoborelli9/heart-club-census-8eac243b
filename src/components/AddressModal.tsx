/**
 * =================================================================================================
 * ARQUIVO: src/components/AddressModal.tsx
 * VERSÃO: 6.5 GLOBAL UX EDITION
 * =================================================================================================
 *
 * OBJETIVO:
 * Modal inteligente de endereço com:
 *
 * ✔ Fluxo "Menor Esforço"
 * ✔ Detecção automática por IP/GPS
 * ✔ Resolução de ambiguidades globais
 * ✔ Busca mundial de cidades
 * ✔ Busca contextual de bairros
 * ✔ Persistência vitalícia
 * ✔ Integração total com Supabase
 * ✔ UX estilo "Google Maps + War Room"
 *
 * FLUXO:
 *
 * 1. Detecta localização do usuário
 * 2. Pergunta:
 *      "Vimos que você está em Goiânia, Brasil. Você mora aqui?"
 *
 * 3A. Se SIM:
 *      trava cidade/país
 *      pede apenas o bairro
 *
 * 3B. Se NÃO:
 *      abre busca global de cidades
 *
 * 4. Se houver múltiplos bairros:
 *      abre lista de escolha
 *
 * 5. Salva:
 *      bairro
 *      cidade
 *      estado
 *      pais
 *      latitude
 *      longitude
 *
 * 6. Fecha e nunca mais abre para o usuário
 *
 * =================================================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, Globe2, Check, Search, Navigation, Building2, X } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { supabase } from "@/integrations/supabase/client";

/* =================================================================================================
 * MÓDULO 1 — TIPAGENS
 * ================================================================================================= */

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubName?: string | null;
  onSuccess?: () => void;
}

interface GeoDetected {
  city: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}

interface CityOption {
  city: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
  display: string;
}

interface NeighborhoodOption {
  name: string;
  lat: number;
  lon: number;
}

/* =================================================================================================
 * MÓDULO 2 — HELPERS
 * ================================================================================================= */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const normalize = (v?: string | null) =>
  (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/setor|bairro|district|jardim|zona|sector/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

async function reverseGeo(): Promise<GeoDetected | null> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      }),
    );

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);

    const json = await res.json();

    const address = json.address || {};

    return {
      city: address.city || address.town || address.village || address.county || "",
      state: address.state || "",
      country: address.country || "",
      lat,
      lon,
    };
  } catch {
    return null;
  }
}

async function searchCities(query: string): Promise<CityOption[]> {
  if (!query) return [];

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: "10",
    });

  const res = await fetch(url);

  const data = await res.json();

  return data.map((item: any) => ({
    city: item.address.city || item.address.town || item.address.village || item.address.county || item.name,
    state: item.address.state || "",
    country: item.address.country || "",
    lat: Number(item.lat),
    lon: Number(item.lon),
    display: [
      item.address.city || item.address.town || item.address.village || item.name,
      item.address.state,
      item.address.country,
    ]
      .filter(Boolean)
      .join(" / "),
  }));
}

async function searchNeighborhoods(city: string, country: string, query: string): Promise<NeighborhoodOption[]> {
  if (!query) return [];

  const q = `
    [out:json];
    (
      node["place"="suburb"]["name"](around:30000,0,0);
      way["place"="suburb"]["name"](around:30000,0,0);
      relation["place"="suburb"]["name"](around:30000,0,0);
    );
    out center tags;
  `;

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: `${query}, ${city}, ${country}`,
        format: "jsonv2",
        addressdetails: "1",
        limit: "10",
      });

    const res = await fetch(url);

    const data = await res.json();

    const unique = new Map<string, NeighborhoodOption>();

    data.forEach((item: any) => {
      const name = item.address.suburb || item.address.neighbourhood || item.name;

      if (!name) return;

      const key = normalize(name);

      if (!unique.has(key)) {
        unique.set(key, {
          name,
          lat: Number(item.lat),
          lon: Number(item.lon),
        });
      }
    });

    return Array.from(unique.values());
  } catch {
    return [];
  }
}

/* =================================================================================================
 * MÓDULO 3 — COMPONENTE
 * ================================================================================================= */

export default function AddressModal({ open, onOpenChange, clubName, onSuccess }: AddressModalProps) {
  const [loading, setLoading] = useState(true);

  const [geo, setGeo] = useState<GeoDetected | null>(null);

  const [confirmedGeo, setConfirmedGeo] = useState(false);

  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CityOption[]>([]);

  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);

  const [bairroQuery, setBairroQuery] = useState("");
  const [bairroResults, setBairroResults] = useState<NeighborhoodOption[]>([]);

  const [selectedBairro, setSelectedBairro] = useState<NeighborhoodOption | null>(null);

  const [saving, setSaving] = useState(false);

  const cityDebounce = useRef<any>(null);
  const bairroDebounce = useRef<any>(null);

  /* =============================================================================================
   * MÓDULO 4 — DETECÇÃO AUTOMÁTICA
   * ============================================================================================= */

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const detected = await reverseGeo();

      if (detected) {
        setGeo(detected);
      }

      setLoading(false);
    };

    if (open) {
      run();
    }
  }, [open]);

  /* =============================================================================================
   * MÓDULO 5 — BUSCA GLOBAL DE CIDADES
   * ============================================================================================= */

  useEffect(() => {
    if (!cityQuery || confirmedGeo) return;

    if (cityDebounce.current) {
      clearTimeout(cityDebounce.current);
    }

    cityDebounce.current = setTimeout(async () => {
      const data = await searchCities(cityQuery);
      setCityResults(data);
    }, 300);
  }, [cityQuery, confirmedGeo]);

  /* =============================================================================================
   * MÓDULO 6 — BUSCA CONTEXTUAL DE BAIRROS
   * ============================================================================================= */

  useEffect(() => {
    if (!bairroQuery || !selectedCity) return;

    if (bairroDebounce.current) {
      clearTimeout(bairroDebounce.current);
    }

    bairroDebounce.current = setTimeout(async () => {
      const data = await searchNeighborhoods(selectedCity.city, selectedCity.country, bairroQuery);

      setBairroResults(data);
    }, 300);
  }, [bairroQuery, selectedCity]);

  /* =============================================================================================
   * MÓDULO 7 — SALVAMENTO VITALÍCIO
   * ============================================================================================= */

  const saveAddress = async () => {
    if (!selectedCity || !selectedBairro) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      bairro: selectedBairro.name,
      cidade: selectedCity.city,
      estado: selectedCity.state || "",
      pais: selectedCity.country,
      latitude: selectedBairro.lat,
      longitude: selectedBairro.lon,
      address_confirmed: true,
    };

    await supabase.from("profiles").update(payload).eq("id", user.id);

    localStorage.setItem("heartclub_address_confirmed", "true");

    setSaving(false);

    onOpenChange(false);

    onSuccess?.();
  };

  /* =============================================================================================
   * MÓDULO 8 — UI
   * ============================================================================================= */

  return (
    <Dialog open={open}>
      <DialogContent
        className="
          border border-primary/20
          bg-black/95
          backdrop-blur-2xl
          text-white
          max-w-lg
          rounded-[28px]
          overflow-hidden
          p-0
        "
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="
                w-12 h-12 rounded-2xl
                bg-primary/15
                border border-primary/30
                flex items-center justify-center
              "
            >
              <MapPin className="w-6 h-6 text-primary" />
            </div>

            <div>
              <h2 className="text-lg font-black italic uppercase">Endereço do Torcedor</h2>

              <p className="text-xs text-muted-foreground mt-1">
                Precisamos confirmar sua localização para liberar o mapa global.
              </p>
            </div>
          </div>

          {loading && (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && !confirmedGeo && geo && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                rounded-2xl
                bg-white/5
                border border-white/10
                p-5
              "
            >
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-primary mt-0.5" />

                <div>
                  <p className="text-sm font-semibold leading-relaxed">
                    Vimos que você está em{" "}
                    <span className="text-primary font-black">
                      {geo.city}, {geo.country}
                    </span>
                    .
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">Você mora aqui?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Button
                  onClick={() => {
                    const city: CityOption = {
                      city: geo.city,
                      state: geo.state,
                      country: geo.country,
                      lat: geo.lat,
                      lon: geo.lon,
                      display: `${geo.city} / ${geo.country}`,
                    };

                    setSelectedCity(city);
                    setConfirmedGeo(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-black font-black"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Sim
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmedGeo(false);
                    setGeo(null);
                  }}
                  className="
                    border-white/10
                    bg-white/5
                    hover:bg-white/10
                  "
                >
                  <Globe2 className="w-4 h-4 mr-2" />
                  Não
                </Button>
              </div>
            </motion.div>
          )}

          {!loading && (!geo || !confirmedGeo) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />

                <Input
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Buscar cidade no mundo..."
                  className="
                    pl-10
                    bg-white/5
                    border-white/10
                    h-12
                  "
                />
              </div>

              <AnimatePresence>
                {cityResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="
                      mt-3
                      rounded-2xl
                      border border-white/10
                      bg-white/5
                      overflow-hidden
                      max-h-72
                      overflow-y-auto
                    "
                  >
                    {cityResults.map((city, idx) => (
                      <button
                        key={`${city.display}-${idx}`}
                        onClick={() => {
                          setSelectedCity(city);
                          setConfirmedGeo(true);
                        }}
                        className="
                          w-full
                          p-4
                          text-left
                          border-b border-white/5
                          hover:bg-primary/10
                          transition-colors
                        "
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-primary shrink-0" />

                          <div>
                            <p className="text-sm font-black uppercase italic">{city.city}</p>

                            <p className="text-[11px] text-muted-foreground">
                              {city.state} • {city.country}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {confirmedGeo && selectedCity && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
              <div className="mb-4">
                <p className="text-sm font-semibold">
                  Qual o seu bairro em <span className="text-primary font-black">{selectedCity.city}</span>?
                </p>

                <button
                  onClick={() => {
                    setConfirmedGeo(false);
                    setSelectedCity(null);
                    setSelectedBairro(null);
                    setBairroResults([]);
                  }}
                  className="
                    text-xs
                    text-primary
                    mt-1
                    hover:underline
                  "
                >
                  Mudar endereço
                </button>
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />

                <Input
                  value={bairroQuery}
                  onChange={(e) => setBairroQuery(e.target.value)}
                  placeholder="Digite seu bairro..."
                  className="
                    pl-10
                    h-12
                    bg-white/5
                    border-white/10
                  "
                />
              </div>

              {bairroResults.length > 0 && (
                <div
                  className="
                    mt-3
                    rounded-2xl
                    overflow-hidden
                    border border-primary/20
                    bg-white/5
                    max-h-72
                    overflow-y-auto
                  "
                >
                  {bairroResults.map((bairro, idx) => (
                    <button
                      key={`${bairro.name}-${idx}`}
                      onClick={() => {
                        setSelectedBairro(bairro);
                        setBairroQuery(bairro.name);
                      }}
                      className={`
                        w-full
                        p-4
                        text-left
                        border-b border-white/5
                        hover:bg-primary/10
                        transition-colors
                        ${selectedBairro?.name === bairro.name ? "bg-primary/15" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black italic uppercase">{bairro.name}</p>

                          <p className="text-[11px] text-muted-foreground">
                            {selectedCity.city} • {selectedCity.country}
                          </p>
                        </div>

                        {selectedBairro?.name === bairro.name && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                disabled={!selectedBairro || saving}
                onClick={saveAddress}
                className="
                  w-full
                  mt-5
                  h-12
                  bg-primary
                  hover:bg-primary/90
                  text-black
                  font-black
                  uppercase
                  tracking-wide
                "
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar endereço
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * =================================================================================================
 * [RODAPÉ TÉCNICO]
 * =================================================================================================
 *
 * RECURSOS IMPLEMENTADOS:
 *
 * ✔ Geolocalização automática via GPS
 * ✔ Busca mundial de cidades
 * ✔ Resolução de homônimos
 * ✔ Busca contextual de bairros
 * ✔ Persistência vitalícia
 * ✔ UX Mobile First
 * ✔ Glassmorphism War Room
 * ✔ Integração Supabase
 * ✔ Estrutura modularizada
 * ✔ Preparado para Heatmap Global
 *
 * =================================================================================================
 */
