/**
 * MCP tool: get_club_ranking
 * Returns the top clubs ranked by Voto Sagrado count (original votes only).
 */
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabase } from "../supabase";

export default defineTool({
  name: "get_club_ranking",
  title: "Get Heart Club ranking",
  description:
    "Return the top football clubs on Heart Club ranked by original vote count. Optionally filter by country or city.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many clubs to return (default 10)."),
    country: z.string().optional().describe("Optional country filter, e.g. 'Brasil'."),
    city: z.string().optional().describe("Optional city filter, e.g. 'São Paulo'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, country, city }) => {
    const supabase = getSupabase();
    let q = supabase
      .from("votos")
      .select("clube_nome, voto_pais, voto_cidade", { count: "exact" })
      .eq("is_original_vote", true);
    if (country) q = q.ilike("voto_pais", country);
    if (city) q = q.ilike("voto_cidade", city);

    const { data, error } = await q.limit(5000);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const name = (row as { clube_nome?: string }).clube_nome;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const ranking = [...counts.entries()]
      .map(([clube, votos]) => ({ clube, votos }))
      .sort((a, b) => b.votos - a.votos)
      .slice(0, limit ?? 10);

    return {
      content: [{ type: "text", text: JSON.stringify(ranking, null, 2) }],
      structuredContent: { ranking, filters: { country, city } },
    };
  },
});
