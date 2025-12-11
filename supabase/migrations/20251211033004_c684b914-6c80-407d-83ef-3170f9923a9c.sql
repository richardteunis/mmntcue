-- Create workspace_invites table for pending invitations
CREATE TABLE public.workspace_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(workspace_id, email)
);

-- Enable RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Workspace owners and admins can view invites
CREATE POLICY "Workspace admins can view invites"
ON public.workspace_invites
FOR SELECT
USING (is_workspace_member(workspace_id, auth.uid(), ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- Workspace owners and admins can create invites
CREATE POLICY "Workspace admins can create invites"
ON public.workspace_invites
FOR INSERT
WITH CHECK (is_workspace_member(workspace_id, auth.uid(), ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- Workspace owners and admins can delete invites
CREATE POLICY "Workspace admins can delete invites"
ON public.workspace_invites
FOR DELETE
USING (is_workspace_member(workspace_id, auth.uid(), ARRAY['owner'::workspace_role, 'admin'::workspace_role]));