/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ CAMINHO: src/components/AddressModal.tsx                              ║
 * ║ STATUS: WAR ROOM EDITION - FILTRO GEOGRÁFICO RESTRITO                ║
 * ║ VERSÃO: v8.0.0 (Beto Borelli - Foco Total no Bairro Local)           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, Globe, Check, Search, Navigation, ChevronRight, Heart } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

export default function AddressModal({ open, onOpenChange, clubName, onSuccess }: any) {
  const { toast } = useToast();
  const [step, setStep] = useState<'detecting' | 'welcome' | 'searching_city' | 'searching_bairro'>('detecting');
  const [loading, setLoading] = useState(false);
  
  const [detectedLocation, setDetectedLocation] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  /* ══════════════════════════════════════════════════════════════════════
     DETECÇÃO INICIAL PROATIVA
     ══════════════════════════════════════════════════════════════════════ */
  const detectLocation = useCallback(async () => {
    setStep('detecting');
    if (!navigator.geolocation) {
      setStep('searching_city');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,country&language=pt`);
        const data = await res.json();
        const city = data.features.find((f: any) => f.place_type.includes('place'));
        const country = data.features.find((f: any) => f.place_type.includes('country'));
        
        if (city) {
          setDetectedLocation({
            name: city.text,
            full: city.place_name,
            country: country?.text || "",
            country_code: country?.properties?.short_code || "br",
            center: city.center // [longitude, latitude]
          });
          setStep('welcome');
        } else {
          setStep('searching_city');
        }
      } catch (e) {
        setStep('searching_city');
      }
    }, () => setStep('searching_city'));
  }, []);

  useEffect(() => { if (open) detectLocation(); }, [open, detectLocation]);

  /* ══════════════════════════════════════════════════════════════════════
     LÓGICA DE BUSCA COM TRAVA GEOGRÁFICA (O PULO DO GATO)
     ══════════════════════════════════════════════════════════════════════ */
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) { setSuggestions([]); return; }

    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${MAPBOX_TOKEN}&language=pt`;

    if (step === 'searching_city') {
      url += `&types=place`;
    } else {
      // SE ESTIVER BUSCANDO BAIRRO: Tranca a busca num raio de 25km da cidade selecionada
      // e limita ao país daquela cidade.
      url += `&types=neighborhood,locality`;
      if (selectedCity?.center) {
        url += `&proximity=${selectedCity.center[0]},${selectedCity.center[1]}`;
        // Limita a busca para não fugir da região (bbox: minLon, minLat, maxLon, maxLat)
        const lon = selectedCity.center[0];
        const lat = selectedCity.center[1];
        url += `&bbox=${lon-0.2},${lat-0.2},${lon+0.2},${lat+0.2}`;
      }
    }
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (e) { console.error(e); }
  };

  const confirmFinal