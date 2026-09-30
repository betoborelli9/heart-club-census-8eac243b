-- Normaliza variantes de nome de clube que sao o MESMO clube mas ficavam
-- contadas separado em rankings (ex: "Vila Nova" vs "Vila Nova Futebol
-- Clube"). Confirmado via clubes_cache qual e a grafia oficial de cada
-- par -- sempre a forma curta, que ja tem cidade/pais completos; a forma
-- longa era um cadastro incompleto/duplicado ("Nao informado").

-- Vila Nova
UPDATE public.votos SET clube_nome = 'Vila Nova' WHERE clube_nome = 'Vila Nova Futebol Clube';
UPDATE public.votos SET sympathy_1 = 'Vila Nova' WHERE sympathy_1 = 'Vila Nova Futebol Clube';
UPDATE public.votos SET sympathy_2 = 'Vila Nova' WHERE sympathy_2 = 'Vila Nova Futebol Clube';
UPDATE public.votos SET sympathy_3 = 'Vila Nova' WHERE sympathy_3 = 'Vila Nova Futebol Clube';
UPDATE public.votos SET sympathy_4 = 'Vila Nova' WHERE sympathy_4 = 'Vila Nova Futebol Clube';

-- Goias
UPDATE public.votos SET clube_nome = 'Goias' WHERE clube_nome = 'Goiás Esporte Clube';
UPDATE public.votos SET sympathy_1 = 'Goias' WHERE sympathy_1 = 'Goiás Esporte Clube';
UPDATE public.votos SET sympathy_2 = 'Goias' WHERE sympathy_2 = 'Goiás Esporte Clube';
UPDATE public.votos SET sympathy_3 = 'Goias' WHERE sympathy_3 = 'Goiás Esporte Clube';
UPDATE public.votos SET sympathy_4 = 'Goias' WHERE sympathy_4 = 'Goiás Esporte Clube';

-- Sao Paulo
UPDATE public.votos SET clube_nome = 'Sao Paulo' WHERE clube_nome = 'São Paulo Futebol Clube';
UPDATE public.votos SET sympathy_1 = 'Sao Paulo' WHERE sympathy_1 = 'São Paulo Futebol Clube';
UPDATE public.votos SET sympathy_2 = 'Sao Paulo' WHERE sympathy_2 = 'São Paulo Futebol Clube';
UPDATE public.votos SET sympathy_3 = 'Sao Paulo' WHERE sympathy_3 = 'São Paulo Futebol Clube';
UPDATE public.votos SET sympathy_4 = 'Sao Paulo' WHERE sympathy_4 = 'São Paulo Futebol Clube';

-- Remove o cadastro duplicado/incompleto de clube (so existia esse 1 caso
-- com registro proprio em clubes_cache; os outros dois eram so texto solto
-- em votos, sem linha propria no cache).
DELETE FROM public.clubes_cache WHERE nome = 'Vila Nova Futebol Clube';
