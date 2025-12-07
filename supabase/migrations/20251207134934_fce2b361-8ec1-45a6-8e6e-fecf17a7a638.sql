-- Drop the old folder policies
DROP POLICY IF EXISTS "Users can view their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can create their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.folders;

-- Create new user-specific folder policies (must have user_id matching auth.uid())
CREATE POLICY "Users can view their own folders"
ON public.folders
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own folders"
ON public.folders
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own folders"
ON public.folders
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own folders"
ON public.folders
FOR DELETE
USING (user_id = auth.uid());