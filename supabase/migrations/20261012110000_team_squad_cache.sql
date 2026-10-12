-- ELENCO COMPLETO DE CADA TIME (jogadores, técnico, contratações e saídas), guardado e compartilhado por todos.
-- Atualizado sob demanda (quando alguém abre o clube) e, para os clubes que já têm torcedor, por uma rotina de hora em
-- hora. Contratação nova é detectada de dois jeitos: pelas transferências oficiais da API e pela diferença entre o
-- elenco de ontem e o de hoje. Só o servidor (service role) lê e escreve.
CREATE TABLE IF NOT EXISTS public.team_squad_cache (
  team_id int PRIMARY KEY,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  coach jsonb,
  moves jsonb NOT NULL DEFAULT '[]'::jsonb,      -- contratações e saídas (últimos 12 meses), mais recentes primeiro
  seen jsonb NOT NULL DEFAULT '{}'::jsonb,       -- jogador -> quando apareceu no elenco pela 1ª vez
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_squad_cache ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa
CREATE INDEX IF NOT EXISTS idx_team_squad_cache_updated ON public.team_squad_cache (updated_at);
