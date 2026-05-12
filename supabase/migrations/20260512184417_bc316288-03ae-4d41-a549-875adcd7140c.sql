
CREATE OR REPLACE FUNCTION public.get_inviter_info(_ref text)
RETURNS TABLE(nome_exibicao text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.nome_exibicao
  FROM public.profiles p
  WHERE p.codigo_indicacao = _ref
     OR p.id::text = _ref
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_inviter_info(text) TO anon, authenticated;
