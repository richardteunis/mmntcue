import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  Plus, 
  Building2, 
  Settings, 
  Users, 
  Check,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkspaceWithRole, WORKSPACE_PLAN_LABELS, WORKSPACE_PLAN_COLORS } from '@/types/workspace';
import { useWorkspaces } from '@/hooks/useWorkspaces';

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ collapsed }) => {
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    leaveWorkspace,
  } = useWorkspaces();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    
    setCreating(true);
    const workspace = await createWorkspace(newWorkspaceName.trim());
    setCreating(false);
    
    if (workspace) {
      setActiveWorkspaceId(workspace.id);
      setNewWorkspaceName('');
      setCreateDialogOpen(false);
    }
  };

  const handleSelectWorkspace = (workspaceId: string | null) => {
    setActiveWorkspaceId(workspaceId);
  };

  const handleLeaveWorkspace = async (workspaceId: string) => {
    await leaveWorkspace(workspaceId);
  };

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-full h-10">
            {activeWorkspace ? (
              activeWorkspace.logo_url ? (
                <img 
                  src={activeWorkspace.logo_url} 
                  alt={activeWorkspace.name}
                  className="w-6 h-6 rounded object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {activeWorkspace.name.charAt(0).toUpperCase()}
                </div>
              )
            ) : (
              <Building2 size={18} />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-64">
          <WorkspaceMenuContent 
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelect={handleSelectWorkspace}
            onLeave={handleLeaveWorkspace}
            onCreateNew={() => setCreateDialogOpen(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between px-3 py-2 h-auto min-h-[48px] hover:bg-sidebar-accent"
          >
            <div className="flex items-center gap-3 min-w-0">
              {activeWorkspace ? (
                <>
                  {activeWorkspace.logo_url ? (
                    <img 
                      src={activeWorkspace.logo_url} 
                      alt={activeWorkspace.name}
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {activeWorkspace.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium text-sm truncate w-full">{activeWorkspace.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] h-4 px-1.5 font-medium",
                        WORKSPACE_PLAN_COLORS[activeWorkspace.plan]
                      )}
                    >
                      {WORKSPACE_PLAN_LABELS[activeWorkspace.plan]}
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Personal</span>
                </>
              )}
            </div>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <WorkspaceMenuContent 
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelect={handleSelectWorkspace}
            onLeave={handleLeaveWorkspace}
            onCreateNew={() => setCreateDialogOpen(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., Acme Productions"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={creating || !newWorkspaceName.trim()}>
              {creating ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface WorkspaceMenuContentProps {
  workspaces: WorkspaceWithRole[];
  activeWorkspaceId: string | null;
  onSelect: (id: string | null) => void;
  onLeave: (id: string) => void;
  onCreateNew: () => void;
}

const WorkspaceMenuContent: React.FC<WorkspaceMenuContentProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onLeave,
  onCreateNew,
}) => {
  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
        Switch workspace
      </DropdownMenuLabel>
      
      <DropdownMenuItem 
        onClick={() => onSelect(null)}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
            <Building2 size={12} className="text-muted-foreground" />
          </div>
          <span>Personal</span>
        </div>
        {activeWorkspaceId === null && <Check size={14} className="text-primary" />}
      </DropdownMenuItem>

      {workspaces.length > 0 && <DropdownMenuSeparator />}

      {workspaces.map((workspace) => (
        <DropdownMenuItem 
          key={workspace.id}
          onClick={() => onSelect(workspace.id)}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            {workspace.logo_url ? (
              <img 
                src={workspace.logo_url} 
                alt={workspace.name}
                className="w-6 h-6 rounded object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="truncate">{workspace.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{workspace.role}</span>
            </div>
          </div>
          {activeWorkspaceId === workspace.id && <Check size={14} className="text-primary shrink-0" />}
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />
      
      <DropdownMenuItem onClick={onCreateNew}>
        <Plus size={14} className="mr-2" />
        Create Workspace
      </DropdownMenuItem>
    </>
  );
};

export default WorkspaceSwitcher;
