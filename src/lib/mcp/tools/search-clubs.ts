/**
 * MCP tool: search_clubs
 * Full-text/ILIKE search over the public clubes_cache table.
 */
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabase } from "../supabase";

export default defineTool({
  name: "search_clubs",
  title: "Search football clubs",
  description:
    "Search the Heart Club catalog of football clubs by name. Returns basic identity (name, city, country, mascot, colors, stadium).",
  inputSchema: {
    query: z.string().min(1).describe("Club name or fragment, e.g. 'Flamengo' or 'Real Madrid'."),
    limit: z.number().int().min(1).max(25).optional().describe("Maximum results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("clubes_cache")
      .select("id,nome,nome_curto,pais,cidade,mascote,cor_primaria,cor_secundaria,escudo_url,estadio_nome,fundado")
      .ilike("nome", `%${query}%`)
      .limit(limit ?? 10);

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { clubs: data ?? [] },
    };
  },
});
