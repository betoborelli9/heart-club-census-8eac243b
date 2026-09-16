-- RPC: lista de torcedores com WhatsApp cadastrado, pra disparo assistido
-- de campanhas (Beto clica em cada um, WhatsApp abre com a mensagem
-- pronta — sem automacao de disparo em massa, evita banimento do numero).
CREATE OR REPLACE FUNCTION public.admin_get_whatsapp_contacts(p_club text DEFAULT NULL)
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
      p.nome_exibicao AS nome,
      u.email,
      p.telefone AS whatsapp,
      p.pais,
      v.clube_nome
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.votos v ON v.user_id = p.id AND v.is_original_vote = true
    WHERE p.telefone IS NOT NULL AND length(trim(p.telefone)) > 0
      AND (p_club IS NULL OR v.clube_nome = p_club)
    ORDER BY p.nome_exibicao
  ) t;

  RETURN result;
END;
$$;
