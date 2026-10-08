-- JOGOS DO MUNDO TODO (calendário do dia + placar ao vivo), guardados UMA vez e lidos por todos os torcedores.
-- Alimentado pelas funções `fixtures-day-sync` (calendário, poucas chamadas por dia) e `fixtures-live-scores`
-- (placar ao vivo, só enquanto há jogo na janela). Torcedor nunca chama a API de jogos: só lê esta tabela.
CREATE TABLE IF NOT EXISTS public.league_fixtures (
  fixture_id bigint PRIMARY KEY,
  league_id int NOT NULL,
  league_name text,
  league_logo text,
  country text,
  season int,
  round text,
  kickoff timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'NS',
  elapsed int,
  home_id int,
  home_name text,
  home_logo text,
  away_id int,
  away_name text,
  away_logo text,
  goals_home int,
  goals_away int,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_fixtures_league_kickoff ON public.league_fixtures (league_id, kickoff DESC);
CREATE INDEX IF NOT EXISTS idx_league_fixtures_kickoff ON public.league_fixtures (kickoff DESC);

ALTER TABLE public.league_fixtures ENABLE ROW LEVEL SECURITY;
-- Qualquer pessoa só LÊ (são placares públicos). Quem escreve é a função do servidor (service role).
DROP POLICY IF EXISTS "league_fixtures leitura publica" ON public.league_fixtures;
CREATE POLICY "league_fixtures leitura publica" ON public.league_fixtures FOR SELECT TO anon, authenticated USING (true);

-- Tempo real (o site recebe o gol assim que ele é gravado).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'league_fixtures') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.league_fixtures;
  END IF;
END $$;

-- Trava simples para duas execuções do placar ao vivo nunca rodarem juntas.
CREATE TABLE IF NOT EXISTS public.league_live_lock (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  started_at timestamptz NOT NULL DEFAULT '2000-01-01'
);
INSERT INTO public.league_live_lock (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.league_live_lock ENABLE ROW LEVEL SECURITY; -- sem política: só o servidor mexe

-- Pega a trava (true = pode rodar). Só o servidor (service role) chama.
CREATE OR REPLACE FUNCTION public.hc_take_live_lock(p_seconds int DEFAULT 45)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  UPDATE public.league_live_lock SET started_at = now()
   WHERE id = 1 AND started_at < now() - make_interval(secs => p_seconds);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.hc_take_live_lock(int) FROM PUBLIC, anon, authenticated;

-- "Há jogo do mundo na janela de ao vivo?" — sem jogo, o cron nem chama a função (zero consulta, zero registro).
CREATE OR REPLACE FUNCTION public.hc_league_live_window_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_fixtures
     WHERE status IN ('NS', 'TBD', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT')
       AND kickoff <= now()
       AND kickoff >= now() - interval '170 minutes'
  );
$$;
REVOKE ALL ON FUNCTION public.hc_league_live_window_open() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
