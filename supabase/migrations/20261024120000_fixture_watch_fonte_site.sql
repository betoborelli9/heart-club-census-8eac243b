-- Onde assistir sem IA: o robô do Heart Club lê a grade de um site de programação de TV (fonte = 'site').
ALTER TABLE public.fixture_watch DROP CONSTRAINT IF EXISTS fixture_watch_fonte_check;
ALTER TABLE public.fixture_watch ADD CONSTRAINT fixture_watch_fonte_check CHECK (fonte IN ('ia', 'admin', 'site'));
