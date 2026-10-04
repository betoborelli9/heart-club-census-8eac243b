-- Termometros de saude do banco (so Master/admin) + limpeza automatica no amarelo (25 MB) + checagem de APIs de hora em hora.

-- 1) Amarelo = 25 MB: a limpeza automatica (de hora em hora) ja esvazia. Vermelho (50 MB) so se a limpeza falhar.
--    Mesma funcao da Etapa 1; so muda o limite. Nada mais muda.
CREATE OR REPLACE FUNCTION public.hc_cleanup_technical_logs(p_force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit_bytes constant bigint := 25 * 1024 * 1024;   -- 25 MB: amarelo -> limpa na hora
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
        v_action := CASE WHEN p_force THEN 'esvaziada (manual)' ELSE 'esvaziada (passou de 25 MB)' END;
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
          BEGIN PERFORM net.worker_restart(); v_note := v_note || '; processo do pg_net reiniciado';
          EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;
      WHEN OTHERS THEN
        v_ok := false; v_action := 'falhou'; v_note := left(SQLERRM, 200);
    END;
    v_after := pg_total_relation_size(t::regclass);
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

-- 2) Leitura dos termometros (so admin/master). Nao expoe nenhum dado de torcedor.
CREATE OR REPLACE FUNCTION public.admin_get_db_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conn int;
  v_max  int;
  v_http bigint;
  v_cron bigint;
  v_last timestamptz;
  v_last_ok boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::int INTO v_conn FROM pg_stat_activity WHERE datname = current_database();
  v_max  := current_setting('max_connections')::int;
  v_http := pg_total_relation_size('net._http_response'::regclass);
  v_cron := pg_total_relation_size('cron.job_run_details'::regclass);
  SELECT ran_at, ok INTO v_last, v_last_ok FROM public.technical_cleanup_runs ORDER BY id DESC LIMIT 1;

  RETURN jsonb_build_object(
    'connections', v_conn,
    'max_connections', v_max,
    'http_log_bytes', v_http,
    'cron_log_bytes', v_cron,
    'yellow_bytes', 25 * 1024 * 1024,
    'red_bytes', 50 * 1024 * 1024,
    'last_cleanup_at', v_last,
    'last_cleanup_ok', v_last_ok
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_db_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_db_health() TO authenticated;

-- 3) Checagem das APIs (API-Football usado/limite, login, e-mail) passa de 1x/dia para de hora em hora,
--    para o alerta mostrar o uso do dia de forma atual. Mesmo comando; so muda o horario.
DO $$
DECLARE v_id bigint;
BEGIN
  SELECT jobid INTO v_id FROM cron.job WHERE jobname = 'check-api-health-daily';
  IF v_id IS NOT NULL THEN
    PERFORM cron.alter_job(v_id, schedule := '5 * * * *');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
