-- HISTÓRICO DAS PREVISÕES (para medir a precisão do Heart Club): uma foto por dia, por campeonato e por time.
-- Quando o campeonato termina, comparamos o que prevemos (título, vagas, rebaixamento) com o resultado real e
-- calculamos o erro (Brier). Só o servidor (service role) lê e escreve; nunca aparece para o torcedor.
CREATE TABLE IF NOT EXISTS public.prognosis_history (
  league_id int NOT NULL,
  season int NOT NULL,
  day date NOT NULL,
  group_label text NOT NULL DEFAULT '',
  team_id int NOT NULL,
  team_name text,
  position int,
  points int,
  played int,
  remaining int,
  exp_points numeric,
  p10 int,
  p90 int,
  title numeric,
  zone_prob jsonb,
  dist jsonb,
  zones jsonb,
  model_version text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, season, day, group_label, team_id)
);
ALTER TABLE public.prognosis_history ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa
CREATE INDEX IF NOT EXISTS idx_prognosis_history_day ON public.prognosis_history (day DESC);

-- Foto diária automática (07h15 BRT ≈ 10:15 UTC, depois do calendário do mundo): recalcula os campeonatos consultados
-- nos últimos 7 dias e guarda a previsão do dia.
SELECT cron.schedule(
  'prognosis-daily-snapshot',
  '15 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/prognosis-daily',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdHRsY2hrcWp0YnVzZmR3eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNDUsImV4cCI6MjA4NzY4MzA0NX0.sW94fnT4_3O24aTLi9WEMTNekzlI7t1B-1aK6w4wJP0"}'::jsonb,
    body:='{}'::jsonb,
    timeout_milliseconds:=60000
  );
  $$
);
