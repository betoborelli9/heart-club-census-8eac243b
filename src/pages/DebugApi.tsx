/**
 * [CAMINHO]: src/pages/DebugApi.tsx
 * [STATUS]: DEBUG - Validação crua da Edge Function search-clubs
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DebugApi() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<string>("");

  const handleSearch = async () => {
    setError("");
    setResults([]);
    setRaw("");
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-clubs", {
        body: { query },
      });
      if (error) {
        setError(`Edge Function error: ${error.message}`);
        setRaw(JSON.stringify(error, null, 2));
      } else {
        setRaw(JSON.stringify(data, null, 2));
        if (Array.isArray(data)) {
          setResults(data);
        } else if (data?.error) {
          setError(`API error: ${data.error}`);
        } else {
          setError("Resposta em formato inesperado");
        }
      }
    } catch (e: any) {
      setError(`Exception: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#fff", color: "#000", minHeight: "100vh", padding: 20, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>DEBUG /search-clubs</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="ex: Atletico"
          style={{
            flex: 1,
            padding: 8,
            border: "1px solid #000",
            background: "#fff",
            color: "#000",
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "8px 16px",
            border: "1px solid #000",
            background: "#000",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          {loading ? "..." : "BUSCAR"}
        </button>
      </div>

      {error && (
        <pre style={{ background: "#eee", color: "#000", padding: 12, border: "1px solid #999", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      <div style={{ marginBottom: 12, fontSize: 12, color: "#555" }}>
        Total: {results.length}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#eee" }}>
            <th style={cell}>api_id</th>
            <th style={cell}>name</th>
            <th style={cell}>city</th>
            <th style={cell}>country</th>
            <th style={cell}>source</th>
            <th style={cell}>logo</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td style={cell}>{String(r.api_id ?? "-")}</td>
              <td style={cell}>{String(r.name ?? "-")}</td>
              <td style={cell}>{String(r.city ?? "-")}</td>
              <td style={cell}>{String(r.country ?? "-")}</td>
              <td style={cell}>{String(r.source ?? "-")}</td>
              <td style={cell}>
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

      {raw && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: "pointer" }}>RAW JSON</summary>
          <pre style={{ background: "#f5f5f5", padding: 12, border: "1px solid #ccc", whiteSpace: "pre-wrap", fontSize: 11 }}>
            {raw}
          </pre>
        </details>
      )}
    </div>
  );
}

const cell: React.CSSProperties = {
  border: "1px solid #999",
  padding: 6,
  textAlign: "left",
  verticalAlign: "top",
  wordBreak: "break-all",
};
