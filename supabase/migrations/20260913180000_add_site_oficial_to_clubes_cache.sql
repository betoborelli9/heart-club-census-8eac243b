-- Adiciona coluna para o site oficial do clube, usada pelo club-news para
-- priorizar noticias vindas diretamente da fonte oficial do clube.
ALTER TABLE public.clubes_cache
  ADD COLUMN IF NOT EXISTS site_oficial text;
