import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Check, Trash2, Mail, MessageSquare, AtSign, Info, CheckCheck, Loader2, UserPlus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/types/user';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPopoverProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onRefetch?: () => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'invite': return <UserPlus className="h-4 w-4" />;
    case 'update': return <Info className="h-4 w-4" />;
    case 'comment': return <MessageSquare className="h-4 w-4" />;
    case 'mention': return <AtSign className="h-4 w-4" />;
    case 'system': return <Bell className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'invite': return 'text-blue-500 bg-blue-500/10';
    case 'update': return 'text-green-500 bg-green-500/10';
    case 'comment': return 'text-yellow-500 bg-yellow-500/10';
    case 'mention': return 'text-purple-500 bg-purple-500/10';
    case 'system': return 'text-gray-500 bg-gray-500/10';
    default: return 'text-gray-500 bg-gray-500/10';
  }
};

const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefetch,
}) => {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAcceptShowInvite = async (notification: Notification) => {
    if (!notification.show_id) return;
    
    setProcessingId(notification.id);
    
    try {
      // Update show_members to set accepted_at
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('show_members')
        .update({ accepted_at: new Date().toISOString() })
        .eq('show_id', notification.show_id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Mark notification as read and delete it
      await onDelete(notification.id);
      
      toast({
        title: 'Invitation accepted',
        description: `You've joined "${notification.metadata?.show_name || 'the show'}"`,
      });

      onRefetch?.();
    } catch (error) {
      console.error('Error accepting show invite:', error);
      toast({
        title: 'Error accepting invitation',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptWorkspaceInvite = async (notification: Notification) => {
    if (!notification.workspace_id) return;
    
    setProcessingId(notification.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update workspace_members to set accepted_at
      const { error } = await supabase
        .from('workspace_members')
        .update({ accepted_at: new Date().toISOString() })
        .eq('workspace_id', notification.workspace_id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Delete the pending invite if exists
      await supabase
        .from('workspace_invites')
        .delete()
        .eq('workspace_id', notification.workspace_id)
        .eq('email', user.email);

      // Delete notification
      await onDelete(notification.id);
      
      toast({
        title: 'Invitation accepted',
        description: `You've joined "${notification.metadata?.workspace_name || 'the workspace'}"`,
      });

      onRefetch?.();
      
      // Reload to refresh workspace list
      window.location.reload();
    } catch (error) {
      console.error('Error accepting workspace invite:', error);
      toast({
        title: 'Error accepting invitation',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineInvite = async (notification: Notification) => {
    setProcessingId(notification.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (notification.metadata?.invite_type === 'workspace' && notification.workspace_id) {
        // Remove from workspace_members
        await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', notification.workspace_id)
          .eq('user_id', user.id);
      } else if (notification.show_id) {
        // Remove from show_members
        await supabase
          .from('show_members')
          .delete()
          .eq('show_id', notification.show_id)
          .eq('user_id', user.id);
      }

      await onDelete(notification.id);
      
      toast({
        title: 'Invitation declined',
      });

      onRefetch?.();
    } catch (error) {
      console.error('Error declining invite:', error);
      toast({
        title: 'Error declining invitation',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const isInviteNotification = (notification: Notification) => {
    return notification.type === 'invite' && 
      (notification.show_id || notification.workspace_id) &&
      !notification.read;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkAllAsRead}>
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[350px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const isInvite = isInviteNotification(notification);
                const isProcessing = processingId === notification.id;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors relative group",
                      !notification.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        getNotificationColor(notification.type)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                        
                        {/* Invite action buttons */}
                        {isInvite && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={isProcessing}
                              onClick={() => {
                                if (notification.metadata?.invite_type === 'workspace') {
                                  handleAcceptWorkspaceInvite(notification);
                                } else {
                                  handleAcceptShowInvite(notification);
                                }
                              }}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={isProcessing}
                              onClick={() => handleDeclineInvite(notification)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isInvite && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onMarkAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => onDelete(notification.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {!notification.read && !isInvite && (
                      <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary group-hover:hidden" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPopover;
