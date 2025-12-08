import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Share2, Check, Presentation, Timer } from 'lucide-react';
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

  // Calculate countdown to show start
  const countdown = useMemo(() => {
    if (!showInfo?.eventDate || !showInfo?.showTime) return null;
    
    try {
      const [year, month, day] = showInfo.eventDate.split('-').map(Number);
      const [hours, minutes] = showInfo.showTime.split(':').map(Number);
      const showStart = new Date(year, month - 1, day, hours, minutes);
      const diff = showStart.getTime() - currentTime.getTime();
      
      if (diff <= 0) return { text: 'LIVE', isLive: true };
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        return { text: `${days}d ${hrs}h ${mins}m`, isLive: false };
      } else if (hrs > 0) {
        return { text: `${hrs}h ${mins}m ${secs}s`, isLive: false };
      } else {
        return { text: `${mins}m ${secs}s`, isLive: false };
      }
    } catch {
      return null;
    }
  }, [showInfo?.eventDate, showInfo?.showTime, currentTime]);

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

        {/* Center: Countdown */}
        {countdown && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <Badge 
              variant={countdown.isLive ? "default" : "secondary"} 
              className={cn(
                "font-mono text-sm px-3 py-1",
                countdown.isLive && "bg-runway-error animate-pulse"
              )}
            >
              <Timer size={14} className="mr-1.5 opacity-70" />
              {countdown.isLive ? 'LIVE' : `T-${countdown.text}`}
            </Badge>
          </div>
        )}
        
        {/* Right: Actions */}
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
