
-- Add UPDATE and DELETE policies for votos so users can manage their own votes
CREATE POLICY "Usuário atualiza próprio voto"
ON public.votos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuário deleta próprio voto"
ON public.votos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
