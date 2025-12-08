import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PresenceUser } from '@/hooks/useRealtimePresence';
import { LayoutGrid, Table2 } from 'lucide-react';

interface ViewPresenceIndicatorProps {
  users: PresenceUser[];
  currentArea: 'timeline' | 'table' | 'cue-panel' | 'sidebar';
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getAreaLabel = (area?: PresenceUser['area']): string => {
  switch (area) {
    case 'timeline': return 'Timeline';
    case 'table': return 'Table';
    case 'cue-panel': return 'Cue Panel';
    case 'sidebar': return 'Sidebar';
    default: return 'Unknown';
  }
};

const getAreaIcon = (area?: PresenceUser['area']) => {
  switch (area) {
    case 'timeline': return LayoutGrid;
    case 'table': return Table2;
    default: return LayoutGrid;
  }
};

const ViewPresenceIndicator: React.FC<ViewPresenceIndicatorProps> = ({
  users,
  currentArea
}) => {
  // Get users in other views
  const usersInOtherViews = users.filter(user => user.area !== currentArea);
  
  // Group by area
  const usersByArea = usersInOtherViews.reduce((acc, user) => {
    const area = user.area || 'timeline';
    if (!acc[area]) acc[area] = [];
    acc[area].push(user);
    return acc;
  }, {} as Record<string, PresenceUser[]>);

  if (usersInOtherViews.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        {Object.entries(usersByArea).map(([area, areaUsers]) => {
          const Icon = getAreaIcon(area as PresenceUser['area']);
          
          return (
            <Tooltip key={area}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
                  <Icon size={12} className="text-muted-foreground" />
                  <div className="flex -space-x-1.5">
                    {areaUsers.slice(0, 3).map((user) => (
                      <Avatar 
                        key={user.id} 
                        className={cn(
                          "h-4 w-4 border border-background",
                          user.color
                        )}
                      >
                        {user.avatar_url && (
                          <AvatarImage src={user.avatar_url} alt={user.name} />
                        )}
                        <AvatarFallback 
                          className={cn(
                            "text-[8px] font-medium text-white",
                            user.color
                          )}
                        >
                          {getInitials(user.name || user.email).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {areaUsers.length > 3 && (
                      <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground">
                          +{areaUsers.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{getAreaLabel(area as PresenceUser['area'])}</p>
                {areaUsers.map(user => (
                  <p key={user.id} className="text-muted-foreground">
                    {user.name || user.email}
                  </p>
                ))}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ViewPresenceIndicator;
