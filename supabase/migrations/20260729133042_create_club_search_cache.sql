-- Cache de resultados de busca da API-Football (search-clubs). A busca de
-- clubes batia na API-Football em toda tecla digitada, sem cache nenhum —
-- provável maior consumidor de cota diária (qualquer torcedor buscando
-- "Flamengo" gastava requisição nova, mesmo sendo o milésimo a buscar isso
-- no mesmo dia). Guardado por termo normalizado, reaproveitado por alguns
-- minutos entre torcedores diferentes.

CREATE TABLE IF NOT EXISTS public.club_search_cache (
  query_norm text PRIMARY KEY,
  api_results jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.club_search_cache ENABLE ROW LEVEL SECURITY;
-- Sem policies: só a service role (usada pela edge function) acessa esta
-- tabela; nunca é consultada direto pelo cliente.
