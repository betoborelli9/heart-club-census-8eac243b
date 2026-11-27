-- TOTAL DE VOTOS do Heart Club (todos os clubes e lugares), só para o e-mail do dono acompanhar a evolução.
-- A trava é no banco: para qualquer outra conta a função devolve vazio (NULL). Conta os mesmos votos do ranking
-- (originais e aprovados).
CREATE OR REPLACE FUNCTION public.master_total_votos()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(auth.jwt() ->> 'email', '')) = 'betoborelli9@gmail.com'
      THEN (SELECT count(*)::int FROM public.votos WHERE is_original_vote = true AND status_aprovacao = 'aprovado')
  END;
$$;
REVOKE ALL ON FUNCTION public.master_total_votos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.master_total_votos() TO authenticated;
NOTIFY pgrst, 'reload schema';
