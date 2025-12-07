import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Share2, Check, Save, Presentation } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Breadcrumb from './Breadcrumb';
import NotificationPopover from './NotificationPopover';
import UserMenu from './UserMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface TopBarProps {
  showName: string;
  onShowcallerMode?: () => void;
  onShare?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ showName, onShowcallerMode, onShare }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const { user } = useAuthContext();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.id ?? null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Breadcrumb showName={showName} />
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            saveStatus === 'saved' && "text-runway-success border-runway-success/30"
          )}
        >
          <Check size={12} />
          All changes saved
        </Badge>
      </div>
      
      <div className="absolute left-1/2 -translate-x-1/2">
        <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
          <Clock size={14} className="mr-1.5 opacity-70" />
          {formatTime(currentTime)}
        </Badge>
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
