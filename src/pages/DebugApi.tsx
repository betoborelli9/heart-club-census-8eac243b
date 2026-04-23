/**
 * [CAMINHO]: src/pages/DebugApi.tsx
 * [CONTEXTO]: Página técnica ultra-minimalista para validar a Edge Function search-clubs (API-Football).
 * [REGRA]: Apenas leitura. Autocomplete a partir de 3 letras com debounce de 300ms.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Result {
  api_id: number;
  name: string;
  city: string;
  country: string;
  logo: string;
  source: string;
  shortName?: string;
}

export default function DebugApi() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 3) {
      setResults([]);
      setError(null);
      setRaw(null);
      setLoading(false);
      return;
    }

    const myId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    const handle = setTimeout(async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("search-clubs", {
          body: { query: term },
        });

        if (myId !== reqIdRef.current) return;

        if (fnErr) {
          setError(String(fnErr.message || fnErr));
          setResults([]);
          setRaw(fnErr);
        } else if (Array.isArray(data)) {
          setResults(data as Result[]);
          setRaw(data);
        } else if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
          setError(String((data as Record<string, unknown>).error));
          setResults([]);
          setRaw(data);
        } else {
          setResults([]);
          setRaw(data);
        }
      } catch (err) {
        if (myId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setResults([]);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#000", fontFamily: "monospace", padding: 24 }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>DEBUG /search-clubs</h1>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Digite ao menos 3 letras (NOME do clube — ex: 'Atletico', 'Goias', 'Vasco')"
        autoFocus
        style={{
          width: "100%",
          padding: 10,
          border: "1px solid #000",
          background: "#fff",
          color: "#000",
          fontFamily: "monospace",
          fontSize: 14,
          marginBottom: 12,
        }}
      />

      <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
        {query.trim().length > 0 && query.trim().length < 3 && "Mínimo 3 caracteres."}
        {query.trim().length >= 3 && (loading ? "Buscando..." : `Total: ${results.length}`)}
      </div>

      {error && (
        <pre style={{ border: "1px solid #000", padding: 10, background: "#f5f5f5", color: "#000", whiteSpace: "pre-wrap", marginBottom: 12 }}>
          ERRO: {error}
        </pre>
      )}

      {results.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th style={th}>api_id</th>
              <th style={th}>name</th>
              <th style={th}>city</th>
              <th style={th}>country</th>
              <th style={th}>source</th>
              <th style={th}>logo</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={`${r.api_id}-${r.name}`} style={{ borderTop: "1px solid #ccc" }}>
                <td style={td}>{r.api_id}</td>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.city || "-"}</td>
                <td style={td}>{r.country || "-"}</td>
                <td style={td}>{r.source}</td>
                <td style={td}>
                  {r.logo ? (
                    <a href={r.logo} target="_blank" rel="noreferrer" style={{ color: "#000" }}>
                      {r.logo}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <details>
        <summary style={{ cursor: "pointer", fontSize: 12 }}>RAW JSON</summary>
        <pre style={{ border: "1px solid #ccc", padding: 10, background: "#fafafa", fontSize: 11, overflow: "auto", maxHeight: 400 }}>
          {raw ? JSON.stringify(raw, null, 2) : "(vazio)"}
        </pre>
      </details>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 6, border: "1px solid #999", fontWeight: "bold" };
const td: React.CSSProperties = { padding: 6, border: "1px solid #ccc", verticalAlign: "top", wordBreak: "break-all" };

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 2.0
 * - Autocomplete com debounce 300ms a partir de 3 letras.
 * - Cancela respostas obsoletas via reqId.
 * - Apenas leitura na Edge Function search-clubs (API-Football).
 */
