import React, { useState, useCallback } from 'react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Share2, Copy, Mail, UserPlus, Loader2, Crown, Pencil, Eye, X, Check, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { ShowMember, Profile } from '@/types/user';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [members, setMembers] = useState<ShowMember[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuthContext();

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

  // Search for users by email
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;

      // Filter out current user and existing members
      const memberIds = members.map(m => m.user_id).filter(Boolean);
      const filtered = (data || []).filter(p => 
        p.id !== user?.id && !memberIds.includes(p.id)
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  }, [members, user?.id]);

  // Check if input is a valid email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Invite by selecting from search results
  const handleInviteUser = async (selectedProfile: Profile) => {
    if (!user) return;
    
    setInviting(true);
    try {
      // Insert member
      const { error } = await supabase.from('show_members').insert({
        show_id: showId,
        user_id: selectedProfile.id,
        role: role,
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

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: selectedProfile.id,
        type: 'invite',
        title: 'Show invitation',
        message: `You've been invited to collaborate on "${showName}"`,
        show_id: showId,
      });

      // Send email notification
      try {
        await supabase.functions.invoke('send-invite', {
          body: {
            email: selectedProfile.email,
            showId,
            showName,
            inviterName: profile?.full_name || user.email || 'Someone',
            role: role,
          },
        });
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        // Don't fail the invite if email fails
      }

      toast({
        title: 'Invitation sent',
        description: `${selectedProfile.full_name || selectedProfile.email} has been invited as ${role}`,
      });

      setSearchQuery('');
      setSearchResults([]);
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

  // Invite by email (for new users)
  const handleInviteByEmail = async () => {
    if (!searchQuery.trim() || !user || !isValidEmail(searchQuery)) return;

    setInviting(true);
    try {
      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', searchQuery.trim().toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        // User exists, invite them directly
        await handleInviteUser(existingProfile as Profile);
        return;
      }

      // New user - create guest invite
      const { error } = await supabase.from('show_members').insert({
        show_id: showId,
        user_id: null,
        guest_email: searchQuery.trim().toLowerCase(),
        role: 'guest',
        invited_by: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already invited',
            description: 'This person is already invited to this show.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      // Send email invite
      try {
        await supabase.functions.invoke('send-invite', {
          body: {
            email: searchQuery.trim().toLowerCase(),
            showId,
            showName,
            inviterName: profile?.full_name || user.email || 'Someone',
            role: 'guest',
          },
        });
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
      }

      toast({
        title: 'Invitation sent',
        description: `An invite has been sent to ${searchQuery}`,
      });

      setSearchQuery('');
      setSearchResults([]);
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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{showName}"
          </DialogTitle>
          <DialogDescription>
            Invite team members or guests to collaborate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Search/Invite Section - Figma Style */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Can edit</SelectItem>
                  <SelectItem value="viewer">Can view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Results Dropdown */}
            {searchQuery.length >= 2 && (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                {searching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-border">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleInviteUser(result)}
                        disabled={inviting}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={result.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {(result.full_name || result.email || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Workspace
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : isValidEmail(searchQuery) ? (
                  <button
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={handleInviteByEmail}
                    disabled={inviting}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Invite {searchQuery}</p>
                      <p className="text-xs text-muted-foreground">Send invite via email</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Guest</Badge>
                  </button>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No users found. Enter a valid email to invite as guest.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Anyone with link</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/show/${showId}`}
                readOnly
                className="font-mono text-xs bg-muted/50"
              />
              <Button variant="outline" size="sm" onClick={copyShareLink} className="shrink-0">
                {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              People with access ({members.length})
            </Label>
            <ScrollArea className="h-[200px]">
              <div className="border border-border rounded-lg divide-y divide-border">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No members yet
                  </div>
                ) : (
                  members.map((member) => {
                    const roleInfo = roleLabels[member.role];
                    const isCurrentUser = member.user_id === user?.id;
                    const displayName = member.profile?.full_name || member.guest_email || 'Unknown';
                    const displayEmail = member.profile?.email || member.guest_email;
                    const isGuest = !member.user_id;

                    return (
                      <div key={member.id} className="flex items-center gap-3 p-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className={cn(
                            "text-xs",
                            isGuest ? "bg-purple-500/20 text-purple-400" : "bg-primary text-primary-foreground"
                          )}>
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {displayName}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                            {isGuest && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                        </div>
                        {member.role === 'owner' ? (
                          <Badge className={cn('gap-1 shrink-0', roleInfo.color)}>
                            {roleInfo.icon} {roleInfo.label}
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleUpdateRole(member.id, v)}
                              disabled={isCurrentUser}
                            >
                              <SelectTrigger className="h-7 w-[90px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editor">Can edit</SelectItem>
                                <SelectItem value="viewer">Can view</SelectItem>
                              </SelectContent>
                            </Select>
                            {!isCurrentUser && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
