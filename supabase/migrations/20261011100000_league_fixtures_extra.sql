-- Acréscimos do jogo (ex.: 45+2'): a API manda "elapsed" parado em 45/90 e o acréscimo à parte.
ALTER TABLE public.league_fixtures ADD COLUMN IF NOT EXISTS extra int;
NOTIFY pgrst, 'reload schema';
