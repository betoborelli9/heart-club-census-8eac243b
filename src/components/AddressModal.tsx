/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ CAMINHO: src/components/AddressModal.tsx                           ║
 * ║ STATUS: PRODUÇÃO GLOBAL READY                                      ║
 * ║ VERSÃO: v5.0.0                                                     ║
 * ║ CONTEXTO:                                                          ║
 * ║ Modal Global de Territorialização do Torcedor.                     ║
 * ║                                                                    ║
 * ║ Responsável por:                                                   ║
 * ║ • Detectar localização inicial via GPS/IP                          ║
 * ║ • Confirmar residência do usuário                                  ║
 * ║ • Permitir busca global de endereços                               ║
 * ║ • Persistir território em profiles + votos                         ║
 * ║ • Alimentar o Heatmap Mundial do Heart Club                        ║
 * ║                                                                    ║
 * ║ Arquitetura preparada para escala internacional.                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Loader2, MapPin, Globe, ShieldCheck, CheckCircle2, Search } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 1 — CONFIGURAÇÕES GLOBAIS
   ══════════════════════════════════════════════════════════════════════ */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

const MAPBOX_SEARCH_URL = "https://api.mapbox.com/search/geocode/v6/forward";

const MAPBOX_REVERSE_URL = "https://api.mapbox.com/search/geocode/v6/reverse";

const SESSION_STORAGE_KEY = "heartclub_territory_cache";

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 2 — TIPAGENS E INTERFACES
   ══════════════════════════════════════════════════════════════════════ */

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubName?: string | null;
  onSuccess?: () => void;
}

