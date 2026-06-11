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
import { useTranslationApp } from "@/hooks/useTranslationApp";
import logo from "@/assets/logo.png";

const ProfileSetup = () => {
  /* ---------- MÓDULO 1: NAVEGAÇÃO E GUARDS ---------- */
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading, isAuthReady, isProfileComplete, hasVoted, updateProfile } = useUser();
  const { toast } = useToast();
  const { t } = useTranslationApp();

  // Guard: se não autenticado vai para login; se perfil já completo, nunca mais mostra este passo.
  useEffect(() => {
    if (!isAuthReady || isLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (isProfileComplete) {
      navigate(hasVoted ? "/dashboard" : "/voting", { replace: true });
    }
  }, [isAuthReady, isLoading, isAuthenticated, isProfileComplete, hasVoted, navigate]);

  /* ---------- MÓDULO 2: ESTADOS DO FORMULÁRIO ---------- */
  const [nome, setNome] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [genero, setGenero] = useState("");
  const [saving, setSaving] = useState(false);

  // Data concatenada YYYY-MM-DD
  const dataNascimento = dia && mes && ano ? `${ano}-${mes}-${dia}` : "";

  // Sincronização inicial com metadados do Auth ou Profile existente
  useEffect(() => {
    if (profile) {
      setNome(profile.nome_exibicao || user?.user_metadata?.full_name || "");
      if (profile.data_nascimento) {
        const [y, m, d] = profile.data_nascimento.split("-");
        setAno(y || ""); setMes(m || ""); setDia(d || "");
      }
      setGenero(profile.genero || "");
    } else if (user) {
      setNome(user.user_metadata?.full_name || "");
    }
  }, [profile, user]);

  const MESES = [
    { v: "01", l: t("profile.months.1") }, { v: "02", l: t("profile.months.2") }, { v: "03", l: t("profile.months.3") },
    { v: "04", l: t("profile.months.4") }, { v: "05", l: t("profile.months.5") }, { v: "06", l: t("profile.months.6") },
    { v: "07", l: t("profile.months.7") }, { v: "08", l: t("profile.months.8") }, { v: "09", l: t("profile.months.9") },
    { v: "10", l: t("profile.months.10") }, { v: "11", l: t("profile.months.11") }, { v: "12", l: t("profile.months.12") },
  ];
  const DIAS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const ANO_ATUAL = new Date().getFullYear();
  const ANOS = Array.from({ length: ANO_ATUAL - 1920 + 1 }, (_, i) => String(ANO_ATUAL - i));

  /* ---------- MÓDULO 3: PERSISTÊNCIA E LOGICA DE NEGÓCIO ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !dataNascimento || !genero) {
      toast({ variant: "destructive", title: t("profile.required_missing") });
      return;
    }
    
    setSaving(true);
    try {
      await updateProfile({
        nome_exibicao: nome.trim(),
        data_nascimento: dataNascimento,
        genero,
      });
      toast({ title: t("profile.saved") });
      navigate("/voting", { replace: true });
    } catch (error) {
      toast({ variant: "destructive", title: t("profile.save_error") });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = nome.trim() && dataNascimento && genero;

  if (!isAuthReady || isLoading || !isAuthenticated) {
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
          <h1 className="text-2xl font-display font-bold text-foreground">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="glass-card rounded-xl p-5 space-y-4">
            {/* Campo: Nome */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t("profile.display_name")}</Label>
              <Input 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                placeholder={t("profile.display_name_placeholder")} 
                className="h-12 bg-secondary/30 border-border/30" 
                required 
              />
            </div>

            {/* Campo: Nascimento (Dia / Mês / Ano) */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Cake className="w-4 h-4 text-primary" /> {t("profile.birth_date")}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={dia} onValueChange={setDia}>
                  <SelectTrigger className="h-12 bg-secondary/30 border-border/30 focus:border-primary data-[state=open]:border-primary">
                    <SelectValue placeholder={t("profile.day")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {DIAS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger className="h-12 bg-secondary/30 border-border/30 focus:border-primary data-[state=open]:border-primary">
                    <SelectValue placeholder={t("profile.month")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {MESES.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={ano} onValueChange={setAno}>
                  <SelectTrigger className="h-12 bg-secondary/30 border-border/30 focus:border-primary data-[state=open]:border-primary">
                    <SelectValue placeholder={t("profile.year")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ANOS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo: Gênero */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t("profile.gender")}</Label>
              <Select value={genero} onValueChange={setGenero}>
                <SelectTrigger className="h-12 bg-secondary/30 border-border/30">
                  <SelectValue placeholder={t("profile.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">{t("profile.male")}</SelectItem>
                  <SelectItem value="feminino">{t("profile.female")}</SelectItem>
                  <SelectItem value="outros">{t("profile.other")}</SelectItem>
                  <SelectItem value="prefiro-nao-dizer">{t("profile.prefer_not_say")}</SelectItem>
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
            {t("profile.continue")}
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