/**
 * Heart Club MCP server definition.
 * Exposes public read-only tools about clubs and the Voto Sagrado census.
 * Import-safe: no env reads, I/O, or throws at module top level.
 */
import { defineMcp } from "@lovable.dev/mcp-js";
import searchClubs from "./tools/search-clubs";
import getClubRanking from "./tools/get-club-ranking";
import getCensusStats from "./tools/get-census-stats";

export default defineMcp({
  name: "heart-club-mcp",
  title: "Heart Club MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Heart Club football census platform. Use `search_clubs` to find a club, `get_club_ranking` for the Voto Sagrado leaderboard, and `get_census_stats` for aggregate statistics. All tools are read-only and expose public data only (no personal information).",
  tools: [searchClubs, getClubRanking, getCensusStats],
});
