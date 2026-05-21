WITH ip_geo(ip, city, region, country) AS (
  VALUES
    ('191.56.204.172', 'Goiânia', 'Goiás', 'Brasil'),
    ('146.75.191.35', 'Goiânia', 'Goiás', 'Brasil'),
    ('45.176.17.187', 'Goiânia', 'Goiás', 'Brasil'),
    ('168.195.133.23', 'Goiânia', 'Goiás', 'Brasil'),
    ('187.68.170.35', 'Goiânia', 'Goiás', 'Brasil'),
    ('177.6.119.238', 'Goiânia', 'Goiás', 'Brasil'),
    ('179.249.75.182', 'Brasília', 'Distrito Federal', 'Brasil'),
    ('38.3.208.133', 'Rondonópolis', 'Mato Grosso', 'Brasil'),
    ('191.123.217.70', 'Goiânia', 'Goiás', 'Brasil'),
    ('191.56.254.125', 'Goiânia', 'Goiás', 'Brasil')
)
UPDATE public.votos v
SET
  cidade = g.city,
  estado = g.region,
  pais = COALESCE(NULLIF(v.pais, ''), g.country),
  voto_cidade = COALESCE(NULLIF(v.voto_cidade, ''), g.city),
  voto_pais = COALESCE(NULLIF(v.voto_pais, ''), g.country)
FROM ip_geo g
WHERE v.ip_address = g.ip
  AND (NULLIF(v.cidade, '') IS NULL OR NULLIF(v.estado, '') IS NULL);