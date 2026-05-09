CREATE OR REPLACE FUNCTION public.admin_get_votes_with_tracking()
RETURNS TABLE(
  voto_id uuid,
  clube_nome text,
  user_email text,
  user_nome text,
  ip_address text,
  cep text,
  cidade text,
  estado text,
  is_suspicious boolean,
  status_aprovacao text,
  motivo_suspicao text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.id AS voto_id,
    v.clube_nome::text,
    u.email::text AS user_email,
    p.nome_exibicao::text AS user_nome,
    v.ip_address::text,
    v.cep::text,
    v.cidade::text,
    v.estado::text,
    v.is_suspicious,
    v.status_aprovacao::text,
    v.motivo_suspicao::text,
    v.created_at
  FROM public.votos v
  LEFT JOIN auth.users u ON v.user_id = u.id
  LEFT JOIN public.profiles p ON v.user_id = p.id
  ORDER BY v.created_at DESC;
END;
$function$;