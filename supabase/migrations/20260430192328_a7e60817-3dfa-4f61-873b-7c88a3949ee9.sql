-- 1. Colunas de endereço (público) e GPS (auditoria admin)
ALTER TABLE public.votos
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS voto_bairro_gps text,
  ADD COLUMN IF NOT EXISTS voto_cidade_gps text,
  ADD COLUMN IF NOT EXISTS voto_lat double precision,
  ADD COLUMN IF NOT EXISTS voto_lng double precision;

-- 2. Índices para o mapa coroplético
CREATE INDEX IF NOT EXISTS idx_votos_bairro ON public.votos(bairro);
CREATE INDEX IF NOT EXISTS idx_votos_cidade_bairro ON public.votos(cidade, bairro);
CREATE INDEX IF NOT EXISTS idx_votos_clube_cidade_bairro ON public.votos(clube_nome, cidade, bairro);

-- 3. Função pública para o heatmap por bairro
CREATE OR REPLACE FUNCTION public.get_heatmap_neighborhoods(
  p_club_name text,
  p_city text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT
      COALESCE(NULLIF(bairro, ''), 'Não informado') AS neighborhood,
      count(*) AS votes
    FROM public.votos
    WHERE clube_nome = p_club_name
      AND is_original_vote = true
      AND COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) = p_city
      AND bairro IS NOT NULL
      AND length(trim(bairro)) > 0
    GROUP BY 1
    ORDER BY votes DESC
  ) t;
  RETURN result;
END;
$$;

-- 4. Drop e recria a função admin com novo return type
DROP FUNCTION IF EXISTS public.admin_get_votes_with_tracking();

CREATE FUNCTION public.admin_get_votes_with_tracking()
RETURNS TABLE(
  voto_id uuid,
  user_id uuid,
  clube_nome text,
  pais text,
  estado text,
  cidade text,
  bairro text,
  cep text,
  numero text,
  complemento text,
  voto_bairro_gps text,
  voto_cidade_gps text,
  voto_lat double precision,
  voto_lng double precision,
  created_at timestamp with time zone,
  is_fraud_attempt boolean,
  is_original_vote boolean,
  status_integridade text,
  fingerprint text,
  ip_address text,
  is_suspicious boolean,
  user_email text,
  user_nome text,
  user_nascimento date,
  user_genero text,
  user_profissao text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    v.id, v.user_id, v.clube_nome, v.pais, v.estado, v.cidade,
    v.bairro, v.cep, v.numero, v.complemento,
    v.voto_bairro_gps, v.voto_cidade_gps, v.voto_lat, v.voto_lng,
    v.created_at, v.is_fraud_attempt, v.is_original_vote, v.status_integridade,
    vt.fingerprint, vt.ip_address, vt.is_suspicious,
    u.email::text, p.nome_exibicao, p.data_nascimento, p.genero, p.profissao
  FROM public.votos v
  LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
  LEFT JOIN auth.users u ON u.id = v.user_id
  LEFT JOIN public.profiles p ON p.id = v.user_id
  ORDER BY v.created_at DESC;
END;
$$;