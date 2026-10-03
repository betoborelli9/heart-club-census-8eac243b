-- REGRA DO BETO: o torcedor jamais altera um voto efetuado e jamais apaga o
-- proprio cadastro. Somente o administrador (Beto) -- ou o proprio sistema
-- (funcoes do banco e edge functions) -- pode mexer nisso.
--
-- O que NAO muda: o torcedor continua podendo atualizar o proprio territorio
-- (cidade, bairro, CEP, coordenadas) e pedir exclusao da conta pelo botao
-- oficial (request_account_deletion), que o Beto processa.

-- 1) VOTO IMUTAVEL ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.a_protect_vote_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
     OR NEW.sympathy_1 IS DISTINCT FROM OLD.sympathy_1
     OR NEW.sympathy_2 IS DISTINCT FROM OLD.sympathy_2
     OR NEW.sympathy_3 IS DISTINCT FROM OLD.sympathy_3
     OR NEW.sympathy_4 IS DISTINCT FROM OLD.sympathy_4
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
$$;

-- Nome comeca com "a_" para rodar ANTES dos outros gatilhos de BEFORE.
DROP TRIGGER IF EXISTS a_protect_vote_fields ON public.votos;
CREATE TRIGGER a_protect_vote_fields
  BEFORE INSERT OR UPDATE ON public.votos
  FOR EACH ROW EXECUTE FUNCTION public.a_protect_vote_fields();

-- 2) NINGUEM APAGA VOTO/CADASTRO PELO PROPRIO TORCEDOR ----------------------
DROP POLICY IF EXISTS "Usuário deleta próprio voto" ON public.votos;
DROP POLICY IF EXISTS "Admin deleta voto" ON public.votos;
CREATE POLICY "Admin deleta voto" ON public.votos
  FOR DELETE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin deleta perfil" ON public.profiles;
CREATE POLICY "Admin deleta perfil" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));

-- 3) VOTOS SUSPEITOS AGUARDANDO A DECISAO DO BETO ---------------------------
-- Alimenta o alerta vermelho piscando no Dashboard do master.
CREATE OR REPLACE FUNCTION public.admin_get_pending_suspicious_votes()
RETURNS TABLE(
  voto_id uuid,
  nome text,
  email text,
  clube_nome text,
  motivo text,
  votou_em timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    v.id::uuid,
    COALESCE(NULLIF(trim(p.nome_exibicao), ''), 'Torcedor')::text,
    COALESCE(u.email, v.email)::text,
    v.clube_nome::text,
    COALESCE(v.motivo_suspicao, 'Motivo não informado')::text,
    v.created_at::timestamptz
  FROM public.votos v
  LEFT JOIN public.profiles p ON p.id = v.user_id
  LEFT JOIN auth.users u ON u.id = v.user_id
  WHERE v.is_original_vote = true
    AND v.status_integridade IS DISTINCT FROM 'aprovado'
    AND (v.status_aprovacao = 'pendente' OR v.is_suspicious = true)
  ORDER BY v.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_pending_suspicious_votes() TO authenticated;

-- 4) OS 63 VOTOS ATUAIS: JA AUTORIZADOS PELO BETO (03/10/2026) ---------------
UPDATE public.votos
   SET status_integridade = 'aprovado'
 WHERE is_original_vote = true AND status_integridade IS NULL;

UPDATE public.votos_tracking SET is_suspicious = false WHERE is_suspicious = true;
