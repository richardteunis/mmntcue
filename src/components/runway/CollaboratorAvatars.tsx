import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PresenceUser } from '@/hooks/useRealtimePresence';

interface CollaboratorAvatarsProps {
  users: PresenceUser[];
  maxVisible?: number;
  className?: string;
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
    case 'timeline': return 'viewing timeline';
    case 'table': return 'viewing table';
    case 'cue-panel': return 'editing cue';
    case 'sidebar': return 'browsing shows';
    default: return 'online';
  }
};

const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  users,
  maxVisible = 5,
  className
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;

  if (users.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center -space-x-2", className)}>
        {visibleUsers.map((user, index) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div 
                className="relative"
                style={{ zIndex: visibleUsers.length - index }}
              >
                <Avatar 
                  className={cn(
                    "h-7 w-7 border-2 border-background ring-2 transition-transform hover:scale-110 hover:z-50",
                    user.color.replace('bg-', 'ring-')
                  )}
                >
                  {user.avatar_url && (
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                  )}
                  <AvatarFallback 
                    className={cn(
                      "text-[10px] font-medium text-white",
                      user.color
                    )}
                  >
                    {getInitials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-muted-foreground">{getAreaLabel(user.area)}</p>
              {user.selectedCueId && (
                <p className="text-muted-foreground">Editing cue</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
        
        {overflowCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative" style={{ zIndex: 0 }}>
                <Avatar className="h-7 w-7 border-2 border-background bg-muted">
                  <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
                    +{overflowCount}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>{overflowCount} more collaborator{overflowCount > 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CollaboratorAvatars;
