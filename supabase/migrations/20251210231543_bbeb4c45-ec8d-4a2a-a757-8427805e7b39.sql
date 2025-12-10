-- Create workspace plan enum
CREATE TYPE public.workspace_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');

-- Create workspace member role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  plan workspace_plan NOT NULL DEFAULT 'free',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_members table (this IS the roles table for workspaces)
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(workspace_id, user_id)
);

-- Add workspace_id to shows (optional - shows can be personal or workspace)
ALTER TABLE public.shows ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID, _roles workspace_role[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND accepted_at IS NOT NULL
      AND (_roles IS NULL OR role = ANY(_roles))
  )
$$;

-- Create security definer function to check if user is workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role = 'owner'
      AND accepted_at IS NOT NULL
  )
$$;

-- RLS policies for workspaces
CREATE POLICY "Users can view workspaces they are members of"
ON public.workspaces FOR SELECT
USING (
  is_workspace_member(id, auth.uid())
);

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Workspace owners and admins can update"
ON public.workspaces FOR UPDATE
USING (is_workspace_member(id, auth.uid(), ARRAY['owner', 'admin']::workspace_role[]));

CREATE POLICY "Only workspace owners can delete"
ON public.workspaces FOR DELETE
USING (is_workspace_owner(id, auth.uid()));

-- RLS policies for workspace_members
CREATE POLICY "Users can view workspace memberships"
ON public.workspace_members FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_workspace_member(workspace_id, auth.uid())
);

CREATE POLICY "Workspace owners and admins can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    -- Allow creating self as owner when creating workspace
    (user_id = auth.uid() AND role = 'owner')
    OR is_workspace_member(workspace_id, auth.uid(), ARRAY['owner', 'admin']::workspace_role[])
  )
);

CREATE POLICY "Workspace owners and admins can update members"
ON public.workspace_members FOR UPDATE
USING (is_workspace_member(workspace_id, auth.uid(), ARRAY['owner', 'admin']::workspace_role[]));

CREATE POLICY "Workspace owners and admins can remove members"
ON public.workspace_members FOR DELETE
USING (
  user_id = auth.uid()
  OR is_workspace_member(workspace_id, auth.uid(), ARRAY['owner', 'admin']::workspace_role[])
);

-- Update shows RLS to include workspace access
DROP POLICY IF EXISTS "Users can view their own shows or shared shows" ON public.shows;
CREATE POLICY "Users can view their own shows or shared shows or workspace shows"
ON public.shows FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR (user_id IS NULL) 
  OR (EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = shows.id AND sm.user_id = auth.uid()))
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()))
);

DROP POLICY IF EXISTS "Show owners can update shows" ON public.shows;
CREATE POLICY "Show owners or workspace members can update shows"
ON public.shows FOR UPDATE
USING (
  (user_id = auth.uid()) 
  OR (user_id IS NULL) 
  OR (EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = shows.id AND sm.user_id = auth.uid() AND sm.role = ANY(ARRAY['owner', 'editor'])))
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid(), ARRAY['owner', 'admin']::workspace_role[]))
);

-- Trigger for updated_at on workspaces
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster workspace show lookups
CREATE INDEX idx_shows_workspace_id ON public.shows(workspace_id);