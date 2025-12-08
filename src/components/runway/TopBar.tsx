import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Share2, Check, Presentation } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import NotificationPopover from './NotificationPopover';
import UserMenu from './UserMenu';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
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
  showInfo?: ShowInfo;
  onShowcallerMode?: () => void;
  onShare?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ showName, showInfo, onShowcallerMode, onShare }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const { user } = useAuthContext();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.id ?? null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Format event date like "Friday, Dec 8"
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
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

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
      {/* Left: Clock and save status */}
      <div className="flex items-center gap-4 min-w-[200px]">
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
      
      {/* Center: Show info */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        {showInfo?.client && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {showInfo.client}
          </span>
        )}
        <span className="text-sm font-semibold text-foreground">{showName}</span>
        {(eventDate || showTime) && (
          <span className="text-xs text-muted-foreground">
            {[eventDate, showTime].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
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
        />
        
        <UserMenu />
      </div>
    </div>
  );
};

export default TopBar;
