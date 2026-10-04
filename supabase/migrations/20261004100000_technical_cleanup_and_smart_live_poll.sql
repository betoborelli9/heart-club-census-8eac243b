-- Etapa 1 (04/10/2026): limpeza automatica das tabelas TECNICAS + rotina de jogos ao vivo so quando ha partida.
-- Mexe SOMENTE em: net._http_response e cron.job_run_details (logs de funcionamento interno).
-- NAO toca em votos, cadastros, clubes, acessos, campanhas ou qualquer dado de torcedor.

-- 1) Historico das limpezas (so Master/admin enxerga, via RPC; sem policy = ninguem le direto)
CREATE TABLE IF NOT EXISTS public.technical_cleanup_runs (
  id          bigserial PRIMARY KEY,
  ran_at      timestamptz NOT NULL DEFAULT now(),
  table_name  text        NOT NULL,
  action      text        NOT NULL,
  size_before bigint,
  size_after  bigint,
  ok          boolean     NOT NULL DEFAULT true,
  note        text
);
ALTER TABLE public.technical_cleanup_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technical_cleanup_runs FROM anon, authenticated;

-- 2) Limpeza. p_force = true: esvazia as duas tabelas tecnicas agora (botao do Admin).
--    Automatico (p_force = false): apaga o antigo e, se a tabela passar do limite, esvazia.
CREATE OR REPLACE FUNCTION public.hc_cleanup_technical_logs(p_force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit_bytes constant bigint := 50 * 1024 * 1024;   -- 50 MB: amarelo -> limpa na hora
  v_before bigint;
  v_after  bigint;
  v_result jsonb := '[]'::jsonb;
  v_note   text;
  v_ok     boolean;
  v_action text;
  t        text;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);

  FOREACH t IN ARRAY ARRAY['net._http_response', 'cron.job_run_details'] LOOP
    v_ok := true; v_note := NULL; v_action := 'nada a fazer';
    v_before := pg_total_relation_size(t::regclass);
    BEGIN
      IF p_force OR v_before > v_limit_bytes THEN
        EXECUTE format('TRUNCATE TABLE %s', t);
        v_action := CASE WHEN p_force THEN 'esvaziada (manual)' ELSE 'esvaziada (passou de 50 MB)' END;
      ELSIF t = 'net._http_response' THEN
        DELETE FROM net._http_response WHERE created < now() - interval '1 day';
        v_action := 'apagado o que tinha mais de 1 dia';
      ELSE
        DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';
        v_action := 'apagado o que tinha mais de 3 dias';
      END IF;
    EXCEPTION
      WHEN lock_not_available THEN
        v_ok := false; v_action := 'falhou';
        v_note := 'tabela trancada; tentara de novo na proxima hora';
        IF t = 'net._http_response' THEN
          -- o processo de chamadas automaticas (so ele, nao o projeto) pode estar travado segurando a tabela
          BEGIN PERFORM net.worker_restart(); v_note := v_note || '; processo do pg_net reiniciado';
          EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;
      WHEN OTHERS THEN
        v_ok := false; v_action := 'falhou'; v_note := left(SQLERRM, 200);
    END;
    v_after := pg_total_relation_size(t::regclass);
    -- so registra quando algo relevante aconteceu (evita crescer a propria tabela de historico)
    IF NOT v_ok OR p_force OR v_action LIKE 'esvaziada%' THEN
      INSERT INTO public.technical_cleanup_runs (table_name, action, size_before, size_after, ok, note)
      VALUES (t, v_action, v_before, v_after, v_ok, v_note);
    END IF;
    v_result := v_result || jsonb_build_object(
      'tabela', t, 'acao', v_action, 'antes', v_before, 'depois', v_after, 'ok', v_ok, 'nota', v_note);
  END LOOP;

  DELETE FROM public.technical_cleanup_runs WHERE ran_at < now() - interval '30 days';
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.hc_cleanup_technical_logs(boolean) FROM PUBLIC, anon, authenticated;

-- 3) Botao do Admin (sera ligado na tela em outra etapa): so admin/master consegue chamar
CREATE OR REPLACE FUNCTION public.admin_run_technical_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  RETURN public.hc_cleanup_technical_logs(true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_run_technical_cleanup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_run_technical_cleanup() TO authenticated;

-- 4) Janela de jogo: existe alguma partida (no calendario ja guardado) que pode estar rolando agora?
--    Mesma regra da funcao fixtures-live-poll: inicio <= agora <= inicio + 150 min e nao finalizada.
CREATE OR REPLACE FUNCTION public.hc_live_window_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_fixtures_cache t,
         LATERAL jsonb_array_elements(
           CASE WHEN jsonb_typeof(t.payload->'next') = 'array' THEN t.payload->'next' ELSE '[]'::jsonb END
         ) fx
    WHERE fx->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      AND (fx->>'date')::timestamptz <= now()
      AND now() <= (fx->>'date')::timestamptz + interval '150 minutes'
      AND COALESCE((t.payload->'live_state'->(fx->>'id')->>'finished')::boolean, false) = false
  );
$$;
REVOKE ALL ON FUNCTION public.hc_live_window_open() FROM PUBLIC, anon, authenticated;

-- 5) Rotina de limpeza: toda hora (minuto 7). Leve: so apaga o antigo; esvazia se passar de 50 MB.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hc-cleanup-hourly') THEN
    PERFORM cron.schedule('hc-cleanup-hourly', '7 * * * *', 'SELECT public.hc_cleanup_technical_logs(false);');
  END IF;
END $$;

-- 6) Rotina de jogos ao vivo: mantem o MESMO comando (com a mesma chave) e acrescenta
--    "WHERE hc_live_window_open()" -> sem partida na janela, a chamada nem e feita (zero registros).
DO $$
DECLARE
  v_id  bigint;
  v_cmd text;
BEGIN
  SELECT jobid, command INTO v_id, v_cmd FROM cron.job WHERE jobname = 'fixtures-live-poll-1min';
  IF v_id IS NOT NULL AND v_cmd NOT LIKE '%hc_live_window_open%' THEN
    v_cmd := regexp_replace(trim(v_cmd), ';\s*$', '') || E'\n  WHERE public.hc_live_window_open();';
    PERFORM cron.alter_job(v_id, command := v_cmd, active := true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
