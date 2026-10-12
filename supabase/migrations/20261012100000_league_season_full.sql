-- TEMPORADA COMPLETA DE CADA CAMPEONATO (todos os jogos: encerrados, ao vivo e futuros), guardada UMA vez e lida por
-- todos. Alimenta a página do clube (jogos desde o início) e o motor de probabilidades. 1 chamada à API por campeonato:
-- a cada 15 min com jogo recente, a cada 6 h sem. Só o servidor (service role) lê e escreve.
CREATE TABLE IF NOT EXISTS public.league_season_full (
  league_id int NOT NULL,
  season int NOT NULL,
  games jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, season)
);
ALTER TABLE public.league_season_full ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa
CREATE INDEX IF NOT EXISTS idx_league_season_full_updated ON public.league_season_full (updated_at DESC);
