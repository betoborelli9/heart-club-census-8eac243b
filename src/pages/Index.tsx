// Path: src/pages/Index.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import { Button } from "@/components/ui/button";
import { ClubLogo } from "@/components/ClubLogo";
import { X, Heart, Star, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useUser();
  const [heartTeam, setHeartTeam] = useState<any>(null);
  const [sympathyTeams, setSympathyTeams] = useState<any[]>([]);
  const [issubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  const handleConfirmVote = async () => {
    if (!heartTeam) {
      toast.error("Selecione seu clube do coração!");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("votos").upsert({
        user_id: user?.id!,
        clube_nome: heartTeam.nome,
        pais: "Brasil",
        estado: profile?.estado || "",
        cidade: profile?.cidade || "",
        simpatia: sympathyTeams.map(t => t.nome), // Adicionei para não perder o voto de simpatia
      }, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Voto Sagrado registrado com sucesso!");
      navigate("/dashboard");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao registrar voto: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white p-4 flex flex-col items-center justify-center py-10 selection:bg-red-600">
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-[10]">
        
        <div className="text-center space-y-2">
          <ShieldCheck className="w-16 h-16 text-red-600 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Voto Sagrado</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
            Identidade • Lealdade • Respeito
          </p>
        </div>

        {/* SEÇÃO: CLUBE DO CORAÇÃO - Z-INDEX ALTO PARA A BUSCA FLUTUAR */}
        <div className="space-y-4 bg-zinc-900/20 p-6 rounded-3xl border border-white/5 relative z-[50]">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-2">
            <Heart className="w-4 h-4 fill-red-500" /> Seu Clube do Coração
          </h2>
          
          {!heartTeam ? (
            <div className="relative z-[60]">
              <ClubSearch onSelect={(club) => setHeartTeam(club)} />
              <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold italic">
                Busque pelo nome do seu time...
              </p>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-[0_10px_30px_rgba(255,255,255,0.05)] border-2 border-red-600 animate-in zoom-in-95 duration-300 relative z-[60]">
              <div className="flex items-center gap-4 text-black">
                <ClubLogo src={heartTeam.logoUrl} alt={heartTeam.nome} size="sm" />
                <div>
                  <h3 className="font-black uppercase italic leading-none">{heartTeam.nome}</h3>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">{heartTeam.estado}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setHeartTeam(null)}
                className="bg-zinc-100 hover:bg-red-100 text-zinc-400 hover:text-red-600 p-2 rounded-full transition-colors cursor-pointer relative z-[70]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* SEÇÃO: SIMPATIA - Z-INDEX MENOR QUE A DE CIMA */}
        <div className="space-y-4 bg-zinc-900/20 p-6 rounded-3xl border border-white/5 relative z-[30]">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
            <Star className="w-4 h-4" /> Clubes de Simpatia (Até 4)
          </h2>
          
          {sympathyTeams.length < 4 && (
            <div className="relative z-[40]">
              <ClubSearch onSelect={(club) => {
                const teamName = (club as any).nome || club.name;
                if (heartTeam?.nome === teamName) {
                  toast.error("Este já é seu time do coração!");
                  return;
                }
                if (sympathyTeams.find(t => ((t as any).nome || t.name) === teamName)) return;
                setSympathyTeams([...sympathyTeams, club]);
              }} />
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-2 mt-4 relative z-[35]">
            {sympathyTeams.map(club => (
              <div key={(club as any).nome || club.name} className="bg-zinc-900/60 border border-white/5 p-3 rounded-xl flex items-center justify-between group pointer-events-auto">
                <div className="flex items-center gap-3">
                  <ClubLogo src={(club as any).logoUrl || club.logo} alt={(club as any).nome || club.name} size="xs" />
                  <span className="text-[11px] font-black uppercase italic">{(club as any).nome || club.name}</span>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSympathyTeams(sympathyTeams.filter(t => (t.nome || t.name) !== (club.nome || club.name)));
                  }}
                  className="text-zinc-600 hover:text-red-500 transition-colors cursor-pointer p-2 relative z-[40]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* BOTÃO FINAL */}
        <div className="pt-4 relative z-[10]">
          <Button 
            onClick={handleConfirmVote}
            disabled={issubmitting || !heartTeam}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase italic py-8 rounded-2xl shadow-[0_15px_40px_rgba(226,26,33,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative z-[20]"
          >
            {issubmitting ? <Loader2 className="animate-spin" /> : "Confirmar Voto Sagrado"}
          </Button>
          <p className="text-[8px] text-zinc-600 text-center mt-4 uppercase tracking-[0.2em] font-bold">
            Ao confirmar, sua lealdade será registrada no Censo Global.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;