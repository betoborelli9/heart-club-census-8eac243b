-- Enable RLS on tables flagged in audit
ALTER TABLE public.clubes_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_profissoes ENABLE ROW LEVEL SECURITY;

-- clubes_override: admin-only write, authenticated read (used to override club data)
CREATE POLICY "clubes_override readable by authenticated"
  ON public.clubes_override FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "clubes_override admin write"
  ON public.clubes_override FOR ALL
  TO authenticated
  USING (public.is_admin_or_master(auth.uid()))
  WITH CHECK (public.is_admin_or_master(auth.uid()));

-- lista_profissoes: public read (used in profile setup dropdown), admin write
CREATE POLICY "lista_profissoes public read"
  ON public.lista_profissoes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "lista_profissoes admin write"
  ON public.lista_profissoes FOR ALL
  TO authenticated
  USING (public.is_admin_or_master(auth.uid()))
  WITH CHECK (public.is_admin_or_master(auth.uid()));