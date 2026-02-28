import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

interface ProfileQuestion {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

const QUESTIONS: ProfileQuestion[] = [
  {
    key: "classe_social",
    label: "Qual a sua faixa de renda familiar?",
    options: [
      { value: "ate-2sm", label: "Até 2 salários mínimos" },
      { value: "2-5sm", label: "2 a 5 salários mínimos" },
      { value: "5-10sm", label: "5 a 10 salários mínimos" },
      { value: "10-20sm", label: "10 a 20 salários mínimos" },
      { value: "acima-20sm", label: "Acima de 20 salários mínimos" },
      { value: "prefiro-nao-dizer", label: "Prefiro não dizer" },
    ],
  },
  {
    key: "profissao",
    label: "Qual a sua área de atuação profissional?",
    options: [
      { value: "tecnologia", label: "Tecnologia / TI" },
      { value: "saude", label: "Saúde" },
      { value: "educacao", label: "Educação" },
      { value: "comercio", label: "Comércio" },
      { value: "industria", label: "Indústria" },
      { value: "servicos", label: "Serviços" },
      { value: "autonomo", label: "Autônomo / Freelancer" },
      { value: "estudante", label: "Estudante" },
      { value: "aposentado", label: "Aposentado(a)" },
      { value: "outro", label: "Outro" },
    ],
  },
];

const ProgressiveProfile = () => {
  const { profile, updateProfile } = useUser();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Find the first unanswered question
  const pendingQuestion = QUESTIONS.find(
    (q) => !dismissed.has(q.key) && !(profile as any)?.[q.key]
  );

  if (!pendingQuestion) return null;

  const handleAnswer = async (value: string) => {
    setSaving(true);
    try {
      await updateProfile({ [pendingQuestion.key]: value } as any);
      toast({ title: "Resposta salva! ✅", duration: 1500 });
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    setDismissed((prev) => new Set(prev).add(pendingQuestion.key));
  };

  return (
    <AnimatePresence>
      <motion.div
        key={pendingQuestion.key}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="glass-card rounded-xl p-4 border border-primary/20 relative"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--gradient-orange)" }}
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Pergunta rápida</p>
              <p className="text-sm font-semibold text-foreground">{pendingQuestion.label}</p>
            </div>
            <Select onValueChange={handleAnswer} disabled={saving}>
              <SelectTrigger className="h-10 bg-secondary/30 border-border/30">
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                {pendingQuestion.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              📊 Suas respostas ajudam a mapear o perfil da torcida brasileira.
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProgressiveProfile;
