-- Leitura PÚBLICA (sem login): só QUANTOS torcedores já votaram em um clube — um número somado,
-- nenhum dado de pessoa. Usado na tela de escolha do clube antes do login.
CREATE OR REPLACE FUNCTION public.public_get_club_fans(p_club text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)
  FROM public.votos
  WHERE is_original_vote = true
    AND status_aprovacao = 'aprovado'
    AND lower(clube_nome) = lower(btrim(p_club));
$$;

REVOKE ALL ON FUNCTION public.public_get_club_fans(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_club_fans(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
