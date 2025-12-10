-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Show owners and members can invite" ON public.show_members;

-- Create a more permissive INSERT policy that properly handles guest invites
CREATE POLICY "Show owners and editors can invite members"
ON public.show_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated and be the inviter
  auth.uid() IS NOT NULL 
  AND invited_by = auth.uid()
  AND (
    -- User is the show owner
    public.is_show_owner(show_id, auth.uid())
    OR
    -- User is a member with owner/editor role
    public.is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
    OR
    -- Allow creating own owner membership (for show creation)
    (user_id = auth.uid() AND role = 'owner' AND invited_by IS NULL)
  )
);