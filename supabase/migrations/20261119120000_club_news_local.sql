-- NOTÍCIAS LOCAIS DOS CLUBES: duas tabelas de apoio, só o servidor (service role) lê e escreve.
--  • club_news_profile: como a imprensa LOCAL escreve o nome do clube e da cidade (ex.: FC Gifu → FC岐阜), na língua do país.
--    A IA descobre uma vez e fica guardado para sempre (nunca pergunta de novo).
--  • club_news_cache: resposta pronta por clube por alguns minutos (10 min clube grande, 60 min clube pequeno), para as
--    buscas locais (mais pesadas) não rodarem a cada abertura de tela. Linhas vencidas há mais de 3 dias são limpas pela própria função.
CREATE TABLE IF NOT EXISTS public.club_news_profile (
  club_key text PRIMARY KEY,
  club_name text NOT NULL,
  profile jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_news_cache (
  club_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS club_news_cache_expires_idx ON public.club_news_cache (expires_at);

ALTER TABLE public.club_news_profile ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa
ALTER TABLE public.club_news_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.club_news_profile FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.club_news_cache FROM PUBLIC, anon, authenticated;
