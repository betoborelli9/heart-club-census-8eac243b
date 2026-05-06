CREATE OR REPLACE FUNCTION public.admin_get_vote_sympathies(p_voto_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'sympathy_1', sympathy_1,
    'sympathy_2', sympathy_2,
    'sympathy_3', sympathy_3,
    'sympathy_4', sympathy_4
  ) INTO result
  FROM public.votos
  WHERE id = p_voto_id;

  RETURN COALESCE(result, '{}'::json);
END;
$function$;