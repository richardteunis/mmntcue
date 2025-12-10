export type WorkspacePlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: WorkspacePlan;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
}

export const WORKSPACE_PLAN_LABELS: Record<WorkspacePlan, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export const WORKSPACE_PLAN_COLORS: Record<WorkspacePlan, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-500/20 text-blue-400',
  professional: 'bg-violet-500/20 text-violet-400',
  enterprise: 'bg-amber-500/20 text-amber-400',
};
