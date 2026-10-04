-- De onde veio a cor de cada clube e quanta confianca ela merece.
-- Colunas novas e opcionais (nada existente muda). Valores: cores_fonte = 'ia_google' | 'escudo' | 'correcao_torcedor' | 'manual'
-- cores_confianca = 'alta' | 'media' | 'baixa'. Linhas antigas ficam NULL (origem desconhecida).
ALTER TABLE public.clubes_cache
  ADD COLUMN IF NOT EXISTS cores_fonte text,
  ADD COLUMN IF NOT EXISTS cores_confianca text;

NOTIFY pgrst, 'reload schema';
