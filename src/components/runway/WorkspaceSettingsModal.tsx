import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  Trash2, 
  Plus, 
  Users, 
  Settings, 
  Building2,
  Crown,
  Shield,
  User,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WorkspaceWithRole, WorkspaceRole, WORKSPACE_PLAN_LABELS, WORKSPACE_PLAN_COLORS } from '@/types/workspace';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';

interface WorkspaceMemberWithProfile {
  id: string;
  user_id: string;
  role: WorkspaceRole;
  accepted_at: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  invited_at: string;
}

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: WorkspaceWithRole;
  onUpdate: (updates: Partial<WorkspaceWithRole>) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onInvite: (email: string, role: WorkspaceRole) => Promise<boolean>;
}

const ROLE_ICONS: Record<WorkspaceRole, React.ReactNode> = {
  owner: <Crown size={12} className="text-amber-500" />,
  admin: <Shield size={12} className="text-blue-500" />,
  member: <User size={12} className="text-muted-foreground" />,
};

// Member Row Component
interface MemberRowProps {
  member: WorkspaceMemberWithProfile;
  isCurrentUser: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  onUpdateRole: (memberId: string, role: WorkspaceRole) => void;
  onRemove: (memberId: string, userId: string) => void;
  isPending?: boolean;
}

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isCurrentUser,
  isAdmin,
  isOwner,
  onUpdateRole,
  onRemove,
  isPending,
}) => {
  const isMemberOwner = member.role === 'owner';
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isPending ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30 hover:bg-muted/50"
      )}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={member.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.profile?.full_name || 'Unknown'}
          {isCurrentUser && <span className="text-muted-foreground"> (you)</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {member.profile?.email}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isPending && (
          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">Pending</Badge>
        )}
        {isAdmin && !isCurrentUser && !isMemberOwner ? (
          <Select 
            value={member.role} 
            onValueChange={(v) => onUpdateRole(member.id, v as WorkspaceRole)}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              {isOwner && <SelectItem value="owner">Owner</SelectItem>}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-xs capitalize">
            {ROLE_ICONS[member.role]}
            {member.role}
          </div>
        )}
        {isAdmin && !isCurrentUser && !isMemberOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(member.id, member.user_id)}
          >
            <X size={14} />
          </Button>
        )}
      </div>
    </div>
  );
};

