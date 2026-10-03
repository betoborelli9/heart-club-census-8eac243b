-- Preenche cidade/estádio/fundação do Agro Esporte Clube (ex-Abecat) com os
-- dados reais herdados do Abecat (Wikipedia + Federação Goiana de Futebol):
-- fundado em Ouvidor-GO, joga no Estádio Municipal Luiz Benedito (cap. 1.000).
-- Mascote segue null (ainda não definido pelo clube no rebranding).
UPDATE public.clubes_cache
SET
  cidade = 'Ouvidor',
  fundado = 2016,
  estadio_nome = 'Estádio Municipal Luiz Benedito',
  estadio_cidade = 'Ouvidor',
  estadio_capacidade = 1000
WHERE api_id = '23306';
