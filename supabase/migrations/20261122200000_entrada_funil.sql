-- FUNIL DA PORTA DE ENTRADA: em que passo cada visitante do anúncio/story desiste.
-- Só passos anônimos (sem nome, e-mail ou clube escolhido): "abriu", "tocou no time", "tocou no Google", "abriu no Chrome"…
-- Ninguém grava nem lê a tabela direto: a gravação passa pela função registrar_passo_entrada (valida tudo e limita abuso);
-- a leitura é só do servidor/admin pelo banco.
CREATE TABLE IF NOT EXISTS public.entrada_funil (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id text NOT NULL CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
  origem_id text CHECK (origem_id IS NULL OR char_length(origem_id) BETWEEN 8 AND 64), -- id do visitante no Instagram, quando ele abre o Chrome
  etapa text NOT NULL CHECK (etapa IN ('abriu', 'toque_time', 'toque_google', 'abrir_chrome', 'aviso_ios', 'chrome_chegou', 'google_iniciado', 'envio_link_email', 'voto_gravado')),
  plataforma text NOT NULL DEFAULT 'outro' CHECK (plataforma IN ('android', 'ios', 'outro')),
  in_app boolean NOT NULL DEFAULT false, -- dentro do navegador do Instagram/Facebook/TikTok
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entrada_funil_created_idx ON public.entrada_funil (created_at DESC);
CREATE INDEX IF NOT EXISTS entrada_funil_visitor_idx ON public.entrada_funil (visitor_id, etapa);

ALTER TABLE public.entrada_funil ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa direto
REVOKE ALL ON TABLE public.entrada_funil FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_passo_entrada(
  p_visitor_id text, p_origem_id text, p_etapa text, p_plataforma text, p_in_app boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_visitor_id IS NULL OR char_length(p_visitor_id) NOT BETWEEN 8 AND 64 THEN RETURN; END IF;
  IF p_etapa NOT IN ('abriu', 'toque_time', 'toque_google', 'abrir_chrome', 'aviso_ios', 'chrome_chegou', 'google_iniciado', 'envio_link_email', 'voto_gravado') THEN RETURN; END IF;
  -- no máximo 1 registro por visitante, passo e dia (o navegador já controla, aqui é a trava contra abuso)
  IF EXISTS (
    SELECT 1 FROM public.entrada_funil
    WHERE visitor_id = p_visitor_id AND etapa = p_etapa AND created_at > now() - interval '20 hours'
  ) THEN RETURN; END IF;
  INSERT INTO public.entrada_funil (visitor_id, origem_id, etapa, plataforma, in_app)
  VALUES (
    p_visitor_id,
    CASE WHEN p_origem_id IS NOT NULL AND char_length(p_origem_id) BETWEEN 8 AND 64 THEN p_origem_id END,
    p_etapa,
    CASE WHEN p_plataforma IN ('android', 'ios') THEN p_plataforma ELSE 'outro' END,
    coalesce(p_in_app, false)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_passo_entrada(text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_passo_entrada(text, text, text, text, boolean) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
