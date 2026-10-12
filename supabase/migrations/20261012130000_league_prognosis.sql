-- PROBABILIDADES DE CADA CAMPEONATO (simulação de Monte Carlo dos jogos que faltam), calculadas no servidor e
-- compartilhadas por todos. O celular só lê o resultado pronto. Recalcula quando um jogo termina (muda a contagem),
-- a cada 60 s com jogo ao vivo, ou depois de 6 h. Só o servidor (service role) lê e escreve.
CREATE TABLE IF NOT EXISTS public.league_prognosis (
  league_id int NOT NULL,
  season int NOT NULL,
  payload jsonb NOT NULL,
  signature text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, season)
);
ALTER TABLE public.league_prognosis ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa
