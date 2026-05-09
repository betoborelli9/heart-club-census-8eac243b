/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 CAMINHO: src/pages/MapaCalor.tsx
 * 🧠 MÓDULO: MAPA DE CALOR DINÂMICO (GLOBAL)
 * 🔥 STATUS: PRODUÇÃO — VERSÃO 30.0 (ZERO HARDCODED)
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AddressModal from "@/components/AddressModal";
// ... outros imports (MapContainer, etc)

const MapaCalor = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [showZipGate, setShowZipGate] = useState(true);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  // 1. Recupera o contexto dinâmico (Clube e CEP salvos)
  useEffect(() => {
    const savedClub = localStorage.getItem('selected_club');
    const savedZip = localStorage.getItem('user_cep');
    
    if (savedClub) setSelectedClub(savedClub);
    if (savedZip) setShowZipGate(false);
  }, []);

  // 2. Busca de Dados Autônoma (Sem nomes de cidades ou estados fixos)
  const fetchMapStats = async () => {
    if (!selectedClub) return;
    
    setLoading(true);
    const { data, error } = await supabase.rpc("get_heatmap_stats", {
      p_clube_nome: selectedClub
    });

    if (error) {
      console.error("[MAP ERROR]:", error);
    } else if (data) {
      // Mapeamento dinâmico: o banco decide o que é nome e o que é peso
      const formatted = (data as any[]).map(v => ({
        name: v.location_name, 
        value: Number(v.vote_count),
        lat: v.lat,
        lng: v.lng,
        precise: v.is_precise
      }));
      setStats(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!showZipGate) fetchMapStats();
  }, [showZipGate, selectedClub]);

  /* ═══════════════════════════════════════════════════════
      🎨 RENDERIZAÇÃO: ACESSO BLOQUEADO POR LOCALIZAÇÃO
   ═══════════════════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen bg-background">
      {showZipGate ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-8 space-y-6 bg-card border border-white/10 rounded-2xl shadow-2xl">
            {/* Textos dinâmicos baseados no clube selecionado */}
            <h2 className="text-2xl font-black italic uppercase text-center tracking-tighter">
              ONDE VOCÊ ESTÁ TORCENDO?
            </h2>
            <p className="text-muted-foreground text-center text-sm font-bold uppercase opacity-60">
              O {selectedClub || "CLUBE"} PRECISA SABER SUA LOCALIZAÇÃO PARA O MAPA DE CALOR.
            </p>
            
            <AddressModal 
              onConfirm={(data) => {
                localStorage.setItem('user_cep', data.cep);
                setShowZipGate(false);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
           {/* Aqui entra o seu MapContainer original que usa o estado 'stats' */}
           <h1 className="p-4 font-black italic uppercase tracking-widest text-primary">
             TERRITÓRIO: {selectedClub}
           </h1>
           {/* ... Restante do Mapa ... */}
        </div>
      )}
    </div>
  );
};

export default MapaCalor;

/**
 * ═══════════════════════════════════════════════════════════════
 * 📌 RODAPÉ TÉCNICO | HEART CLUB MASTER
 * ═══════════════════════════════════════════════════════════════
 * VERSÃO: 30.0 (DYNAMIC GLOBAL ARCHITECTURE)
 * NADA MANUAL. TUDO VIA LOCALSTORAGE E RPC.
 * ═══════════════════════════════════════════════════════════════
 */