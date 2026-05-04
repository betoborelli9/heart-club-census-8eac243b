CREATE OR REPLACE FUNCTION public.admin_get_sympathy_votes()
 RETURNS TABLE(
   voto_id uuid,
   user_id uuid,
   clube_coracao text,
   clube_simpatia text,
   slot integer,
   pais text,
   estado text,
   cidade text,
   created_at timestamp with time zone,
   fingerprint text,
   user_email text,
   user_nome text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    v.id AS voto_id,
    v.user_id,
    v.clube_nome AS clube_coracao,
    s.club AS clube_simpatia,
    s.slot,
    v.pais, v.estado, v.cidade,
    v.created_at,
    vt.fingerprint,
    u.email::text AS user_email,
    p.nome_exibicao AS user_nome
  FROM public.votos v
  CROSS JOIN LATERAL (
    VALUES
      (v.sympathy_1, 1),
      (v.sympathy_2, 2),
      (v.sympathy_3, 3),
      (v.sympathy_4, 4)
  ) AS s(club, slot)
  LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
  LEFT JOIN auth.users u ON u.id = v.user_id
  LEFT JOIN public.profiles p ON p.id = v.user_id
  WHERE s.club IS NOT NULL AND length(trim(s.club)) > 0
  ORDER BY v.created_at DESC, s.slot ASC;
END;
$function$;