
-- 1. Fix ALL is_feminino = false for men's teams (they were incorrectly flagged)
UPDATE clubes_cache SET is_feminino = false WHERE is_feminino = true;

-- 2. Fix Corinthians (had Portuguesa's data - api_id 131 was wrong mapping)
UPDATE clubes_cache SET 
  cor_primaria = '#000000',
  cor_secundaria = '#ffffff',
  cor_terciaria = '#000000',
  mascote = 'Mosqueteiro',
  estadio_nome = 'Neo Química Arena',
  estadio_capacidade = 49205,
  estadio_cidade = 'São Paulo'
WHERE nome = 'Corinthians';

-- 3. Fix São Paulo mascote and stadium
UPDATE clubes_cache SET 
  mascote = 'São Paulo',
  estadio_nome = 'MorumBIS',
  cor_primaria = '#ff0000',
  cor_secundaria = '#ffffff',
  cor_terciaria = '#000000'
WHERE nome = 'São Paulo';

-- 4. Fix Náutico stadium
UPDATE clubes_cache SET 
  estadio_nome = 'Aflitos',
  estadio_capacidade = 19800,
  estadio_cidade = 'Recife',
  cor_primaria = '#cc0000',
  cor_secundaria = '#ffffff',
  cor_terciaria = '#000000',
  mascote = 'Timbu'
WHERE nome = 'Náutico';

-- 5. Fix Fortaleza stadium
UPDATE clubes_cache SET 
  estadio_nome = 'Arena Castelão',
  estadio_capacidade = 63903,
  estadio_cidade = 'Fortaleza',
  cor_primaria = '#0047AB',
  cor_secundaria = '#cc0000',
  cor_terciaria = '#ffffff',
  mascote = 'Leão',
  division = 'Série A'
WHERE nome = 'Fortaleza';

-- 6. Fix ABC (all NULLs)
UPDATE clubes_cache SET 
  cor_primaria = '#000000',
  cor_secundaria = '#ffffff',
  cor_terciaria = '#000000',
  mascote = 'Elefante',
  division = 'Série C',
  estadio_nome = 'Frasqueirão',
  estadio_capacidade = 18000,
  estadio_cidade = 'Natal'
WHERE nome = 'ABC';

-- 7. Fix Arsenal (all NULLs)
UPDATE clubes_cache SET 
  cor_primaria = '#EF0107',
  cor_secundaria = '#063672',
  cor_terciaria = '#ffffff',
  mascote = 'Gunnersaurus',
  division = 'Premier League'
WHERE nome = 'Arsenal';

-- 8. Fix Barcelona (all NULLs)
UPDATE clubes_cache SET 
  cor_primaria = '#A50044',
  cor_secundaria = '#004D98',
  cor_terciaria = '#EDBB00',
  mascote = 'N/A',
  division = 'La Liga'
WHERE nome = 'Barcelona';

-- 9. Fix Barcelona SC (all NULLs)
UPDATE clubes_cache SET 
  cor_primaria = '#FFD700',
  cor_secundaria = '#000000',
  cor_terciaria = '#ffffff',
  mascote = 'Ídolo del Astillero',
  division = 'Liga Pro'
WHERE nome = 'Barcelona SC';

-- 10. Fix Inter Miami (all NULLs)
UPDATE clubes_cache SET 
  cor_primaria = '#F7B5CD',
  cor_secundaria = '#231F20',
  cor_terciaria = '#ffffff',
  mascote = 'N/A',
  division = 'MLS'
WHERE nome = 'Inter Miami';

-- 11. Fix Ceará division (was Série B, actually in Série B 2025)
UPDATE clubes_cache SET 
  division = 'Série B',
  estadio_nome = 'Arena Castelão',
  estadio_capacidade = 63903,
  estadio_cidade = 'Fortaleza'
WHERE nome = 'Ceará';

-- 12. Fix Avaí (incorrect blue - should be darker)
UPDATE clubes_cache SET 
  cor_primaria = '#003DA5',
  cor_secundaria = '#ffffff',
  cor_terciaria = '#003DA5'
WHERE nome = 'Avaí';

-- 13. Fix Bahia mascote (Super-Homem is a fan thing, official is Tricolor de Aço)
-- Actually Super-Homem is widely accepted, keep it.

-- 14. Fix Botafogo mascote/colors are correct. Fix Manequinho -> keep.

-- 15. Fix Vasco mascote (Almirante is correct)

-- 16. Fix has_feminino for clubs that truly have women's teams
UPDATE clubes_cache SET has_feminino = true WHERE nome IN (
  'Corinthians', 'São Paulo', 'Palmeiras', 'Santos', 'Flamengo', 'Fluminense',
  'Grêmio', 'Internacional', 'Cruzeiro', 'Atlético-MG', 'Botafogo', 'Vasco',
  'Bahia', 'Sport', 'Fortaleza', 'Ceará', 'Bragantino', 'Ferroviária',
  'América-MG', 'Atlético-GO', 'Avaí', 'Coritiba', 'Vila Nova', 'Vitória',
  'Paysandu', 'Remo', 'Sampaio Corrêa', 'Náutico'
);
