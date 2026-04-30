import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, ChevronRight, Cake, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { CIDADES_POR_ESTADO } from "@/data/cidades-br";
import { lookupCep, formatCep } from "@/lib/address";
import logo from "@/assets/logo.png";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading, updateProfile } = useUser();
  const { toast } = useToast();

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [saving, setSaving] = useState(false);

  // Geolocation
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoDetected, setGeoDetected] = useState(false);
  const [geoConfirmed, setGeoConfirmed] = useState<boolean | null>(null);
  const geoAttempted = useRef(false);

  // City autocomplete
  const [cidadeQuery, setCidadeQuery] = useState("");
  const [showCidadeDropdown, setShowCidadeDropdown] = useState(false);

  // CEP lookup
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const handleCepLookup = async (raw: string) => {
    const formatted = formatCep(raw);
    setCep(formatted);
    setCepError(null);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const found = await lookupCep(digits);
      if (!found) {
        setCepError("CEP não encontrado.");
        return;
      }
      setEstado(found.estado);
      setCidade(found.cidade);
      setCidadeQuery(found.cidade);
      setGeoConfirmed(true);
    } finally {
      setCepLoading(false);
    }
  };

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
      if (profile.cidade && profile.estado) {
        setGeoConfirmed(true);
      }
    } else if (user) {
      setNome(user.user_metadata?.full_name || "");
    }
  }, [profile, user]);

  // Auto-detect geolocation on mount
  useEffect(() => {
    if (geoAttempted.current) return;
    if (profile?.cidade && profile?.estado) return;
    geoAttempted.current = true;

    if (!navigator.geolocation) return;

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`,
            { headers: { "User-Agent": "HeartClubApp/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const detectedCity = addr.city || addr.town || addr.municipality || addr.village || "";
          const detectedState = addr.state || "";

          // Match state to UF
          const ufMap: Record<string, string> = {
            "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM", "Bahia": "BA",
            "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO",
            "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG",
            "Pará": "PA", "Paraíba": "PB", "Paraná": "PR", "Pernambuco": "PE", "Piauí": "PI",
            "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS",
            "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP",
            "Sergipe": "SE", "Tocantins": "TO",
          };
          const uf = ufMap[detectedState] || "";

          if (detectedCity && uf) {
            setCidade(detectedCity);
            setEstado(uf);
            setGeoDetected(true);
          }
        } catch {
          // Silently fail — user can fill manually
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [profile]);

  const handleGeoConfirm = (confirmed: boolean) => {
    setGeoConfirmed(confirmed);
    if (!confirmed) {
      setCidade("");
      setEstado("");
      setGeoDetected(false);
    }
  };

  // City autocomplete filtering
  const cidadeOptions = useMemo(() => {
    if (!estado) return [];
    const cidades = CIDADES_POR_ESTADO[estado] || [];
    if (!cidadeQuery.trim()) return cidades.slice(0, 15);
    const q = cidadeQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cidades.filter(c =>
      c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
    ).slice(0, 15);
  }, [estado, cidadeQuery]);

  const handleEstadoChange = (uf: string) => {
    setEstado(uf);
    setCidade("");
    setCidadeQuery("");
    setGeoConfirmed(null);
    setGeoDetected(false);
  };

  const handleCidadeSelect = (c: string) => {
    setCidade(c);
    setCidadeQuery(c);
    setShowCidadeDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !dataNascimento || !genero || !cidade.trim() || !estado) return;
    setSaving(true);
    try {
      await updateProfile({
        nome_exibicao: nome.trim(), data_nascimento: dataNascimento, genero,
        cidade: cidade.trim(), estado, pais: "BR",
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 60%)" }} />

      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <img src={logo} alt="Heart Club" className="mx-auto w-16 h-16 object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground">Complete seu perfil</h1>
          <p className="text-sm text-muted-foreground">Como você quer ser chamado na comunidade?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal info card */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu apelido ou nome" className="h-12 bg-secondary/30 border-border/30" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Cake className="w-4 h-4 text-primary" /> Data de Nascimento
              </Label>
              <Input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="h-12 bg-secondary/30 border-border/30" required />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                🎂 Informe seu aniversário para receber congratulações e surpresas do Heart Club!
              </p>
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

          {/* Location card */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Sua localização</span>
              {geoLoading && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />}
            </div>

            {/* Geo confirmation prompt */}
            {geoDetected && geoConfirmed === null && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-3"
              >
                <p className="text-sm text-foreground font-medium text-center">
                  Você realmente mora em <span className="text-primary font-bold">{cidade}, {estado}</span>?
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleGeoConfirm(true)}
                    className="gap-1.5 bg-primary hover:bg-primary/90"
                  >
                    <Check className="w-4 h-4" /> Sim, é aqui
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleGeoConfirm(false)}
                    className="gap-1.5"
                  >
                    <X className="w-4 h-4" /> Não, corrigir
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Manual / confirmed fields */}
            {(geoConfirmed !== null || !geoDetected) && (
              <div className="grid grid-cols-[1fr_100px] gap-3">
                {/* City with autocomplete */}
                <div className="space-y-1.5 relative">
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  {estado ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={cidadeQuery || cidade}
                        onChange={e => {
                          setCidadeQuery(e.target.value);
                          setCidade(e.target.value);
                          setShowCidadeDropdown(true);
                        }}
                        onFocus={() => setShowCidadeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCidadeDropdown(false), 200)}
                        placeholder="Digite a cidade"
                        className="h-10 bg-secondary/30 border-border/30 pl-9"
                        required
                        autoComplete="off"
                      />
                      {showCidadeDropdown && cidadeOptions.length > 0 && (
                        <div className="absolute top-11 left-0 w-full bg-card border border-border/20 rounded-xl overflow-hidden z-50 shadow-xl max-h-[200px] overflow-y-auto">
                          {cidadeOptions.map(c => (
                            <button
                              key={c}
                              type="button"
                              onMouseDown={() => handleCidadeSelect(c)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors border-b border-border/5"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Input
                      value={cidade}
                      onChange={e => setCidade(e.target.value)}
                      placeholder="Selecione o estado →"
                      className="h-10 bg-secondary/30 border-border/30"
                      disabled
                    />
                  )}
                </div>

                {/* State dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={estado} onValueChange={handleEstadoChange}>
                    <SelectTrigger className="h-10 bg-secondary/30 border-border/30"><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
