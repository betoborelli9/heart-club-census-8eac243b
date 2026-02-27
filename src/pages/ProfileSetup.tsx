import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isProfileComplete, hasVoted, isLoading, updateProfile } = useUser();
  const { toast } = useToast();

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome_exibicao || user?.user_metadata?.full_name || "");
      setDataNascimento(profile.data_nascimento || "");
      setGenero(profile.genero || "");
      setCidade(profile.cidade || "");
      setEstado(profile.estado || "");
    } else if (user) {
      setNome(user.user_metadata?.full_name || "");
    }
  }, [profile, user]);

  useEffect(() => {
    if (!cidade && !estado) {
      setDetectingLocation(true);
      fetch("https://ipapi.co/json/")
        .then(r => r.json())
        .then(data => {
          if (data.city) {
            setDetectedCity(data.city);
            setCidade(data.city);
          }
          if (data.region_code) {
            setDetectedState(data.region_code);
            setEstado(data.region_code);
          }
        })
        .catch(() => {})
        .finally(() => setDetectingLocation(false));
    }
  }, []);

  const handleConfirmLocation = () => {
    setLocationConfirmed(true);
  };

  const handleDenyLocation = () => {
    setLocationConfirmed(false);
    setCidade("");
    setEstado("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !dataNascimento || !genero || !cidade.trim() || !estado) return;
    setSaving(true);
    try {
      await updateProfile({
        nome_exibicao: nome.trim(),
        data_nascimento: dataNascimento,
        genero,
        cidade: cidade.trim(),
        estado,
        pais: "BR",
      });
      toast({ title: "Perfil salvo! ✅" });
      navigate("/voting", { replace: true });
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar perfil" });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = nome.trim() && dataNascimento && genero && cidade.trim() && estado;

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const showLocationQuestion = detectedCity && locationConfirmed === null && !detectingLocation;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, hsl(24 100% 50%) 0%, transparent 60%)" }} />

      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <img src={logo} alt="Heart Club" className="mx-auto w-16 h-16 object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground">Complete seu perfil</h1>
          <p className="text-sm text-muted-foreground">Como você quer ser chamado na comunidade?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu apelido ou nome" className="h-12 bg-secondary/30 border-border/30" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Data de Nascimento</Label>
              <Input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="h-12 bg-secondary/30 border-border/30" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Gênero</Label>
              <Select value={genero} onValueChange={setGenero}>
                <SelectTrigger className="h-12 bg-secondary/30 border-border/30"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                  <SelectItem value="prefiro-nao-dizer">Prefiro não dizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 space-y-4">
            {/* Location detection banner */}
            {detectingLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Detectando sua localização...</span>
              </div>
            )}

            {showLocationQuestion && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Você mora em <strong className="text-primary">{detectedCity}{detectedState ? `/${detectedState}` : ''}</strong>, correto?
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleConfirmLocation} className="btn-orange-gradient text-xs gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Sim, correto!
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleDenyLocation} className="text-xs gap-1 border-border/50">
                    <XCircle className="w-3.5 h-3.5" /> Não, vou corrigir
                  </Button>
                </div>
              </motion.div>
            )}

            {locationConfirmed === true && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="w-4 h-4" />
                <span>Localização confirmada: {cidade}/{estado}</span>
              </div>
            )}

            {(locationConfirmed === false || !detectedCity) && !detectingLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Informe sua localização</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cidade</Label>
                <Input
                  value={cidade}
                  onChange={e => { setCidade(e.target.value); if (locationConfirmed === true) setLocationConfirmed(null); }}
                  placeholder="Sua cidade"
                  className="h-10 bg-secondary/30 border-border/30"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={estado} onValueChange={v => { setEstado(v); if (locationConfirmed === true) setLocationConfirmed(null); }}>
                  <SelectTrigger className="h-10 bg-secondary/30 border-border/30"><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              📍 Usamos sua localização para mostrar o engajamento da torcida na sua região.
            </p>
          </div>

          <Button type="submit" className="w-full h-14 font-bold text-lg btn-orange-gradient rounded-xl" disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ChevronRight className="w-5 h-5 mr-2" />}
            Continuar para Votação
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;
