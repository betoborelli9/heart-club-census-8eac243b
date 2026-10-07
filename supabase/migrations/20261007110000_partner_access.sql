-- ACESSO DE PARCEIROS: o parceiro vota como torcedor, pede acesso ("Sou parceiro"), o Beto autoriza no Admin.
-- Só quem está APROVADO (ou é admin/master) enxerga a página do parceiro. Tudo passa por funções que
-- conferem a permissão no banco; ninguém lê a tabela direto.

CREATE TABLE IF NOT EXISTS public.partner_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company      text NOT NULL,
  contact      text NOT NULL,
  message      text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at   timestamptz,
  decided_by   uuid
);
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_requests FROM anon, authenticated;

-- Quem é parceiro autorizado (ou admin/master)? Usado pelas funções da página do parceiro.
CREATE OR REPLACE FUNCTION public.is_partner(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL AND (
    public.is_admin_or_master(_uid)
    OR EXISTS (SELECT 1 FROM public.partner_requests WHERE user_id = _uid AND status = 'approved')
  );
$$;
REVOKE ALL ON FUNCTION public.is_partner(uuid) FROM PUBLIC, anon, authenticated;

-- Situação do usuário logado: none | pending | approved | rejected | revoked (admin/master = approved)
CREATE OR REPLACE FUNCTION public.get_my_partner_status()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'none'; END IF;
  IF public.is_admin_or_master(auth.uid()) THEN RETURN 'approved'; END IF;
  SELECT status INTO s FROM public.partner_requests WHERE user_id = auth.uid();
  RETURN coalesce(s, 'none');
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_partner_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_partner_status() TO authenticated;

-- "Sou parceiro": cria (ou atualiza) o pedido do próprio usuário. Não reabre pedido já recusado/retirado.
CREATE OR REPLACE FUNCTION public.request_partner_access(p_company text, p_contact text, p_message text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cur text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login obrigatorio' USING ERRCODE = '42501'; END IF;
  IF length(btrim(coalesce(p_company, ''))) < 2 OR length(btrim(coalesce(p_contact, ''))) < 5 THEN
    RAISE EXCEPTION 'dados insuficientes' USING ERRCODE = '22023';
  END IF;
  SELECT status INTO cur FROM public.partner_requests WHERE user_id = auth.uid();
  IF cur IN ('approved', 'rejected', 'revoked') THEN RETURN cur; END IF;
  INSERT INTO public.partner_requests (user_id, company, contact, message)
  VALUES (auth.uid(), left(btrim(p_company), 120), left(btrim(p_contact), 160), left(nullif(btrim(coalesce(p_message, '')), ''), 500))
  ON CONFLICT (user_id) DO UPDATE
    SET company = EXCLUDED.company, contact = EXCLUDED.contact, message = EXCLUDED.message, requested_at = now();
  RETURN 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.request_partner_access(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_partner_access(text, text, text) TO authenticated;

-- ADMIN: lista de pedidos (com nome e e-mail para você reconhecer quem é)
CREATE OR REPLACE FUNCTION public.admin_list_partner_requests()
RETURNS TABLE (user_id uuid, nome text, email text, company text, contact text, message text,
               status text, requested_at timestamptz, decided_at timestamptz, clube text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT r.user_id, coalesce(p.nome_exibicao, '')::text, u.email::text, r.company, r.contact, r.message,
           r.status, r.requested_at, r.decided_at,
           (SELECT v.clube_nome FROM public.votos v WHERE v.user_id = r.user_id AND v.is_original_vote LIMIT 1)::text
    FROM public.partner_requests r
    JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN public.profiles p ON p.id = r.user_id
    ORDER BY (r.status = 'pending') DESC, r.requested_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_partner_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_partner_requests() TO authenticated;

-- ADMIN: autorizar, recusar ou retirar o acesso
CREATE OR REPLACE FUNCTION public.admin_decide_partner(p_user_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('approved', 'rejected', 'revoked', 'pending') THEN
    RAISE EXCEPTION 'situacao invalida' USING ERRCODE = '22023';
  END IF;
  UPDATE public.partner_requests
     SET status = p_status, decided_at = now(), decided_by = auth.uid()
   WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_decide_partner(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_partner(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
