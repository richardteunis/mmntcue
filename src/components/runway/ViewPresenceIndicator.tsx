import React from 'react';
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
import { LayoutGrid, Table2, Eye, EyeOff, UserCog } from 'lucide-react';

interface ViewPresenceIndicatorProps {
  users: PresenceUser[];
  currentArea: 'timeline' | 'table' | 'cue-panel' | 'sidebar';
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
  currentArea,
  followingUserId,
  onFollowUser,
  onManagePermissions
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

  const handleFollowToggle = (userId: string) => {
    if (onFollowUser) {
      onFollowUser(followingUserId === userId ? null : userId);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        {Object.entries(usersByArea).map(([area, areaUsers]) => {
          const Icon = getAreaIcon(area as PresenceUser['area']);
          
          return (
            <DropdownMenu key={area}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted transition-colors">
                  <Icon size={12} className="text-muted-foreground" />
                  <div className="flex -space-x-1.5">
                    {areaUsers.slice(0, 3).map((user) => {
                      const isFollowing = followingUserId === user.id;
                      return (
                        <Avatar 
                          key={user.id} 
                          className={cn(
                            "h-4 w-4 border border-background",
                            user.color,
                            isFollowing && "ring-2 ring-primary"
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
                      );
                    })}
                    {areaUsers.length > 3 && (
                      <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground">
                          +{areaUsers.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Users in {getAreaLabel(area as PresenceUser['area'])}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {areaUsers.map(user => {
                  const isFollowing = followingUserId === user.id;
                  return (
                    <div key={user.id}>
                      <DropdownMenuLabel className="flex items-center gap-2 font-normal py-1">
                        <Avatar className={cn("h-5 w-5", user.color)}>
                          {user.avatar_url && (
                            <AvatarImage src={user.avatar_url} alt={user.name} />
                          )}
                          <AvatarFallback className={cn("text-[8px] text-white", user.color)}>
                            {getInitials(user.name || user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[100px]">
                          {user.name || user.email}
                        </span>
                        {isFollowing && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-auto">
                            Following
                          </span>
                        )}
                      </DropdownMenuLabel>
                      <div className="flex gap-1 px-2 pb-2">
                        {onFollowUser && (
                          <DropdownMenuItem 
                            className="flex-1 text-xs justify-center"
                            onClick={() => handleFollowToggle(user.id)}
                          >
                            {isFollowing ? (
                              <>
                                <EyeOff className="mr-1 h-3 w-3" />
                                Unfollow
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-3 w-3" />
                                Follow
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {onManagePermissions && (
                          <DropdownMenuItem 
                            className="flex-1 text-xs justify-center"
                            onClick={() => onManagePermissions(user.id)}
                          >
                            <UserCog className="mr-1 h-3 w-3" />
                            Permissions
                          </DropdownMenuItem>
                        )}
                      </div>
                      <DropdownMenuSeparator />
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ViewPresenceIndicator;
