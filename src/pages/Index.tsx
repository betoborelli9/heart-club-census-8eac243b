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
      {/* Container principal com z-index definido */}
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        
        <div className="text-center space-y-2">
          <ShieldCheck className="w-16 h-16 text-red-600 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Voto Sagrado</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
            Identidade • Lealdade • Respeito
          </p>
        </div>

        {/* SEÇÃO: CLUBE DO CORAÇÃO */}
        <div className="space-y-4 bg-zinc-900/20 p-6 rounded-3xl border border-white/5 relative z-20">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-2">
            <Heart className="w-4 h-4 fill-red-500" /> Seu Clube do Coração
          </h2>
          
          {!heartTeam ? (
            <div className="relative z-50">
              <ClubSearch onSelect={(club) => setHeartTeam(club)} />
              <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold italic">
                Busque pelo nome do seu time...
              </p>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-[0_10px_30px_rgba(255,255,255,0.05)] border-2 border-red-600 animate-in zoom-in-95 duration-300 relative z-30">
              <div className="flex items-center gap-4 text-black">
                <ClubLogo src={heartTeam.logoUrl} alt={heartTeam.nome} size="sm" />
                <div>
                  <h3 className="font-black uppercase italic leading-none">{heartTeam.nome}</h3>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">{heartTeam.estado}</p>
                </div>
              </div>
              <button 
                onClick={() => setHeartTeam(null)}
                className="bg-zinc-100 hover:bg-red-100 text-zinc-400 hover:text-red-600 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* SEÇÃO: SIMPATIA */}
        <div className="space-y-4 bg-zinc-900/20 p-6 rounded-3xl border border-white/5 relative z-20">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
            <Star className="w-4 h-4" /> Clubes de Simpatia (Até 4)
          </h2>
          
          {sympathyTeams.length < 4 && (
            <div className="relative z-50">
              <ClubSearch onSelect={(club) => {
                if (heartTeam?.nome === club.name) {
                  toast.error("Este já é seu time do coração!");
                  return;
                }
                if (sympathyTeams.find(t => t.name === club.name)) return;
                setSympathyTeams([...sympathyTeams, club]);
              }} />
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-2 mt-4">
            {sympathyTeams.map(club => (
              <div key={club.nome} className="bg-zinc-900/60 border border-white/5 p-3 rounded-xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <ClubLogo src={club.logoUrl} alt={club.nome} size="xs" />
                  <span className="text-[11px] font-black uppercase italic">{club.nome}</span>
                </div>
                <button 
                  onClick={() => setSympathyTeams(sympathyTeams.filter(t => t.nome !== club.nome))}
                  className="text-zinc-600 group-hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* BOTÃO FINAL */}
        <div className="pt-4 relative z-30">
          <Button 
            onClick={handleConfirmVote}
            disabled={issubmitting || !heartTeam}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase italic py-8 rounded-2xl shadow-[0_15px_40px_rgba(226,26,33,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
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
