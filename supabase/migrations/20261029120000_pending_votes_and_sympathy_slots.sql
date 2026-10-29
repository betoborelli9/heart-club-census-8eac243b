-- ═══════════════════════════════════════════════════════════════════════════
-- 1) VOTOS PENDENTES: quem toca em "Enviar link" mas ainda não abriu o e-mail.
--    NÃO é voto: fica numa tabela à parte e NUNCA entra em ranking, mapa ou contagem.
--    Serve só para mandar UM lembrete 24h depois. Só o servidor (service role) lê e escreve.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.votos_pendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  clube_nome text NOT NULL,
  pv text,                               -- a escolha em formato de link (clube + "Termos mostrados"), para refazer o voto ao abrir o link
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reminder_sent_at timestamptz,          -- preenchido quando o ÚNICO lembrete é enviado (nunca repete)
  confirmed_at timestamptz               -- preenchido quando o torcedor votou de verdade
);
CREATE UNIQUE INDEX IF NOT EXISTS votos_pendentes_email_uniq ON public.votos_pendentes (lower(email));
CREATE INDEX IF NOT EXISTS votos_pendentes_due_idx ON public.votos_pendentes (created_at)
  WHERE reminder_sent_at IS NULL AND confirmed_at IS NULL;
ALTER TABLE public.votos_pendentes ENABLE ROW LEVEL SECURITY; -- sem política: ninguém de fora acessa
REVOKE ALL ON TABLE public.votos_pendentes FROM PUBLIC, anon, authenticated;

-- Esse e-mail já tem voto de verdade? (voto gravado com o e-mail, ou conta com esse e-mail que votou)
CREATE OR REPLACE FUNCTION public.hc_email_has_vote(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.votos v WHERE v.is_original_vote AND lower(v.email) = lower(p_email))
      OR EXISTS (SELECT 1 FROM public.votos v JOIN auth.users u ON u.id = v.user_id
                  WHERE v.is_original_vote AND lower(u.email) = lower(p_email));
