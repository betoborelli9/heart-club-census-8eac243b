-- Votou, registrou: cada torcedor tem no maximo 1 voto original. Antes so a
-- tela impedia o segundo voto; agora o proprio banco recusa (mesmo se alguem
-- chamar a API direto). Conferido: nao existe nenhum torcedor com 2 votos.
CREATE UNIQUE INDEX IF NOT EXISTS votos_one_original_per_user
  ON public.votos (user_id)
  WHERE is_original_vote = true AND user_id IS NOT NULL;