interface AddressPayload {
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  cep: string;
  enderecoCompleto: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface SuggestionItem {
  id: string;
  place_name: string;
  context?: any[];
  properties?: Record<string, any>;
  geometry?: {
    coordinates?: [number, number];
  };
}

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 3 — UTILITÁRIOS DE EXTRAÇÃO GLOBAL
   ══════════════════════════════════════════════════════════════════════ */

const extractContextValue = (context: any[] = [], prefixes: string[]): string => {
  const found = context.find((item) => prefixes.some((prefix) => item.id?.startsWith(prefix)));

  return found?.text || found?.name || "";
};

const normalizeAddress = (feature: any): AddressPayload => {
  const context = feature.context || [];

  const bairro =
    extractContextValue(context, ["neighborhood", "locality", "district"]) || feature.properties?.district || "";

  const cidade = extractContextValue(context, ["place", "city"]) || feature.properties?.city || "";

  const estado = extractContextValue(context, ["region"]) || feature.properties?.region || "";

  const pais = extractContextValue(context, ["country"]) || feature.properties?.country || "";

  const cep = extractContextValue(context, ["postcode"]) || feature.properties?.postcode || "";

  return {
    bairro,
    cidade,
    estado,
    pais,
    cep,
    enderecoCompleto: feature.properties?.full_address || feature.place_name,
    latitude: feature.geometry?.coordinates?.[1] ?? null,
    longitude: feature.geometry?.coordinates?.[0] ?? null,
  };
};

/* ══════════════════════════════════════════════════════════════════════
   MÓDULO 4 — COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════ */

const AddressModal = ({ open, onOpenChange, clubName, onSuccess }: AddressModalProps) => {
  const { user, refreshProfile } = useUser();
  const { toast } = useToast();

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 5 — ESTADOS CENTRAIS
     ────────────────────────────────────────────────────────────── */

  const [loadingGeo, setLoadingGeo] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [detectedCity, setDetectedCity] = useState("");
  const [detectedCountry, setDetectedCountry] = useState("");

  const [addressConfirmed, setAddressConfirmed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState<AddressPayload | null>(null);

  const [manualMode, setManualMode] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 6 — GEOLOCALIZAÇÃO GLOBAL (GPS + REVERSE GEOCODING)
     ────────────────────────────────────────────────────────────── */

  const detectUserLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLoadingGeo(false);
      setManualMode(true);
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const response = await fetch(
              `${MAPBOX_REVERSE_URL}?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}`,
            );

            const data = await response.json();

            const feature = data?.features?.[0];

            if (!feature) {
              setManualMode(true);
              setLoadingGeo(false);
              return;
            }

            const normalized = normalizeAddress(feature);

            setSelectedAddress(normalized);
            setDetectedCity(normalized.cidade);
            setDetectedCountry(normalized.pais);

            setLoadingGeo(false);
          } catch (err) {
            console.error("[AddressModal] reverse geocode error:", err);
            setManualMode(true);
            setLoadingGeo(false);
          }
        },
        () => {
          setManualMode(true);
          setLoadingGeo(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        },
      );
    } catch (err) {
      console.error("[AddressModal] geolocation error:", err);
      setManualMode(true);
      setLoadingGeo(false);
    }
  }, []);

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 7 — AUTOCOMPLETE GLOBAL
     ────────────────────────────────────────────────────────────── */

  const searchAddress = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSearchLoading(true);

    try {
      const response = await fetch(
        `${MAPBOX_SEARCH_URL}?q=${encodeURIComponent(query)}&autocomplete=true&limit=6&access_token=${MAPBOX_TOKEN}`,
        {
          signal: controller.signal,
        },
      );

      const data = await response.json();

      setSuggestions(data?.features || []);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("[AddressModal] autocomplete error:", err);
      }
    } finally {
      setSearchLoading(false);
    }
  }, []);

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 8 — SELEÇÃO DE ENDEREÇO
     ────────────────────────────────────────────────────────────── */

  const handleSelectSuggestion = useCallback((feature: any) => {
    const normalized = normalizeAddress(feature);

    setSelectedAddress(normalized);
    setSearchQuery(normalized.enderecoCompleto);
    setSuggestions([]);
  }, []);

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 9 — PERSISTÊNCIA GLOBAL
     ────────────────────────────────────────────────────────────── */

  const persistAddress = useCallback(async () => {
    if (!user || !selectedAddress) return;

    if (!selectedAddress.cidade || !selectedAddress.estado || !selectedAddress.pais) {
      toast({
        variant: "destructive",
        title: "Selecione um endereço válido.",
      });

      return;
    }

    setSubmitting(true);

    try {
      /* ───── Persistência Local ───── */

      try {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            ...selectedAddress,
            savedAt: Date.now(),
          }),
        );
      } catch {}

      /* ───── Atualização do Perfil ───── */

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          bairro: selectedAddress.bairro,
          cidade: selectedAddress.cidade,
          estado: selectedAddress.estado,
          pais: selectedAddress.pais,
          cep: selectedAddress.cep,
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      /* ───── Atualização do Voto Real ───── */

      const { error: voteErr } = await supabase
        .from("votos")
        .update({
          bairro: selectedAddress.bairro,
          cidade: selectedAddress.cidade,
          estado: selectedAddress.estado,
          pais: selectedAddress.pais,
          cep: selectedAddress.cep,
        })
        .eq("user_id", user.id)
        .eq("is_original_vote", true);

      if (voteErr) throw voteErr;

      await refreshProfile();

      setAddressConfirmed(true);

      toast({
        title: "Território confirmado! 🔥",
      });

      onSuccess?.();

      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (err) {
      console.error("[AddressModal] persist error:", err);

      toast({
        variant: "destructive",
        title: "Erro ao salvar território.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, selectedAddress, refreshProfile, toast, onSuccess, onOpenChange]);

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 10 — EFEITOS
     ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (open) {
      detectUserLocation();
    }
  }, [open, detectUserLocation]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchAddress(searchQuery);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchAddress]);

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 11 — BLOQUEIO DE FECHAMENTO
     ────────────────────────────────────────────────────────────── */

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!addressConfirmed) return;
      onOpenChange(next);
    },
    [addressConfirmed, onOpenChange],
  );

  /* ──────────────────────────────────────────────────────────────
     MÓDULO 12 — VALIDAÇÃO VISUAL
     ────────────────────────────────────────────────────────────── */

  const canSubmit = useMemo(() => {
    if (!selectedAddress) return false;

    return Boolean(selectedAddress.cidade && selectedAddress.estado && selectedAddress.pais);
  }, [selectedAddress]);

  /* ══════════════════════════════════════════════════════════════════════
     MÓDULO 13 — RENDERIZAÇÃO WAR ROOM
     ══════════════════════════════════════════════════════════════════════ */

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="
          max-w-lg
          border
          border-white/10
          bg-black/65
          backdrop-blur-2xl
          rounded-3xl
          shadow-[0_10px_40px_rgba(255,98,0,0.18)]
          z-[10000]
        "
      >
        <div className="space-y-6">
          {/* ═════════ HEADER ═════════ */}

          <div className="space-y-3 text-center">
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                border
                border-[#ff6200]/30
                bg-[#ff6200]/10
              "
            >
              <Globe className="h-6 w-6 text-[#ff6200]" />
            </div>

            <div className="space-y-1">
              <h2
                className="
                  text-2xl
                  font-black
                  italic
                  uppercase
                  tracking-tight
                  text-white
                "
              >
                Território do Coração
              </h2>

              <p className="text-sm italic text-white/65">
                O mapa global do <span className="font-bold text-[#ff6200] uppercase">{clubName || "seu clube"}</span>{" "}
                começa por você.
              </p>
            </div>
          </div>

          {/* ═════════ GEO DETECTION ═════════ */}

          {loadingGeo ? (
            <div
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-5
              "
            >
              <Loader2 className="h-5 w-5 animate-spin text-[#ff6200]" />

              <span className="text-sm italic text-white/70">Detectando sua localização...</span>
            </div>
          ) : !manualMode ? (
            <div
              className="
                space-y-4
                rounded-2xl
                border
                border-[#ff6200]/20
                bg-[#ff6200]/[0.06]
                p-5
              "
            >
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-[#ff6200]" />

                <div className="space-y-2">
                  <p className="text-sm italic leading-relaxed text-white/85">
                    Vimos que você está em{" "}
                    <strong className="text-[#ff6200]">
                      {detectedCity}, {detectedCountry}
                    </strong>
                    .
                  </p>

                  <p className="text-xs italic text-white/55">Você mora aqui ou deseja informar outro endereço?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={persistAddress}
                  disabled={submitting}
                  className="
                    h-12
                    rounded-xl
                    font-black
                    italic
                    uppercase
                  "
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Sim, moro aqui
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setManualMode(true)}
                  className="
                    h-12
                    rounded-xl
                    border-white/15
                    bg-white/5
                    font-black
                    italic
                    uppercase
                    text-white
                    hover:bg-white/10
                  "
                >
                  Mudar endereço
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ═════════ SEARCH INPUT ═════════ */}

              <div className="space-y-2">
                <label
                  className="
                    text-[11px]
                    font-black
                    italic
                    uppercase
                    tracking-wide
                    text-white/55
                  "
                >
                  Endereço Global
                </label>

                <div className="relative">
                  <Search
                    className="
                      absolute
                      left-3
                      top-1/2
                      h-4
                      w-4
                      -translate-y-1/2
                      text-white/40
                    "
                  />

                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rua, cidade, bairro, país..."
                    className="
                      h-14
                      rounded-2xl
                      border-white/10
                      bg-white/5
                      pl-10
                      font-semibold
                      text-white
                      placeholder:text-white/35
                    "
                    autoFocus
                  />

                  {searchLoading && (
                    <Loader2
                      className="
                        absolute
                        right-3
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        animate-spin
                        text-[#ff6200]
                      "
                    />
                  )}
                </div>
              </div>

              {/* ═════════ AUTOCOMPLETE RESULTS ═════════ */}

              {suggestions.length > 0 && (
                <div
                  className="
                    max-h-72
                    overflow-y-auto
                    rounded-2xl
                    border
                    border-white/10
                    bg-black/40
                    backdrop-blur-xl
                  "
                >
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="
                        flex
                        w-full
                        items-start
                        gap-3
                        border-b
                        border-white/5
                        px-4
                        py-4
                        text-left
                        transition-all
                        hover:bg-white/5
                      "
                    >
                      <MapPin className="mt-0.5 h-4 w-4 text-[#ff6200]" />

                      <div>
                        <p className="text-sm font-semibold text-white">{item.place_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ═════════ ADDRESS PREVIEW ═════════ */}

              {selectedAddress && (
                <div
                  className="
                    space-y-3
                    rounded-2xl
                    border
                    border-[#ff6200]/15
                    bg-[#ff6200]/[0.05]
                    p-4
                  "
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#ff6200]" />

                    <span
                      className="
                        text-xs
                        font-black
                        italic
                        uppercase
                        tracking-wide
                        text-[#ff6200]
                      "
                    >
                      Endereço Detectado
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{selectedAddress.enderecoCompleto}</p>

                    <p className="text-xs italic text-white/60">
                      {selectedAddress.bairro} • {selectedAddress.cidade} • {selectedAddress.estado} •{" "}
                      {selectedAddress.pais}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════ PRIVACIDADE ═════════ */}

          <div
            className="
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-[#ff6200]/15
              bg-[#ff6200]/[0.05]
              p-4
            "
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[#ff6200]" />

            <p className="text-[11px] italic leading-relaxed text-white/70">
              <span className="font-semibold text-[#ff6200]">Sua privacidade é sagrada.</span> O endereço completo nunca
              será exibido publicamente. Apenas os dados territoriais alimentam o mapa global de torcedores.
            </p>
          </div>

          {/* ═════════ CTA FINAL ═════════ */}

          {manualMode && (
            <Button
              onClick={persistAddress}
              disabled={!canSubmit || submitting}
              className="
                h-14
                w-full
                rounded-2xl
                font-black
                italic
                uppercase
                shadow-lg
                shadow-[#ff6200]/20
              "
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "CONFIRMAR TERRITÓRIO"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressModal;
