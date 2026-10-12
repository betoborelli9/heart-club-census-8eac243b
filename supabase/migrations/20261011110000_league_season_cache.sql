-- Guarda os jogos ENCERRADOS da temporada de cada campeonato (compactos) para a classificação ao vivo conferir,
-- time a time, se a tabela oficial já contou o último jogo. 1 chamada à API por campeonato a cada 15 min (só com jogo
-- recente) ou 6 h (sem jogo). Só o servidor (service role) lê e escreve.
CREATE TABLE IF NOT EXISTS public.league_season_cache (
  league_id int NOT NULL,
  season int NOT NULL,
  games jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, season)
);
ALTER TABLE public.league_season_cache ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa
