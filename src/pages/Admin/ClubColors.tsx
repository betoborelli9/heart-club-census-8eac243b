/**
 * [CAMINHO/ARQUIVO]: src/pages/Admin/ClubColors.tsx
 * [MÓDULO]: ADMIN — INVESTIGAÇÃO DE CORES (GEMINI DIRETO)
 * [STATUS]: VERSÃO 1.0 (SELF-CONTAINED + MASTER-ONLY)
 * [DESCRIÇÃO]:
 *   Página exclusiva do Master Admin (betoborelli9@gmail.com).
 *   Busca clube via API-Football (apenas nome) e investiga cores/mascote/divisão
 *   diretamente no Gemini 2.5 Flash, com prompt blindado contra cores de contorno
 *   de escudo e estrelas. Salva resultado na tabela clubes_cache.
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Save, Sparkles, ShieldX, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  searchClubsWithFallback,
  type ClubSearchResult,
} from "@/lib/search-clubs";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: TIPAGEM
   ═══════════════════════════════════════════════════════════ */
type ColorStructure = "BICOLOR" | "TRICOLOR" | "QUADRICOLOR";

interface AIResult {
  nome_confirmado: string;
  mascote: string;
  divisao_2026: string;
  estrutura: ColorStructure;
  cores: string[]; // 2, 3 ou 4 cores HEX
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: PROMPT GEMINI (CABRESTO)
   ═══════════════════════════════════════════════════════════ */
const buildPrompt = (clubName: string) => `
Você é um especialista em identidade visual de clubes de futebol.

INVESTIGAÇÃO SOLICITADA: "${clubName}"

FONTE PRIMÁRIA OBRIGATÓRIA: Wikipedia (pt e en). Leia a descrição textual
do uniforme/camisa (Jersey) — NÃO interprete o escudo.

REGRAS DE OURO:
1. VETO DE CONTORNO: É PROIBIDO incluir cores que existem APENAS no contorno
   do escudo, em estrelas ou em pequenos detalhes decorativos.
   Exemplo: Vila Nova-GO é BICOLOR (Vermelho e Branco). O preto é só contorno.
2. Brusque-SC é QUADRICOLOR (Amarelo, Verde, Vermelho e Branco).
3. Santa Cruz-PE é TRICOLOR (Vermelho, Preto e Branco).
4. Use SEMPRE as cores oficiais do uniforme titular descritas na Wikipedia.

COMPETIÇÃO 2026 (Data atual: Abril/2026):
- Brasil: Identifique a competição mais importante em ABRIL/2026.
  Hierarquia: Série A > Série B > Série C > Série D > Estadual.
- Estrangeiros: Liga Nacional Principal do país de origem.

ESTRUTURA DE CORES (ESCOLHA EXATAMENTE UMA):
- BICOLOR: 2 cores no array.
- TRICOLOR: 3 cores no array.
- QUADRICOLOR: 4 cores no array.

OUTPUT: Retorne EXCLUSIVAMENTE JSON puro (sem markdown, sem comentários):
{
  "nome_confirmado": "Nome oficial",
  "mascote": "Nome do mascote",
  "divisao_2026": "Série A | Série B | ... | Estadual XX | La Liga | ...",
  "estrutura": "BICOLOR | TRICOLOR | QUADRICOLOR",
  "cores": ["#HEX1","#HEX2", ...]
}
`.trim();

/* ═══════════════════════════════════════════════════════════
    MÓDULO: CHAMADA DIRETA AO GEMINI
   ═══════════════════════════════════════════════════════════ */
const apiKey = ""; // padrão do ambiente — chave injetada pelo runtime

async function investigateWithGemini(clubName: string): Promise<AIResult> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: buildPrompt(clubName) }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Normalização defensiva
  const cores = (parsed.cores || [])
    .map((c: string) => String(c).trim().toUpperCase())
    .filter((c: string) => /^#[0-9A-F]{6}$/.test(c));

  const estrutura: ColorStructure =
    cores.length >= 4 ? "QUADRICOLOR" : cores.length === 3 ? "TRICOLOR" : "BICOLOR";

  return {
    nome_confirmado: parsed.nome_confirmado || clubName,
    mascote: parsed.mascote || "—",
    divisao_2026: parsed.divisao_2026 || "—",
    estrutura,
    cores: cores.slice(0, 4),
  };
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: COMPONENTE DE COLUNA DE COR
   ═══════════════════════════════════════════════════════════ */
const ColorColumn = ({
  hex,
  index,
  active,
}: {
  hex: string | null;
  index: number;
  active: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="flex flex-col items-center gap-3"
  >
    {/* Quadrado grande */}
    <div
      className={`w-full aspect-square rounded-2xl border-2 shadow-lg flex items-center justify-center ${
        active ? "border-white/20" : "border-white/5"
      }`}
      style={{ backgroundColor: active ? (hex as string) : "#262626" }}
    >
      {!active && <ShieldX className="w-10 h-10 text-white/20" />}
    </div>
    {/* Quadrado pequeno + HEX */}
    <div className="w-full flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-md border ${active ? "border-white/30" : "border-white/10"}`}
        style={{ backgroundColor: active ? (hex as string) : "#1a1a1a" }}
      />
      <span className="text-xs font-black italic tracking-widest text-white/80">
        {active ? hex : "—"}
      </span>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════
    MÓDULO: COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
const ClubColors = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ClubSearchResult[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const [selected, setSelected] = useState<ClubSearchResult | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [saving, setSaving] = useState(false);

  /* ─── Guard de Acesso ─── */
  useEffect(() => {
    if (isLoading) return;
    if (!user || user.email !== "betoborelli9@gmail.com") {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  /* ─── Autocomplete (debounce simples) ─── */
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggest(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchClubsWithFallback(query, 10);
        setSuggestions(r);
      } finally {
        setLoadingSuggest(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  /* ─── Selecionar clube e disparar IA ─── */
  const handleSelect = async (club: ClubSearchResult) => {
    setSelected(club);
    setSuggestions([]);
    setQuery(club.name);
    setResult(null);
    setInvestigating(true);
    try {
      const ai = await investigateWithGemini(club.name);
      setResult(ai);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha desconhecida";
      toast.error("Falha na investigação", { description: msg });
    } finally {
      setInvestigating(false);
    }
  };

  /* ─── Salvar no cache ─── */
  const handleSave = async () => {
    if (!result || !selected) return;
    setSaving(true);
    try {
      const payload = {
        nome: result.nome_confirmado,
        mascote: result.mascote,
        division: result.divisao_2026,
        cor_primaria: result.cores[0] || null,
        cor_secundaria: result.cores[1] || null,
        cor_terciaria: result.cores[2] || null,
        cor_quarta: result.cores[3] || null,
        escudo_url: selected.logo || null,
        cidade: selected.city || "Desconhecida",
        pais: selected.country || "Brasil",
        atualizado_em: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("clubes_cache")
        .upsert(payload, { onConflict: "nome" });
      if (error) throw error;
      toast.success("Salvo no cache!", {
        description: `${result.nome_confirmado} atualizado.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Falha ao salvar", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  /* ─── Render dos slots de cor (sempre 4 colunas) ─── */
  const slots = useMemo(() => {
    const activeCount =
      result?.estrutura === "QUADRICOLOR"
        ? 4
        : result?.estrutura === "TRICOLOR"
        ? 3
        : result?.estrutura === "BICOLOR"
        ? 2
        : 0;
    return [0, 1, 2, 3].map((i) => ({
      hex: result?.cores[i] || null,
      active: i < activeCount,
    }));
  }, [result]);

  /* ═══════════════════════════════════════════════════════════
      RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 text-orange-500" />
            <h1 className="font-black italic text-xl md:text-2xl tracking-wide">
              CORES <span className="text-orange-500">/</span> INVESTIGAÇÃO IA
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-white/60 hover:text-white"
          >
            VOLTAR
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* SEÇÃO: BUSCA */}
        <section className="space-y-3">
          <label className="text-xs font-black italic tracking-widest text-white/50 uppercase">
            Buscar clube (mín. 3 letras)
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Vila Nova, Brusque, Santa Cruz..."
              className="pl-12 h-14 bg-white/5 border-white/10 text-white text-lg font-semibold focus-visible:ring-orange-500"
            />
            {loadingSuggest && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-orange-500" />
            )}
          </div>

          {/* Dropdown de sugestões */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 shadow-2xl"
              >
                {suggestions.map((c) => (
                  <li
                    key={c.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(c);
                    }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition"
                  >
                    {c.logo ? (
                      <img src={c.logo} alt="" className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-white/5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{c.name}</p>
                      <p className="text-xs text-white/50 truncate">{c.location}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-white/30">
                      {c.source}
                    </span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>

        {/* SEÇÃO: INVESTIGAÇÃO */}
        {investigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-3 py-16 text-white/60"
          >
            <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
            <span className="font-black italic tracking-widest text-sm">
              INVESTIGANDO COM GEMINI...
            </span>
          </motion.div>
        )}

        {/* SEÇÃO: RESULTADO */}
        <AnimatePresence>
          {result && !investigating && (
            <motion.section
              key={result.nome_confirmado}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Header do clube */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-white/5 to-transparent border border-white/10">
                {selected?.logo ? (
                  <img
                    src={selected.logo}
                    alt={result.nome_confirmado}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/5" />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-black italic text-2xl md:text-3xl truncate">
                    {result.nome_confirmado}
                  </h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm text-white/60 mt-1">
                    <span>
                      Mascote: <strong className="text-white/90">{result.mascote}</strong>
                    </span>
                    <span>
                      Divisão 2026:{" "}
                      <strong className="text-orange-400">{result.divisao_2026}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-black text-[10px] tracking-widest">
                      {result.estrutura}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 colunas de cores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {slots.map((s, i) => (
                  <ColorColumn key={i} hex={s.hex} index={i} active={s.active} />
                ))}
              </div>

              {/* Botão salvar */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-black italic tracking-widest h-12 px-6"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  SALVAR NO CACHE
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ClubColors;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/pages/Admin/ClubColors.tsx
 * VERSÃO: 1.0
 * REGRAS DE BLINDAGEM:
 *  - Acesso restrito a betoborelli9@gmail.com (redirect para "/" caso contrário).
 *  - API-Football usada APENAS para resolver nome/escudo/localização.
 *  - Gemini 2.5 Flash com prompt anti-contorno (veto de cores de borda do escudo).
 *  - Estrutura BICOLOR (2) | TRICOLOR (3) | QUADRICOLOR (4) — colunas inativas em cinza com X.
 *  - Persistência via upsert em clubes_cache (onConflict: nome).
 *  - apiKey = "" (chave injetada pelo runtime, conforme padrão solicitado).
 */
