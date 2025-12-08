import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PresenceUser } from '@/hooks/useRealtimePresence';
import { Eye, EyeOff, UserCog, Shield, UserMinus } from 'lucide-react';

interface CollaboratorAvatarsProps {
  users: PresenceUser[];
  maxVisible?: number;
  className?: string;
  followingUserId?: string | null;
  onFollowUser?: (userId: string | null) => void;
  onManagePermissions?: (userId: string) => void;
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
  className,
  followingUserId,
  onFollowUser,
  onManagePermissions
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;

  if (users.length === 0) return null;

  const handleFollowToggle = (userId: string) => {
    if (onFollowUser) {
      onFollowUser(followingUserId === userId ? null : userId);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center -space-x-2", className)}>
        {visibleUsers.map((user, index) => {
          const isFollowing = followingUserId === user.id;
          
          return (
            <DropdownMenu key={user.id}>
              <DropdownMenuTrigger asChild>
                <div 
                  className="relative cursor-pointer"
                  style={{ zIndex: visibleUsers.length - index }}
                >
                  <Avatar 
                    className={cn(
                      "h-7 w-7 border-2 border-background ring-2 transition-all hover:scale-110 hover:z-50",
                      user.color.replace('bg-', 'ring-'),
                      isFollowing && "ring-4 ring-primary animate-pulse"
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
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                    isFollowing ? "bg-primary" : "bg-green-500"
                  )} />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Avatar className={cn("h-6 w-6", user.color)}>
                    {user.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                    )}
                    <AvatarFallback className={cn("text-[8px] text-white", user.color)}>
                      {getInitials(user.name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {user.name || user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getAreaLabel(user.area)}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {onFollowUser && (
                  <DropdownMenuItem onClick={() => handleFollowToggle(user.id)}>
                    {isFollowing ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Stop following
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Follow {user.name?.split(' ')[0] || 'user'}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                
                {onManagePermissions && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onManagePermissions(user.id)}>
                      <UserCog className="mr-2 h-4 w-4" />
                      Manage permissions
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
        
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
