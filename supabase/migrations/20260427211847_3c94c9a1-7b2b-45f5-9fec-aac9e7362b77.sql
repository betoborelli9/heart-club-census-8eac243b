CREATE TABLE public.club_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_display_name TEXT,
  clube_nome TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  suggested_value TEXT,
  applied_value TEXT,
  ai_verdict TEXT,
  ai_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.club_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own corrections"
  ON public.club_corrections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own corrections"
  ON public.club_corrections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all corrections"
  ON public.club_corrections FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX idx_club_corrections_clube ON public.club_corrections(clube_nome);
CREATE INDEX idx_club_corrections_user ON public.club_corrections(user_id);
CREATE INDEX idx_club_corrections_created ON public.club_corrections(created_at DESC);