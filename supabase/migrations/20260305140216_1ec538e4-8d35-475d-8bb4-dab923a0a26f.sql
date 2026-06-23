-- Drop overly permissive policies
DROP POLICY "Allow insert for registration" ON public.members;
DROP POLICY "Allow update for management" ON public.members;

-- Only authenticated users can insert members
CREATE POLICY "Authenticated users can insert members"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update members
CREATE POLICY "Authenticated users can update members"
  ON public.members FOR UPDATE
  TO authenticated
  USING (true);