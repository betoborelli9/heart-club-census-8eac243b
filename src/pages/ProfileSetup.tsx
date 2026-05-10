/**
 * [CAMINHO]: src/pages/ProfileSetup.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 5.0 (CADASTRADOR DE PERFIL LIMPO)
 * [DESCRIÇÃO]: Cadastro inicial simplificado. 
 * [MÓDULOS]:
 * 1. Módulo de Autenticação e Guards.
 * 2. Módulo de Estados e Formulário Básico.
 * 3. Módulo de Persistência (Supabase Profile).
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ChevronRight, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const ProfileSetup = () => {
  /* ---------- MÓDULO 1: NAVEGAÇÃO E GUARDS ---------- */
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading, updateProfile } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  /* ---------- MÓDULO 2: ESTADOS DO FORMULÁRIO ---------- */
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [saving, setSaving] = useState(false);

  // Sincronização inicial com metadados do Auth ou Profile existente
  useEffect(() => {
    if (profile) {
      setNome(profile.nome_exibicao || user?.user_metadata?.full_name || "");
      setDataNascimento(profile.data_nascimento || "");
      setGenero(profile.genero || "");
    } else if (user) {
      setNome(user.user_metadata?.full_name || "");
    }
  }, [profile, user]);

  /* ---------- MÓDULO 3: PERSISTÊNCIA E LOGICA DE NEGÓCIO ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !dataNascimento || !genero) {
      toast({ variant: "destructive", title: "Campos obrigatórios ausentes." });
      return;
    }
    
    setSaving(true);
    try {
      /**
       * ATENÇÃO: CEP, Cidade e Estado foram removidos deste fluxo.
       * A captura de localização agora é EXCLUSIVA do AddressModal no Mapa de Calor.
       */
      await updateProfile({
        nome_exibicao: nome.trim(),
        data_nascimento: dataNascimento,
        genero,
      });
      toast({ title: "Perfil salvo! ✅" });
      navigate("/voting", { replace: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar perfil no Supabase." });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = nome.trim() && dataNascimento && genero;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div 
        className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 60%)" }} 
      />

      <motion.div 
        initial={{ y: 30, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="w-full max-w-md space-y-6 relative z-10"
      >
        <div className="text-center space-y-2">
          <img src={logo} alt="Heart Club" className="mx-auto h-12 w-auto object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground">Complete seu perfil</h1>
          <p className="text-sm text-muted-foreground">Identidade básica para a comunidade.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="glass-card rounded-xl p-5 space-y-4">
            {/* Campo: Nome */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Nome de Exibição</Label>
              <Input 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                placeholder="Seu apelido ou nome" 
                className="h-12 bg-secondary/30 border-border/30" 
                required 
              />
            </div>

            {/* Campo: Nascimento */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Cake className="w-4 h-4 text-primary" /> Data de Nascimento
              </Label>
              <Input 
                type="date" 
                value={dataNascimento} 
                onChange={e => setDataNascimento(e.target.value)} 
                className="h-12 bg-secondary/30 border-border/30" 
                required 
              />
            </div>

            {/* Campo: Gênero */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Gênero</Label>
              <Select value={genero} onValueChange={setGenero}>
                <SelectTrigger className="h-12 bg-secondary/30 border-border/30">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                  <SelectItem value="prefiro-nao-dizer">Prefiro não dizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 font-bold text-lg btn-orange-gradient rounded-xl shadow-lg" 
            disabled={!canSubmit || saving}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ChevronRight className="w-5 h-5 mr-2" />}
            Continuar para Votação
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/pages/ProfileSetup.tsx
 * VERSÃO: 5.0
 * - Remoção de redundância de localização (CEP/Cidade/Estado).
 * - Centralização da captura de endereço no componente AddressModal.
 * - Sincronização direta com a tabela 'profiles' do Supabase.
 */