import { useState } from "react";
import { Loader2, Search } from "lucide-react";

const GEMINI_API_KEY = "SUA_CHAVE_AQUI";

interface ColorResult {
  cores: string[];
}

const ClubColorSearch = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [colors, setColors] = useState<string[]>([]);

  const fetchColors = async () => {
    if (!query || query.length < 3) return;

    setLoading(true);
    setColors([]);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `
Retorne apenas JSON válido com as cores do uniforme principal do clube "${query}".

Formato:
{
  "cores": ["#HEX", "#HEX", "#HEX"]
}

Regras:
- Máximo 4 cores
- Usar cores do uniforme principal (camisa)
- Não incluir texto fora do JSON
`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Sem resposta da IA");

      const parsed: ColorResult = JSON.parse(text);
      setColors(parsed.cores || []);
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar cores");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-black italic text-center">BUSCAR CORES DO CLUBE</h1>

        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Flamengo, Barcelona..."
            className="flex-1 h-14 px-4 bg-white/5 border border-white/10 rounded-xl text-lg font-bold italic outline-none"
          />

          <button
            onClick={fetchColors}
            className="px-6 bg-orange-600 hover:bg-orange-500 rounded-xl flex items-center gap-2 font-bold"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </button>
        </div>

        {/* RESULTADO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {colors.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="w-24 h-24 rounded-2xl border border-white/10 shadow-lg"
                style={{ backgroundColor: color }}
              />

              <span className="text-xs font-mono font-bold">{color.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClubColorSearch;
