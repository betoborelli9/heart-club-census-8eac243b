-- "ABECAT Ouvidorense" (api_id 23306, ja indexado na API-Football) foi
-- comprado e rebatizado "Agro Esporte Clube" em ago/2026, com escudo e
-- cores novas (fonte: GE + site oficial agroesporteclube.com.br). A
-- API-Football ainda nao atualizou o nome dela mesma -- por isso a
-- busca por "Agro Esporte Clube" nao achava nada. Atualiza o cadastro
-- EXISTENTE (preserva api_id/historico) em vez de criar um novo --
-- mesmo cuidado anti-duplicata do resto da sessao. Nao ha voto ainda
-- sob nenhum dos dois nomes, entao nao ha nada pra migrar em votos.
UPDATE public.clubes_cache
SET
  nome = 'Agro Esporte Clube',
  nome_curto = 'Agro EC',
  escudo_url = 'https://agroesporteclube.com.br/assets/bloco1/logotipo-60x80.webp',
  cor_primaria = '#16301F',
  cor_secundaria = '#C9A227',
  cor_terciaria = '#FFFFFF',
  atualizado_em = now()
WHERE api_id = '23306';
