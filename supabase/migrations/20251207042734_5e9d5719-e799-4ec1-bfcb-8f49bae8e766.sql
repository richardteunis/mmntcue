-- Drop restrictive INSERT policy on show_members
DROP POLICY IF EXISTS "Users can insert as owner" ON public.show_members;

-- Create policy that allows show owners/editors AND allows inserting guest/viewer invites
-- Show owners (via is_show_owner) or existing owner/editor members can invite others
CREATE POLICY "Show owners and members can invite"
ON public.show_members
FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Show owner (direct owner of show) can invite
    is_show_owner(show_id, auth.uid())
    OR
    -- Existing owner/editor member can invite
    is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
    OR
    -- User can add themselves as owner (for new show creation)
    (auth.uid() = user_id AND role = 'owner')
  )
);