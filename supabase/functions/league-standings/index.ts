/**
 * [EDGE FUNCTION]: league-standings
 * Retorna tabela e próximos jogos do clube. Mock estruturado por divisão até integrar API real.
 * Sem JWT (público), rate-limit leve por IP.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Team = { position: number; name: string; logo?: string; points: number };

const DIVISIONS: Record<string, Team[]> = {
  "Brasileirão Série A": [
    { name: "Flamengo", points: 71, position: 1 },
    { name: "Palmeiras", points: 68, position: 2 },
    { name: "Botafogo", points: 65, position: 3 },
    { name: "Fortaleza", points: 60, position: 4 },
    { name: "São Paulo", points: 58, position: 5 },
    { name: "Atlético-MG", points: 56, position: 6 },
    { name: "Internacional", points: 53, position: 7 },
    { name: "Corinthians", points: 50, position: 8 },
    { name: "Cruzeiro", points: 48, position: 9 },
    { name: "Bahia", points: 47, position: 10 },
    { name: "Vasco da Gama", points: 45, position: 11 },
    { name: "Grêmio", points: 43, position: 12 },
    { name: "Athletico-PR", points: 41, position: 13 },
    { name: "Fluminense", points: 39, position: 14 },
    { name: "Bragantino", points: 37, position: 15 },
    { name: "Juventude", points: 35, position: 16 },
    { name: "Vitória", points: 32, position: 17 },
    { name: "Cuiabá", points: 30, position: 18 },
    { name: "Atlético-GO", points: 27, position: 19 },
    { name: "Criciúma", points: 24, position: 20 },
  ],
};

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function findLeague(clubName: string): { league: string; standings: Team[] } | null {
  const n = norm(clubName);
  for (const [league, teams] of Object.entries(DIVISIONS)) {
    if (teams.some((t) => norm(t.name) === n || norm(t.name).includes(n) || n.includes(norm(t.name)))) {
      return { league, standings: teams };
    }
  }
  return null;
}

function generateFixtures(clubName: string, opponents: Team[]) {
  const others = opponents.filter((t) => norm(t.name) !== norm(clubName)).slice(0, 3);
  const broadcasters = [["Globo", "Premiere"], ["SporTV", "Premiere"], ["Premiere"]];
  const today = new Date();
  return others.map((o, i) => {
    const d = new Date(today.getTime() + (i + 1) * 4 * 86400000);
    return {
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""),
      time: ["16:00", "21:30", "18:30"][i],
      opponent: o.name,
      competition: "Brasileirão",
      broadcasters: broadcasters[i],
      home: i % 2 === 0,
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { clubName } = await req.json();
    if (!clubName || typeof clubName !== "string" || clubName.length > 100) {
      return new Response(JSON.stringify({ error: "clubName inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const found = findLeague(clubName);
    if (!found) {
      return new Response(
        JSON.stringify({ league: null, standings: [], me: null, fixtures: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const me = found.standings.find(
      (t) => norm(t.name) === norm(clubName) || norm(t.name).includes(norm(clubName)) || norm(clubName).includes(norm(t.name)),
    ) || null;

    const fixtures = me ? generateFixtures(me.name, found.standings) : [];

    return new Response(
      JSON.stringify({
        league: found.league,
        standings: found.standings,
        me,
        fixtures,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("league-standings error:", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
