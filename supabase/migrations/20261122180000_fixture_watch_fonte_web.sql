-- Onde assistir de QUALQUER jogo do mundo: quando a grade de TV não traz o jogo, o Heart Club pesquisa na internet
-- (reportagens do tipo "onde assistir X x Y") e só grava canal que está ESCRITO na reportagem (fonte = 'web').
ALTER TABLE public.fixture_watch DROP CONSTRAINT IF EXISTS fixture_watch_fonte_check;
ALTER TABLE public.fixture_watch ADD CONSTRAINT fixture_watch_fonte_check CHECK (fonte IN ('ia', 'admin', 'site', 'web'));
