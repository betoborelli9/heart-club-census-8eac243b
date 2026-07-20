-- Corrige falha crítica: public.users guardava dados pessoais (email, nome,
-- data de nascimento, push_token) sem nenhuma proteção de acesso (RLS
-- desativado), permitindo leitura/gravação/exclusão por qualquer pessoa via
-- API, sem login. Alinha com o padrão já usado no restante do projeto
-- (função is_admin_or_master para acesso master/admin).

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own row"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own row"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own row"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins manage all users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_master(auth.uid()))
  WITH CHECK (public.is_admin_or_master(auth.uid()));
