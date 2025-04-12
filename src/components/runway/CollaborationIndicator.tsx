
import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastActive: Date;
  area: 'timeline' | 'cue-panel' | 'library';
}

interface CollaborationIndicatorProps {
  className?: string;
  position?: { x: number; y: number };
  user: User;
}

const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({ 
  className, 
  position,
  user
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "absolute z-10 animate-pulse-subtle", 
              className
            )}
            style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
          >
            <Avatar className={cn("h-6 w-6 border-2 border-background", user.color)}>
              <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">{user.name} is editing {user.area}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CollaborationIndicator;
