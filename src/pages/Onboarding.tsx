import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronRight, ChevronLeft, Search, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { clubs, Club } from "@/data/clubs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const stepVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateProfile, castVote } = useUser();
  const [step, setStep] = useState(1);

  // Step 1
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");

  // Step 2
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 3
  const [sympathyClubs, setSympathyClubs] = useState<string[]>([]);
  const [sympathySearch, setSympathySearch] = useState("");

  const filteredClubs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return clubs.slice(0, 12);
    return clubs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const sympathyFiltered = useMemo(() => {
    const q = sympathySearch.toLowerCase();
    const available = clubs.filter((c) => c.id !== selectedClub?.id);
    if (!q) return available.slice(0, 12);
    return available.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q)
    );
  }, [sympathySearch, selectedClub]);

  // Guards after all hooks
  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.hasVoted) {
    navigate("/dashboard");
    return null;
  }

  const toggleSympathy = (id: string) => {
    setSympathyClubs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleConfirmVote = () => {
    if (!selectedClub) return;
    updateProfile({ fullName, birthDate, city });
    castVote(selectedClub.id, sympathyClubs);
    navigate("/dashboard");
  };

  const canProceedStep1 = fullName.trim() && birthDate && city.trim();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Heart className="w-8 h-8 text-primary mx-auto" fill="currentColor" />
          <h2 className="text-xl font-bold text-foreground">Voto Sagrado</h2>
          <p className="text-sm text-muted-foreground">Etapa {step} de 3</p>
        </div>

        <Progress value={(step / 3) * 100} className="h-2" />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sua cidade" />
              </div>
              <Button
                className="w-full h-12 font-bold"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <p className="text-center text-sm text-muted-foreground font-medium">
                Escolha seu Clube do Coração. <span className="text-destructive font-bold">Este voto é eterno!</span>
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar clube..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {filteredClubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => setSelectedClub(club)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm ${
                      selectedClub?.id === club.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50 bg-card"
                    }`}
                  >
                    <span className="text-xl">{club.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{club.name}</p>
                      <p className="text-xs text-muted-foreground">{club.state}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  className="flex-1 h-12 font-bold"
                  disabled={!selectedClub}
                  onClick={() => setShowConfirm(true)}
                >
                  Confirmar <Heart className="w-4 h-4 ml-1" fill="currentColor" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <p className="text-center text-sm text-muted-foreground">
                Escolha até <strong>4 clubes de simpatia</strong> (opcional)
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar clube..."
                  value={sympathySearch}
                  onChange={(e) => setSympathySearch(e.target.value)}
                />
              </div>

              {sympathyClubs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sympathyClubs.map((id) => {
                    const c = clubs.find((x) => x.id === id);
                    return c ? (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full cursor-pointer"
                        onClick={() => toggleSympathy(id)}
                      >
                        {c.emoji} {c.shortName} ✕
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {sympathyFiltered.map((club) => {
                  const selected = sympathyClubs.includes(club.id);
                  return (
                    <button
                      key={club.id}
                      onClick={() => toggleSympathy(club.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 text-primary shrink-0" />}
                      <span className="text-lg">{club.emoji}</span>
                      <span className="font-medium text-foreground truncate">{club.name}</span>
                    </button>
                  );
                })}
              </div>

              <Button className="w-full h-12 font-bold" onClick={handleConfirmVote}>
                Finalizar Cadastro <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Voto Sagrado
            </DialogTitle>
            <DialogDescription>
              Você está prestes a declarar{" "}
              <strong className="text-foreground">{selectedClub?.name}</strong> como seu Clube do Coração.
              <br /><br />
              <span className="text-destructive font-semibold">Este voto é eterno e não poderá ser alterado.</span>
              <br />Tem certeza?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Voltar
            </Button>
            <Button
              onClick={() => {
                setShowConfirm(false);
                setStep(3);
              }}
              className="font-bold"
            >
              <Heart className="w-4 h-4 mr-1" fill="currentColor" />
              Confirmar para sempre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Onboarding;
