CREATE OR REPLACE FUNCTION public.count_votes_since(p_since timestamptz)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_count bigint;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS DISTINCT FROM 'betoborelli9@gmail.com' THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.votos WHERE created_at > p_since;
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_votes_since(timestamptz) TO authenticated;