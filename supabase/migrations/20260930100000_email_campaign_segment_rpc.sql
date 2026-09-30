-- RPC: lista de torcedores por segmento (dispositivo + clube opcional), pra
-- alimentar o robo de campanha de e-mail no Admin. Device: 'android' | 'iphone'
-- | 'desktop' | null (todos).
CREATE OR REPLACE FUNCTION public.admin_get_email_segment(p_device text DEFAULT NULL, p_club text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) AND (SELECT email FROM auth.users WHERE id = auth.uid()) <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT
      p.id AS user_id,
      COALESCE(p.nome_exibicao, 'Torcedor') AS nome,
      u.email,
      p.device_hardware,
      CASE
        WHEN p.device_hardware ILIKE '%android%' THEN 'android'
        WHEN p.device_hardware ILIKE '%iphone%' OR p.device_hardware ILIKE '%ios %' OR p.device_hardware ILIKE 'ios' THEN 'iphone'
        ELSE 'desktop'
      END AS device,
      v.clube_nome
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.votos v ON v.user_id = p.id AND v.is_original_vote = true
    WHERE u.email IS NOT NULL
      AND (
        p_device IS NULL
        OR (p_device = 'android' AND p.device_hardware ILIKE '%android%')
        OR (p_device = 'iphone' AND (p.device_hardware ILIKE '%iphone%' OR p.device_hardware ILIKE '%ios %' OR p.device_hardware ILIKE 'ios'))
        OR (p_device = 'desktop' AND (p.device_hardware IS NULL OR (p.device_hardware NOT ILIKE '%android%' AND p.device_hardware NOT ILIKE '%iphone%' AND p.device_hardware NOT ILIKE '%ios%')))
      )
      AND (p_club IS NULL OR v.clube_nome = p_club)
    ORDER BY p.nome_exibicao
  ) t;

  RETURN result;
END;
$$;
