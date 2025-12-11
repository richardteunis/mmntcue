import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Workspace, WorkspaceMember, WorkspaceWithRole, WorkspaceRole, WorkspacePlan } from '@/types/workspace';
import { useToast } from '@/hooks/use-toast';

export function useWorkspaces() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem('activeWorkspaceId');
  });
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch workspace memberships with workspace details
    const { data: memberships, error: membError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null);

    if (membError) {
      console.error('Error fetching workspace memberships:', membError);
      setLoading(false);
      return;
    }

    if (!memberships || memberships.length === 0) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const workspaceIds = memberships.map(m => m.workspace_id);
    
    const { data: workspaceData, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds);

    if (wsError) {
      console.error('Error fetching workspaces:', wsError);
      setLoading(false);
      return;
    }

    // Combine workspace data with roles
    const workspacesWithRoles: WorkspaceWithRole[] = (workspaceData || []).map(ws => {
      const membership = memberships.find(m => m.workspace_id === ws.id);
      return {
        ...ws,
        plan: ws.plan as WorkspacePlan,
        role: (membership?.role as WorkspaceRole) || 'member',
      };
    });

    setWorkspaces(workspacesWithRoles);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Persist active workspace
  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem('activeWorkspaceId', activeWorkspaceId);
    } else {
      localStorage.removeItem('activeWorkspaceId');
    }
  }, [activeWorkspaceId]);

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    if (!user) return null;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug: uniqueSlug,
        created_by: user.id,
      })
      .select()
      .single();

    if (wsError) {
      toast({
        title: 'Error creating workspace',
        description: wsError.message,
        variant: 'destructive',
      });
      return null;
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Error adding workspace owner:', memberError);
    }

    const wsWithRole: WorkspaceWithRole = {
      ...workspace,
      plan: workspace.plan as WorkspacePlan,
      role: 'owner',
    };

    setWorkspaces(prev => [...prev, wsWithRole]);
    toast({ title: 'Workspace created', description: `${name} is ready to use` });
    
    return workspace;
  };

  const updateWorkspace = async (id: string, updates: Partial<Workspace>): Promise<boolean> => {
    const { error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating workspace',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setWorkspaces(prev => prev.map(ws => 
      ws.id === id ? { ...ws, ...updates } : ws
    ));

    toast({ title: 'Workspace updated' });
    return true;
  };

  const deleteWorkspace = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting workspace',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setWorkspaces(prev => prev.filter(ws => ws.id !== id));
    
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(null);
    }

    toast({ title: 'Workspace deleted' });
    return true;
  };

  const inviteMember = async (
    workspaceId: string,
    email: string,
    role: WorkspaceRole
  ): Promise<boolean> => {
    if (!user) return false;

    // Find user by email
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!targetProfile) {
      // User doesn't exist yet - create pending invite and send invitation email
      const workspace = workspaces.find(ws => ws.id === workspaceId);
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Create the pending invite record first
      const { error: inviteError } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: workspaceId,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        });

      if (inviteError) {
        if (inviteError.code === '23505') {
          toast({
            title: 'Already invited',
            description: 'This email has already been invited to this workspace',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error creating invitation',
            description: inviteError.message,
            variant: 'destructive',
          });
        }
        return false;
      }

      // Send the invitation email
      try {
        const response = await supabase.functions.invoke('send-workspace-invite', {
          body: {
            email,
            workspaceId,
            workspaceName: workspace?.name || 'Workspace',
            inviterName: inviterProfile?.full_name || 'A team member',
            role,
          },
        });

        if (response.error) {
          console.error('Error sending invite:', response.error);
          // Don't fail - invite record was created successfully
        }

        toast({ 
          title: 'Invitation sent', 
          description: `An invitation email has been sent to ${email}` 
        });
        return true;
      } catch (err) {
        console.error('Error invoking send-workspace-invite:', err);
        // Don't fail - invite record was created successfully
        toast({ 
          title: 'Invitation created', 
          description: `Invitation created for ${email}. Email delivery may be delayed.` 
        });
        return true;
      }
    }

    const { error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: targetProfile.id,
        role,
        invited_by: user.id,
        accepted_at: new Date().toISOString(), // Auto-accept for existing users
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already a member',
          description: 'This user is already a member of this workspace',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error inviting member',
          description: error.message,
          variant: 'destructive',
        });
      }
      return false;
    }

    toast({ title: 'Member added', description: `${email} has been added to the workspace` });
    return true;
  };

  const acceptInvitation = async (workspaceId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('workspace_members')
      .update({ accepted_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error accepting invitation',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    await fetchWorkspaces();
    toast({ title: 'Joined workspace' });
    return true;
  };

  const leaveWorkspace = async (workspaceId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error leaving workspace',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
    
    if (activeWorkspaceId === workspaceId) {
      setActiveWorkspaceId(null);
    }

    toast({ title: 'Left workspace' });
    return true;
  };

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId) || null;

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loading,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    acceptInvitation,
    leaveWorkspace,
    refetch: fetchWorkspaces,
  };
}
