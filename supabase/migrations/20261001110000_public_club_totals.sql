-- Leitura PÚBLICA (sem login) só com placar agregado por clube — nenhum
-- dado de torcedor (nome, cidade, e-mail etc). Objetivo: visitante que
-- ainda não votou ver "Flamengo 12.430 x Corinthians 11.980" na página
-- de votação antes de precisar entrar, sem expor nada pessoal.
CREATE OR REPLACE FUNCTION public.public_get_club_totals(p_limit int DEFAULT 20)
RETURNS TABLE(clube_nome text, votos bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clube_nome, count(*) AS votos
  FROM public.votos
  WHERE is_original_vote = true
    AND status_aprovacao = 'aprovado'
    AND clube_nome IS NOT NULL
  GROUP BY clube_nome
  ORDER BY votos DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_club_totals(int) TO anon, authenticated;
