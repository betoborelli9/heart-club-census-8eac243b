
-- 1) Limpeza de lixo no cache
DELETE FROM public.clubes_cache 
WHERE nome ILIKE '%selecione%'
   OR nome ILIKE '%seu clube%'
   OR length(trim(nome)) < 3;

-- 2) RLS: permitir admins gerenciarem clubes_cache (INSERT/UPDATE), bloquear comuns
CREATE POLICY "Admins insert clubes_cache"
ON public.clubes_cache
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins update clubes_cache"
ON public.clubes_cache
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins delete clubes_cache"
ON public.clubes_cache
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3) Constraint mínima de qualidade do nome (mínimo 3 chars, não placeholder)
ALTER TABLE public.clubes_cache
  ADD CONSTRAINT clubes_cache_nome_valido
  CHECK (
    length(trim(nome)) >= 3
    AND nome !~* '^selecione'
    AND nome !~* 'seu clube'
  );
