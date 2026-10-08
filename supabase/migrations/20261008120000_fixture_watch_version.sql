-- Marca a "versão" da pesquisa de onde assistir: v2 = IA mais rigorosa (exige fonte confirmando o jogo).
-- Linhas antigas (v1) são pesquisadas de novo na próxima rodada; o que o Beto definiu (fonte = 'admin') nunca é refeito.
ALTER TABLE public.fixture_watch ADD COLUMN IF NOT EXISTS versao int NOT NULL DEFAULT 1;
NOTIFY pgrst, 'reload schema';
