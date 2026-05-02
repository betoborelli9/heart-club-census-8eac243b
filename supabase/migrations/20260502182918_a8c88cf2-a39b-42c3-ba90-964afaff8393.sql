CREATE OR REPLACE FUNCTION public.purge_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_batch_size integer := 2000;
  v_removidos integer := 0;
  v_meta_removidos integer := 0;
  v_remaining integer := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20000', true);

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  CREATE TEMP TABLE _fake_purge_batch (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _fake_purge_batch (id, user_id)
  SELECT id, user_id
  FROM public.votos
  WHERE status_integridade = 'ficticio'
  ORDER BY id
  LIMIT v_batch_size;

  -- Remove tracking primeiro (evita orphans)
  DELETE FROM public.votos_tracking vt
  USING _fake_purge_batch b
  WHERE vt.voto_id = b.id;

  -- Meta dos usuários fictícios deste lote
  WITH del_meta AS (
    DELETE FROM public.votos_ficticios_meta m
    USING _fake_purge_batch b
    WHERE m.user_id = b.user_id
    RETURNING 1
  )
  SELECT count(*) INTO v_meta_removidos FROM del_meta;

  -- Remove os votos
  WITH del AS (
    DELETE FROM public.votos v
    USING _fake_purge_batch b
    WHERE v.id = b.id
    RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  -- Tem mais?
  SELECT count(*) INTO v_remaining
  FROM (
    SELECT 1 FROM public.votos
    WHERE status_integridade = 'ficticio'
    LIMIT 1
  ) probe;

  RETURN json_build_object(
    'removidos', v_removidos,
    'meta_removidos', v_meta_removidos,
    'has_more', v_remaining > 0,
    'batch_size', v_batch_size
  );
END;
$function$;