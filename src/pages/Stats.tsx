/**
 * ARQUIVO: src/pages/Stats.tsx
 * STATUS: VERSÃO DE EMERGÊNCIA - ANTI-CRASH TOTAL
 */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Loader2, Users, Shield, LayoutDashboard, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const Stats = () => {
  const navigate = useNavigate();
  const { profile, isLoading, signOut } = useUser();
  const [votosVila, setVotosVila] = useState(0);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const { count } = await supabase
          .from("votos")
          .select("*", { count: "exact", head: true })
          .ilike("clube_nome", "Vila Nova");
        setVotosVila(count || 0);
      } catch (e) {
        console.error("Erro Supabase:", e);
      }
    };
    fetchVotes();
  }, []);

  // Se estiver carregando o perfil, mostra o loader
  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <img src={logo} alt="Logo" className="h-8" />
          <span className="font-black italic text-xl uppercase tracking-tighter">HEART CLUB</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/50">
          <LogOut size={20} />
        </Button>
      </header>

      {/* NAV */}
      <nav className="flex gap-6 mb-8 overflow-x-auto">
        <Link to="/dashboard" className="text-[10px] font-black uppercase italic opacity-50 flex items-center gap-2">
          <LayoutDashboard size={14} /> Dashboard
        </Link>
        <Link to="/stats" className="text-[10px] font-black uppercase italic text-[#ff6200] flex items-center gap-2">
          <BarChart3 size={14} /> Estatísticas
        </Link>
      </nav>

      {/* BANNER TIGRÃO */}
      <main className="max-w-4xl mx-auto space-y-6">
        <div className="bg-[#E20E0E] rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl border-4 border-white/10">
          <div className="relative z-10">
            <h1 className="text-5xl md:text-6xl font-black italic uppercase leading-none">Vila Nova</h1>
            <p className="font-bold opacity-80 uppercase tracking-[0.2em] text-xs mt-2 text-white">Dados do Censo</p>
          </div>
          <Shield size={180} className="absolute right-[-30px] bottom-[-30px] opacity-20 rotate-12 text-white" />
        </div>

        {/* CONTADOR REAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/80 p-10 rounded-[2.5rem] border border-white/10 text-center shadow-xl">
            <Users className="mx-auto mb-4 text-[#ff6200]" size={56} />
            <p className="text-7xl font-black italic leading-none mb-2 text-white">{votosVila}</p>
            <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Torcedores Cadastrados</p>
          </div>

          <div className="bg-zinc-900/30 p-10 rounded-[2.5rem] border border-dashed border-white/10 text-center flex flex-col justify-center items-center opacity-40">
            <BarChart3 className="mb-4 text-blue-500" size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest italic">Aguardando mais dados...</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Stats;
