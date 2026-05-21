UPDATE public.votos v
SET
  cidade = COALESCE(NULLIF(v.cidade, ''), NULLIF(v.voto_cidade_gps, ''), NULLIF(v.voto_cidade, ''), NULLIF(p.cidade, ''), v.cidade),
  estado = COALESCE(NULLIF(v.estado, ''), NULLIF(p.estado, ''), v.estado)
FROM public.profiles p
WHERE p.id = v.user_id
  AND (NULLIF(v.cidade, '') IS NULL OR NULLIF(v.estado, '') IS NULL);