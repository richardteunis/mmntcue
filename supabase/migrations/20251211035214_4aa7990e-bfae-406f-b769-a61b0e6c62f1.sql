-- Allow users to accept their own workspace invitations
CREATE POLICY "Users can accept their own workspace invitations" 
ON public.workspace_members 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() AND accepted_at IS NULL)
WITH CHECK (user_id = auth.uid());