CREATE POLICY "Authenticated users can delete members"
ON public.members
FOR DELETE
TO authenticated
USING (true);