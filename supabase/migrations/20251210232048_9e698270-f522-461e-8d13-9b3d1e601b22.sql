-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

-- Create updated SELECT policy that includes created_by
CREATE POLICY "Users can view workspaces they created or are members of"
ON public.workspaces FOR SELECT
USING (
  created_by = auth.uid() 
  OR is_workspace_member(id, auth.uid())
);