import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Share2, Copy, Mail, UserPlus, Loader2, Crown, Pencil, Eye, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShowMember } from '@/types/user';
import { cn } from '@/lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: string;
  showName: string;
}

const roleLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: 'Owner', icon: <Crown className="h-3 w-3" />, color: 'bg-amber-500/20 text-amber-500' },
  editor: { label: 'Editor', icon: <Pencil className="h-3 w-3" />, color: 'bg-blue-500/20 text-blue-500' },
  viewer: { label: 'Viewer', icon: <Eye className="h-3 w-3" />, color: 'bg-gray-500/20 text-gray-400' },
  guest: { label: 'Guest', icon: <Eye className="h-3 w-3" />, color: 'bg-purple-500/20 text-purple-500' },
};

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, showId, showName }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer' | 'guest'>('viewer');
  const [members, setMembers] = useState<ShowMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthContext();

  // Fetch members when modal opens
  React.useEffect(() => {
    if (isOpen && showId) {
      fetchMembers();
    }
  }, [isOpen, showId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('show_members')
        .select('*')
        .eq('show_id', showId);

      if (error) throw error;

      // Fetch profiles for members with user_id
      const memberUserIds = (data || []).filter(m => m.user_id).map(m => m.user_id);
      let profiles: Record<string, any> = {};
      
      if (memberUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', memberUserIds);
        
        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      // Attach profiles to members
      const membersWithProfiles = (data || []).map(m => ({
        ...m,
        role: m.role as ShowMember['role'],
        profile: m.user_id ? profiles[m.user_id] : undefined
      }));

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim() || !user) return;

    setInviting(true);
    try {
      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      // Insert member
      const { error } = await supabase.from('show_members').insert({
        show_id: showId,
        user_id: existingProfile?.id || null,
        guest_email: existingProfile ? null : email.trim(),
        role: existingProfile ? role : 'guest',
        invited_by: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already invited',
            description: 'This person is already a member of this show.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      // Create notification for existing user
      if (existingProfile?.id) {
        await supabase.from('notifications').insert({
          user_id: existingProfile.id,
          type: 'invite',
          title: 'Show invitation',
          message: `You've been invited to collaborate on "${showName}"`,
          show_id: showId,
        });
      }

      toast({
        title: 'Invitation sent',
        description: `${email} has been invited as ${role}`,
      });

      setEmail('');
      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error sending invitation',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('show_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast({ title: 'Member removed' });
    } catch (error: any) {
      toast({
        title: 'Error removing member',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('show_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, role: newRole as ShowMember['role'] } : m)
      );
      toast({ title: 'Role updated' });
    } catch (error: any) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/show/${showId}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: 'Link copied to clipboard' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{showName}"
          </DialogTitle>
          <DialogDescription>
            Invite team members to collaborate on this show
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Section */}
          <div className="space-y-3">
            <Label>Invite by email</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={!email.trim() || inviting}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <Label>Or share link</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/show/${showId}`}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" onClick={copyShareLink}>
                {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <Label>Members ({members.length})</Label>
            <div className="border border-border rounded-lg divide-y divide-border max-h-[200px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No members yet. Invite someone to collaborate!
                </div>
              ) : (
                members.map((member) => {
                  const roleInfo = roleLabels[member.role];
                  const isCurrentUser = member.user_id === user?.id;
                  const displayName = member.profile?.full_name || member.guest_email || 'Unknown';
                  const displayEmail = member.profile?.email || member.guest_email;

                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {displayName} {isCurrentUser && <span className="text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                      </div>
                      {member.role === 'owner' ? (
                        <Badge className={cn('gap-1', roleInfo.color)}>
                          {roleInfo.icon} {roleInfo.label}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleUpdateRole(member.id, v)}
                            disabled={isCurrentUser}
                          >
                            <SelectTrigger className="h-7 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="guest">Guest</SelectItem>
                            </SelectContent>
                          </Select>
                          {!isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
