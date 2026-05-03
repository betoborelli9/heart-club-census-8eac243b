CREATE OR REPLACE FUNCTION public.admin_get_club_neighborhood_ranking(
  p_club_name text,
  p_state text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH base AS (
    SELECT
      COALESCE(NULLIF(estado,''), 'N/A') AS estado,
      COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS cidade,
      COALESCE(NULLIF(bairro,''), 'N/A') AS bairro,
      clube_nome,
      count(*) AS votes
    FROM public.votos
    WHERE is_original_vote = true
      AND bairro IS NOT NULL AND length(trim(bairro)) > 0
      AND (p_state IS NULL OR estado = p_state)
    GROUP BY 1,2,3,4
  ),
  totals AS (
    SELECT estado, cidade, bairro, sum(votes) AS total,
           max(votes) AS leader_votes
    FROM base GROUP BY 1,2,3
  ),
  leaders AS (
    SELECT b.estado, b.cidade, b.bairro, b.clube_nome AS leader
    FROM base b
    JOIN totals t USING (estado, cidade, bairro)
    WHERE b.votes = t.leader_votes
  ),
  club_rows AS (
    SELECT b.estado, b.cidade, b.bairro, b.votes AS club_votes,
           t.total, t.leader_votes,
           (SELECT leader FROM leaders l
              WHERE l.estado=b.estado AND l.cidade=b.cidade AND l.bairro=b.bairro
              LIMIT 1) AS leader
    FROM base b
    JOIN totals t USING (estado, cidade, bairro)
    WHERE b.clube_nome = p_club_name
  )
  SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) INTO result FROM (
    SELECT estado, cidade, bairro, club_votes, total AS total_votes, leader,
           (leader = p_club_name) AS is_leader,
           round((club_votes::numeric / NULLIF(total,0)) * 100, 1) AS share_pct
    FROM club_rows
    ORDER BY club_votes DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  ) x;
  RETURN result;
END;
$$;