const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onUpdate,
  onDelete,
  onInvite,
}) => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(workspace.name);
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Members state
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviting, setInviting] = useState(false);

  const isOwner = workspace.role === 'owner';
  const isAdmin = workspace.role === 'admin' || isOwner;

  // Fetch members when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(workspace.name);
      setLogoUrl(workspace.logo_url || '');
      fetchMembers();
    }
  }, [isOpen, workspace]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    
    // Fetch workspace members
    const { data: membersData, error } = await supabase
      .from('workspace_members')
      .select('id, user_id, role, accepted_at')
      .eq('workspace_id', workspace.id);
    
    if (error) {
      console.error('Error fetching members:', error);
      setLoadingMembers(false);
      return;
    }

    // Fetch profiles for all members
    const userIds = membersData.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds);

    const membersWithProfiles: WorkspaceMemberWithProfile[] = membersData.map(member => ({
      ...member,
      role: member.role as WorkspaceRole,
      profile: profiles?.find(p => p.id === member.user_id) || undefined,
    }));

    setMembers(membersWithProfiles);

    // Fetch pending invites
    const { data: invitesData, error: invitesError } = await supabase
      .from('workspace_invites')
      .select('id, email, role, invited_at')
      .eq('workspace_id', workspace.id)
      .order('invited_at', { ascending: false });

    if (invitesError) {
      console.error('Error fetching invites:', invitesError);
    } else {
      setPendingInvites((invitesData || []).map(inv => ({
        ...inv,
        role: inv.role as WorkspaceRole,
      })));
    }

    setLoadingMembers(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${workspace.id}-${Date.now()}.${fileExt}`;

    // Upload to workspace-logos bucket
    const { error: uploadError } = await supabase.storage
      .from('workspace-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: 'Upload failed',
        description: uploadError.message,
        variant: 'destructive',
      });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from('workspace-logos')
      .getPublicUrl(fileName);

    setLogoUrl(data.publicUrl);
    setUploading(false);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    const success = await onUpdate({
      name: name.trim(),
      logo_url: logoUrl || null,
    });
    setSaving(false);

    if (success) {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${workspace.name}"? This will remove all members and cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    const success = await onDelete();
    setDeleting(false);

    if (success) {
      onClose();
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    const success = await onInvite(inviteEmail.trim(), inviteRole);
    setInviting(false);

    if (success) {
      setInviteEmail('');
      setInviteRole('member');
      fetchMembers();
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast({
        title: 'Cannot remove yourself',
        description: 'Use "Leave Workspace" instead',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Error removing member',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast({ title: 'Member removed' });
  };

  const handleUpdateRole = async (memberId: string, newRole: WorkspaceRole) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    toast({ title: 'Role updated' });
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('workspace_invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      toast({
        title: 'Error canceling invite',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
    toast({ title: 'Invitation canceled' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 size={18} />
            Workspace Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="gap-2">
              <Settings size={14} />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users size={14} />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex-1 overflow-auto space-y-6 py-4">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label>Workspace Logo</Label>
              <div className="flex items-center gap-4">
                <div 
                  className={cn(
                    "relative w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden",
                    logoUrl && "border-solid border-muted"
                  )}
                  onClick={() => isAdmin && fileInputRef.current?.click()}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      {uploading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Building2 size={24} />
                          <span className="text-[10px]">Add logo</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload a logo for your workspace. Recommended size: 256x256px.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !isAdmin}
                    >
                      <Upload size={14} className="mr-2" />
                      Upload
                    </Button>
                    {logoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={!isAdmin}
                      >
                        <Trash2 size={14} className="mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <Separator />

            {/* Workspace Name */}
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Productions"
                disabled={!isAdmin}
              />
            </div>

            {/* Plan Badge */}
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary"
                  className={cn("text-sm px-3 py-1", WORKSPACE_PLAN_COLORS[workspace.plan])}
                >
                  {WORKSPACE_PLAN_LABELS[workspace.plan]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Contact support to upgrade
                </span>
              </div>
            </div>

            {/* Danger Zone */}
            {isOwner && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-destructive">Danger Zone</Label>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <Trash2 size={14} className="mr-2" />
                    )}
                    Delete Workspace
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="members" className="flex-1 overflow-auto space-y-4 py-4">
            {/* Invite Members */}
            {isAdmin && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <Label>Invite New Member</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  </Button>
                </div>
              </div>
            )}

            {/* Members List */}
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Active Members */}
                <div className="space-y-2">
                  <Label>Members ({members.filter(m => m.accepted_at).length})</Label>
                  <div className="space-y-2">
                    {members.filter(m => m.accepted_at).map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        isCurrentUser={member.user_id === user?.id}
                        isAdmin={isAdmin}
                        isOwner={isOwner}
                        onUpdateRole={handleUpdateRole}
                        onRemove={handleRemoveMember}
                      />
                    ))}
                    {members.filter(m => m.accepted_at).length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">No active members</p>
                    )}
                  </div>
                </div>

                {/* Pending Members (existing users who haven't accepted) */}
                {members.filter(m => !m.accepted_at).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-amber-500">Pending Acceptance ({members.filter(m => !m.accepted_at).length})</Label>
                    <div className="space-y-2">
                      {members.filter(m => !m.accepted_at).map((member) => (
                        <MemberRow
                          key={member.id}
                          member={member}
                          isCurrentUser={member.user_id === user?.id}
                          isAdmin={isAdmin}
                          isOwner={isOwner}
                          onUpdateRole={handleUpdateRole}
                          onRemove={handleRemoveMember}
                          isPending
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Invitations (non-existing users from workspace_invites table) */}
                {pendingInvites.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-amber-500">Email Invitations ({pendingInvites.length})</Label>
                    <div className="space-y-2">
                      {pendingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs bg-amber-500/20 text-amber-500">
                              {invite.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-amber-500">
                              {invite.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Invited {new Date(invite.invited_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">Pending</Badge>
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-xs capitalize">
                              {ROLE_ICONS[invite.role]}
                              {invite.role}
                            </div>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleCancelInvite(invite.id)}
                              >
                                <X size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !isAdmin}>
            {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsModal;
