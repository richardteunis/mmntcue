-- Allow authenticated users to lookup other profiles (needed for invitations)
CREATE POLICY "Authenticated users can view profiles by email for invites" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);