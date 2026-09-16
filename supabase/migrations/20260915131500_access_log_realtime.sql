-- Habilita Realtime (postgres_changes) na tabela access_log, pra o painel
-- de acessos do Admin atualizar na hora, sem precisar recarregar a página.
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_log;
