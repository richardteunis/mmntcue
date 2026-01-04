import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Share2, Check, Presentation, Wifi, WifiOff, Upload, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import NotificationPopover from './NotificationPopover';
import UserMenu from './UserMenu';
import CollaboratorAvatars from './CollaboratorAvatars';
import VersionHistoryRail from './VersionHistoryRail';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { PresenceUser } from '@/hooks/useRealtimePresence';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ShowInfo {
  name?: string;
  client?: string;
  eventDate?: string;
  showTime?: string;
}

interface TopBarProps {
  showName: string;
  showId?: string | null;
  showInfo?: ShowInfo;
  onShowcallerMode?: () => void;
  onShare?: () => void;
  onImport?: () => void;
  hasSyncSources?: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
  activeUsers?: PresenceUser[];
  isConnected?: boolean;
  followingUserId?: string | null;
  onFollowUser?: (userId: string | null) => void;
  onManagePermissions?: (userId: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  showName, 
  showId,
  showInfo, 
  onShowcallerMode, 
  onShare,
  onImport,
  hasSyncSources = false,
  isSyncing = false,
  onSync,
  activeUsers = [], 
  isConnected = false,
  followingUserId,
  onFollowUser,
  onManagePermissions
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const { user } = useAuthContext();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refetch } = useNotifications(user?.id ?? null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Format event date like "Friday, Dec 8"
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'EEEE, MMM d');
    } catch {
      return null;
    }
  };

  // Format show time like "8:00 AM"
  const formatShowTime = (timeStr?: string) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return format(date, 'h:mm a');
    } catch {
      return null;
    }
  };

  const eventDate = formatEventDate(showInfo?.eventDate);
  const showTime = formatShowTime(showInfo?.showTime);
  const hasShowInfo = showInfo?.client || eventDate || showTime;

  return (
    <div className="flex flex-col border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Top row: Clock, actions */}
      <div className="h-12 flex items-center justify-between px-4">
        {/* Left: Clock and save status */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
            <Clock size={14} className="mr-1.5 opacity-70" />
            {formatTime(currentTime)}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              saveStatus === 'saved' && "text-runway-success border-runway-success/30"
            )}
          >
            <Check size={12} />
            Saved
          </Badge>
        </div>
        
        {/* Right: Collaborators and Actions */}
        <div className="flex items-center gap-3">
          {/* Connection status */}
          {showName && (
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="outline" className="text-xs gap-1 text-green-500 border-green-500/30">
                  <Wifi size={10} />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <WifiOff size={10} />
                  Offline
                </Badge>
              )}
            </div>
          )}

          {/* Active collaborators */}
          {activeUsers.length > 0 && (
            <>
              <CollaboratorAvatars 
                users={activeUsers} 
                maxVisible={4} 
                followingUserId={followingUserId}
                onFollowUser={onFollowUser}
                onManagePermissions={onManagePermissions}
              />
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Import/Sync button */}
          {showName && onImport && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onImport}>
                <Upload size={14} />
                <span className="hidden md:inline">Import</span>
              </Button>
              {hasSyncSources && onSync && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0" 
                      onClick={onSync}
                      disabled={isSyncing}
                    >
                      <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sync from connected sheet</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Version History */}
          {showId && (
            <VersionHistoryRail showId={showId} />
          )}

          {onShowcallerMode && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onShowcallerMode}>
              <Presentation size={14} />
              <span className="hidden md:inline">Showcaller</span>
            </Button>
          )}

          {onShare && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onShare}>
              <Share2 size={14} />
              Share
            </Button>
          )}

          <Separator orientation="vertical" className="h-6" />
          
          <NotificationPopover
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDelete={deleteNotification}
            onRefetch={refetch}
          />
          
          <UserMenu />
        </div>
      </div>

      {/* Bottom row: Show info */}
      {hasShowInfo && (
        <div className="h-8 flex items-center justify-center gap-3 px-4 bg-muted/30 border-t border-border/50">
          {showInfo?.client && (
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {showInfo.client}
            </span>
          )}
          {showInfo?.client && <span className="text-muted-foreground/50">•</span>}
          <span className="text-sm font-semibold text-foreground">{showName}</span>
          {(eventDate || showTime) && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground">
                {[eventDate, showTime].filter(Boolean).join(' @ ')}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TopBar;
