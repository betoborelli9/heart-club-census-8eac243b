CREATE OR REPLACE FUNCTION public.purge_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_count integer := 0;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  SELECT count(*) INTO v_count FROM public.votos;

  TRUNCATE TABLE public.votos RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.votos_tracking RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.votos_ficticios_meta RESTART IDENTITY CASCADE;

  RETURN json_build_object(
    'removidos', v_count,
    'has_more', false,
    'modo', 'truncate_cascade'
  );
END;
$function$;