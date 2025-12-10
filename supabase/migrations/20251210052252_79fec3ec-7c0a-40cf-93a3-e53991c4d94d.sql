-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Show owners and editors can invite members" ON public.show_members;

-- Create a properly structured INSERT policy
CREATE POLICY "Show owners and editors can invite members"
ON public.show_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    -- Case 1: User is creating their own owner membership (show creation)
    (user_id = auth.uid() AND role = 'owner')
    OR
    -- Case 2: User is inviting someone else (they must be the inviter and have permission)
    (
      invited_by = auth.uid()
      AND (
        public.is_show_owner(show_id, auth.uid())
        OR
        public.is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
      )
    )
  )
);