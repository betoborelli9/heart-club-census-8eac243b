
ALTER TABLE public.votos
  ADD COLUMN IF NOT EXISTS potential_duplicate_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isp text,
  ADD COLUMN IF NOT EXISTS cluster_id text;

CREATE INDEX IF NOT EXISTS idx_votos_cluster ON public.votos(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votos_isp ON public.votos(isp) WHERE isp IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.votos_lixeira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_voto_id uuid NOT NULL,
  user_id uuid,
  clube_nome text,
  cidade text,
  estado text,
  pais text,
  bairro text,
  isp text,
  cluster_id text,
  reason text,
  payload jsonb,
  moved_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.votos_lixeira ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read trash" ON public.votos_lixeira;
CREATE POLICY "Admins read trash" ON public.votos_lixeira FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins insert trash" ON public.votos_lixeira;
CREATE POLICY "Admins insert trash" ON public.votos_lixeira FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Detect clusters: same IP + bairro + profissao
CREATE OR REPLACE FUNCTION public.admin_detect_vote_clusters()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  flagged integer := 0;
  clusters integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH grouped AS (
    SELECT vt.ip_address, v.bairro, p.profissao,
           md5(coalesce(vt.ip_address,'') || '|' || coalesce(v.bairro,'') || '|' || coalesce(p.profissao,'')) AS cid,
           array_agg(v.id) AS ids,
           count(*) AS qtd
    FROM public.votos v
    JOIN public.votos_tracking vt ON vt.voto_id = v.id
    LEFT JOIN public.profiles p ON p.id = v.user_id
    WHERE vt.ip_address IS NOT NULL
      AND v.bairro IS NOT NULL
      AND p.profissao IS NOT NULL
    GROUP BY vt.ip_address, v.bairro, p.profissao
    HAVING count(*) >= 2
  ),
  upd AS (
    UPDATE public.votos v
       SET potential_duplicate_user = true,
           cluster_id = g.cid,
           is_suspicious = true
      FROM grouped g
     WHERE v.id = ANY(g.ids)
    RETURNING v.id, g.cid
  )
  SELECT count(*), count(DISTINCT cid) INTO flagged, clusters FROM upd;

  RETURN json_build_object('flagged', COALESCE(flagged,0), 'clusters', COALESCE(clusters,0));
END;
$$;

-- Flag mass voting from same ISP in a neighborhood
CREATE OR REPLACE FUNCTION public.admin_flag_isp_clusters(p_threshold integer DEFAULT 5)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  flagged integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH grouped AS (
    SELECT isp, bairro, array_agg(id) AS ids
    FROM public.votos
    WHERE isp IS NOT NULL AND bairro IS NOT NULL
    GROUP BY isp, bairro
    HAVING count(*) >= p_threshold
  ),
  upd AS (
    UPDATE public.votos v SET is_suspicious = true, potential_duplicate_user = true
    FROM grouped g WHERE v.id = ANY(g.ids)
    RETURNING v.id
  )
  SELECT count(*) INTO flagged FROM upd;

  RETURN json_build_object('flagged', COALESCE(flagged,0));
END;
$$;

-- Audit summary for executive panel
CREATE OR REPLACE FUNCTION public.admin_get_audit_summary()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'total_votes', (SELECT count(*) FROM public.votos WHERE is_original_vote = true),
    'suspicious', (SELECT count(*) FROM public.votos WHERE potential_duplicate_user = true OR is_suspicious = true),
    'clusters', (SELECT count(DISTINCT cluster_id) FROM public.votos WHERE cluster_id IS NOT NULL),
    'unique_estimated', (
      SELECT count(*) FROM public.votos
      WHERE is_original_vote = true AND COALESCE(potential_duplicate_user,false) = false
    ),
    'trash_count', (SELECT count(*) FROM public.votos_lixeira),
    'scatter', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT cluster_id, count(*) AS size,
               COALESCE(NULLIF(bairro,''),'N/A') AS bairro,
               COALESCE(NULLIF(isp,''),'N/A') AS isp
        FROM public.votos
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id, bairro, isp
        ORDER BY size DESC LIMIT 200
      ) t
    ),
    'isp_breakdown', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(isp,''),'Desconhecido') AS isp, count(*) AS value
        FROM public.votos WHERE isp IS NOT NULL
        GROUP BY 1 ORDER BY value DESC LIMIT 20
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- Move suspicious votes to trash
CREATE OR REPLACE FUNCTION public.admin_purge_suspicious_to_trash()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  moved integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH ins AS (
    INSERT INTO public.votos_lixeira (original_voto_id, user_id, clube_nome, cidade, estado, pais, bairro, isp, cluster_id, reason, payload)
    SELECT v.id, v.user_id, v.clube_nome, v.cidade, v.estado, v.pais, v.bairro, v.isp, v.cluster_id,
           'cluster_or_duplicate', to_jsonb(v.*)
    FROM public.votos v
    WHERE v.potential_duplicate_user = true
    RETURNING original_voto_id
  ),
  del_track AS (
    DELETE FROM public.votos_tracking WHERE voto_id IN (SELECT original_voto_id FROM ins) RETURNING 1
  ),
  del AS (
    DELETE FROM public.votos WHERE id IN (SELECT original_voto_id FROM ins) RETURNING 1
  )
  SELECT count(*) INTO moved FROM del;

  RETURN json_build_object('moved', COALESCE(moved,0));
END;
$$;
