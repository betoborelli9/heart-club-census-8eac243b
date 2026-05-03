-- Tabela de cliques em banners de parceiros
CREATE TABLE public.partner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL,
  partner_name text,
  user_id uuid,
  pais text,
  estado text,
  cidade text,
  bairro text,
  lat double precision,
  lng double precision,
  referrer_url text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_clicks_partner ON public.partner_clicks(partner_id);
CREATE INDEX idx_partner_clicks_bairro ON public.partner_clicks(cidade, bairro);
CREATE INDEX idx_partner_clicks_created ON public.partner_clicks(created_at DESC);

ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register click"
  ON public.partner_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read all clicks"
  ON public.partner_clicks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users read own clicks"
  ON public.partner_clicks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RPC: Dominância por bairro (clube líder + %)
CREATE OR REPLACE FUNCTION public.admin_get_neighborhood_dominance(p_limit integer DEFAULT 100)
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
    WHERE is_original_vote = true AND bairro IS NOT NULL AND length(trim(bairro)) > 0
    GROUP BY 1,2,3,4
  ),
  totals AS (
    SELECT estado, cidade, bairro, sum(votes) AS total
    FROM base GROUP BY 1,2,3
  ),
  ranked AS (
    SELECT b.estado, b.cidade, b.bairro, b.clube_nome, b.votes, t.total,
           row_number() OVER (PARTITION BY b.estado, b.cidade, b.bairro ORDER BY b.votes DESC) AS rn
    FROM base b JOIN totals t USING (estado, cidade, bairro)
  )
  SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) INTO result FROM (
    SELECT estado, cidade, bairro, clube_nome AS leader, votes AS leader_votes,
           total AS total_votes,
           round((votes::numeric / NULLIF(total,0)) * 100, 1) AS dominance_pct
    FROM ranked WHERE rn = 1
    ORDER BY total DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
  ) x;
  RETURN result;
END;
$$;

-- RPC: Heatmap de receita (cliques de parceiros por bairro)
CREATE OR REPLACE FUNCTION public.admin_get_partner_revenue_heatmap(p_days integer DEFAULT 30)
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

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT
      COALESCE(NULLIF(cidade,''), 'N/A') AS cidade,
      COALESCE(NULLIF(bairro,''), 'N/A') AS bairro,
      COALESCE(NULLIF(estado,''), 'N/A') AS estado,
      partner_name,
      count(*) AS clicks,
      avg(lat) AS lat,
      avg(lng) AS lng
    FROM public.partner_clicks
    WHERE created_at > now() - (p_days || ' days')::interval
    GROUP BY 1,2,3,4
    ORDER BY clicks DESC
    LIMIT 500
  ) t;
  RETURN result;
END;
$$;

-- RPC: Resumo executivo para PDF Mensal
CREATE OR REPLACE FUNCTION public.admin_get_executive_summary(p_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_now integer;
  total_prev integer;
  users_now integer;
  users_prev integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT count(*) INTO total_now FROM public.votos
   WHERE is_original_vote = true AND created_at > now() - (p_days || ' days')::interval;
  SELECT count(*) INTO total_prev FROM public.votos
   WHERE is_original_vote = true 
     AND created_at > now() - (2 * p_days || ' days')::interval
     AND created_at <= now() - (p_days || ' days')::interval;
  SELECT count(*) INTO users_now FROM public.profiles
   WHERE id IN (SELECT user_id FROM public.votos WHERE created_at > now() - (p_days || ' days')::interval);
  SELECT count(*) INTO users_prev FROM public.profiles
   WHERE id IN (SELECT user_id FROM public.votos 
                WHERE created_at > now() - (2 * p_days || ' days')::interval
                  AND created_at <= now() - (p_days || ' days')::interval);

  SELECT json_build_object(
    'period_days', p_days,
    'votes_total', (SELECT count(*) FROM public.votos WHERE is_original_vote = true),
    'votes_period', total_now,
    'votes_growth_pct', CASE WHEN total_prev > 0 THEN round(((total_now - total_prev)::numeric / total_prev) * 100, 1) ELSE NULL END,
    'users_total', (SELECT count(*) FROM public.profiles),
    'users_period', users_now,
    'users_growth_pct', CASE WHEN users_prev > 0 THEN round(((users_now - users_prev)::numeric / users_prev) * 100, 1) ELSE NULL END,
    'fraud_attempts', (SELECT count(*) FROM public.votos WHERE is_fraud_attempt = true),
    'partner_clicks_period', (SELECT count(*) FROM public.partner_clicks WHERE created_at > now() - (p_days || ' days')::interval),
    'top_neighborhoods', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS cidade,
               COALESCE(NULLIF(bairro,''), 'N/A') AS bairro,
               count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true AND bairro IS NOT NULL AND length(trim(bairro))>0
        GROUP BY 1,2 ORDER BY votes DESC LIMIT 20
      ) t
    ),
    'by_age', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(faixa_etaria, 'N/A') AS label, count(*) AS value
        FROM public.profiles WHERE faixa_etaria IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'by_gender', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(genero, 'N/A') AS label, count(*) AS value
        FROM public.profiles WHERE genero IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'partner_performance', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT partner_name, count(*) AS clicks
        FROM public.partner_clicks
        WHERE created_at > now() - (p_days || ' days')::interval
        GROUP BY 1 ORDER BY clicks DESC LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;