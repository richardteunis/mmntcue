-- Drop ALL existing INSERT/ALL policies on show_members and recreate clean ones
DROP POLICY IF EXISTS "Show owners and editors can invite members" ON public.show_members;
DROP POLICY IF EXISTS "Show owners and editors can manage members" ON public.show_members;
DROP POLICY IF EXISTS "Show owners and members can invite" ON public.show_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.show_members;

-- Clean SELECT policy
CREATE POLICY "Users can view show memberships"
ON public.show_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = invited_by
  OR public.is_show_owner(show_id, auth.uid())
  OR public.is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
);

-- INSERT policy that handles all valid invite scenarios
CREATE POLICY "Authenticated users can create memberships"
ON public.show_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- User creating their own owner membership for a new show
    (user_id = auth.uid() AND role = 'owner')
    OR
    -- User inviting others (must be the inviter AND have permission)
    (
      invited_by = auth.uid()
      AND (
        public.is_show_owner(show_id, auth.uid())
        OR public.is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
      )
    )
  )
);

-- UPDATE policy for managing member roles
CREATE POLICY "Owners and editors can update members"
ON public.show_members
FOR UPDATE
TO authenticated
USING (
  public.is_show_owner(show_id, auth.uid())
  OR public.is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
);

-- DELETE policy for removing members
CREATE POLICY "Owners and editors can delete members"
ON public.show_members
FOR DELETE
TO authenticated
USING (
  public.is_show_owner(show_id, auth.uid())
  OR public.is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
);