$$;
REVOKE ALL ON FUNCTION public.hc_email_has_vote(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hc_email_has_vote(text) TO service_role;

-- Guarda (ou atualiza) o voto pendente no toque em "Enviar link". Não mexe na data original nem no lembrete já enviado.
CREATE OR REPLACE FUNCTION public.register_pending_vote(p_email text, p_club text, p_pv text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_club text := btrim(coalesce(p_club, ''));
BEGIN
  IF v_email = '' OR length(v_email) > 254 OR v_club = '' OR length(v_club) > 100 THEN
    RETURN;
  END IF;
  IF public.hc_email_has_vote(v_email) THEN
    RETURN; -- quem já votou não precisa de lembrete
  END IF;
  INSERT INTO public.votos_pendentes (email, clube_nome, pv)
  VALUES (v_email, v_club, CASE WHEN p_pv ~ '^[A-Za-z0-9_-]+$' AND length(p_pv) <= 1800 THEN p_pv ELSE NULL END)
  ON CONFLICT ((lower(email))) DO UPDATE
     SET clube_nome = EXCLUDED.clube_nome,
         pv = EXCLUDED.pv,
         updated_at = now(),
         confirmed_at = NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.register_pending_vote(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_pending_vote(text, text, text) TO service_role;

-- Arruma a casa e devolve quem está na hora de receber o lembrete: pediu o link há mais de 24h (e menos de 7 dias),
-- ainda não votou e nunca recebeu lembrete. Linhas com mais de 30 dias são apagadas (não guardamos e-mail à toa).
CREATE OR REPLACE FUNCTION public.pending_votes_due(p_limit int DEFAULT 50)
RETURNS TABLE (id uuid, email text, clube_nome text, pv text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.votos_pendentes p
     SET confirmed_at = now()
   WHERE p.confirmed_at IS NULL AND public.hc_email_has_vote(p.email);

  DELETE FROM public.votos_pendentes p WHERE p.created_at < now() - interval '30 days';

  RETURN QUERY
  SELECT p.id, p.email, p.clube_nome, p.pv
    FROM public.votos_pendentes p
   WHERE p.reminder_sent_at IS NULL
     AND p.confirmed_at IS NULL
     AND p.created_at <= now() - interval '24 hours'
     AND p.created_at > now() - interval '7 days'
   ORDER BY p.created_at
   LIMIT greatest(1, least(coalesce(p_limit, 50), 200));
END;
$$;
REVOKE ALL ON FUNCTION public.pending_votes_due(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_votes_due(int) TO service_role;

-- "Reserva" o lembrete antes de enviar: garante UM só, mesmo se a rotina rodar duas vezes ao mesmo tempo.
CREATE OR REPLACE FUNCTION public.claim_pending_reminder(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n int;
BEGIN
  UPDATE public.votos_pendentes
     SET reminder_sent_at = now()
   WHERE id = p_id AND reminder_sent_at IS NULL AND confirmed_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_pending_reminder(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_reminder(uuid) TO service_role;

-- Se o envio falhou, devolve a reserva (tenta de novo na próxima hora, dentro da janela de 7 dias).
CREATE OR REPLACE FUNCTION public.release_pending_reminder(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.votos_pendentes SET reminder_sent_at = NULL WHERE id = p_id;
$$;
REVOKE ALL ON FUNCTION public.release_pending_reminder(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_pending_reminder(uuid) TO service_role;

-- Rotina automática: a cada hora, no minuto 25, chama a função que envia o lembrete (leve: 24 chamadas por dia).
SELECT cron.schedule(
  'pending-vote-reminders-hourly',
  '25 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/pending-vote-reminders',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdHRsY2hrcWp0YnVzZmR3eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNDUsImV4cCI6MjA4NzY4MzA0NX0.sW94fnT4_3O24aTLi9WEMTNekzlI7t1B-1aK6w4wJP0"}'::jsonb,
    body:='{}'::jsonb,
    timeout_milliseconds:=60000
  );
  $$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) SIMPATIAS DEPOIS DO VOTO: o torcedor pode PREENCHER uma simpatia vazia no painel.
--    Continua proibido trocar ou apagar uma simpatia já gravada, e tudo o mais do voto segue protegido.
--    (única mudança: nos 4 testes de "sympathy_N", só vale como alteração se o campo já tinha valor)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.a_protect_vote_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Livre: admin/master, service_role (edge functions), sem usuario (manutencao)
  -- e atualizacoes feitas por OUTROS gatilhos (a auditoria de fraude do servidor).
  IF auth.uid() IS NULL
     OR auth.role() = 'service_role'
     OR public.is_admin_or_master(auth.uid())
     OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Ninguem se auto-aprova: a integridade so o admin define.
    NEW.status_integridade := NULL;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.clube_nome IS DISTINCT FROM OLD.clube_nome
     OR (OLD.sympathy_1 IS NOT NULL AND NEW.sympathy_1 IS DISTINCT FROM OLD.sympathy_1)
     OR (OLD.sympathy_2 IS NOT NULL AND NEW.sympathy_2 IS DISTINCT FROM OLD.sympathy_2)
     OR (OLD.sympathy_3 IS NOT NULL AND NEW.sympathy_3 IS DISTINCT FROM OLD.sympathy_3)
     OR (OLD.sympathy_4 IS NOT NULL AND NEW.sympathy_4 IS DISTINCT FROM OLD.sympathy_4)
     OR NEW.is_original_vote IS DISTINCT FROM OLD.is_original_vote
     OR NEW.status_aprovacao IS DISTINCT FROM OLD.status_aprovacao
     OR NEW.status_integridade IS DISTINCT FROM OLD.status_integridade
     OR NEW.is_suspicious IS DISTINCT FROM OLD.is_suspicious
     OR NEW.is_fraud_attempt IS DISTINCT FROM OLD.is_fraud_attempt
     OR NEW.potential_duplicate_user IS DISTINCT FROM OLD.potential_duplicate_user
     OR NEW.motivo_suspicao IS DISTINCT FROM OLD.motivo_suspicao
     OR NEW.ip_address IS DISTINCT FROM OLD.ip_address
     OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint
     OR NEW.voto_ip IS DISTINCT FROM OLD.voto_ip THEN
    RAISE EXCEPTION 'Um voto efetuado nao pode ser alterado.';
  END IF;

  RETURN NEW;
END;
$function$;
