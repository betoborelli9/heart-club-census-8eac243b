/**
 * MCP tool: get_census_stats
 * High-level census counts for the Heart Club platform.
 */
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabase } from "../supabase";

export default defineTool({
  name: "get_census_stats",
  title: "Get census stats",
  description:
    "Return aggregate Heart Club census statistics: total original votes, distinct clubs, and top countries.",
  inputSchema: {
    club: z.string().optional().describe("Optional club name to scope the stats to a single club."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ club }) => {
    const supabase = getSupabase();
    let base = supabase.from("votos").select("clube_nome, voto_pais", { count: "exact" }).eq("is_original_vote", true);
    if (club) base = base.ilike("clube_nome", club);

    const { data, count, error } = await base.limit(5000);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };

    const clubes = new Set<string>();
    const paises = new Map<string, number>();
    for (const row of data ?? []) {
      const r = row as { clube_nome?: string; voto_pais?: string };
      if (r.clube_nome) clubes.add(r.clube_nome);
      if (r.voto_pais) paises.set(r.voto_pais, (paises.get(r.voto_pais) ?? 0) + 1);
    }
    const topCountries = [...paises.entries()]
      .map(([pais, votos]) => ({ pais, votos }))
      .sort((a, b) => b.votos - a.votos)
      .slice(0, 10);

    const stats = {
      total_original_votes: count ?? data?.length ?? 0,
      distinct_clubs: clubes.size,
      top_countries: topCountries,
      scoped_to: club ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      structuredContent: stats,
    };
  },
});
