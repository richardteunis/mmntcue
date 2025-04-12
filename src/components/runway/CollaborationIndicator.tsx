
import React, { useRef, useEffect } from 'react';
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
  const prevPositionRef = useRef(position);
  const elementRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!position || !elementRef.current) {
      prevPositionRef.current = position;
      return;
    }
    
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Calculate position difference to detect large jumps
    const isLargeJump = prevPositionRef.current && 
      (Math.abs(position.x - prevPositionRef.current.x) > 200 || 
       Math.abs(position.y - prevPositionRef.current.y) > 200);
       
    // If it's a large jump, set position immediately to avoid "spazzing"
    if (isLargeJump) {
      if (elementRef.current) {
        elementRef.current.style.transition = 'none';
        elementRef.current.style.left = `${position.x}px`;
        elementRef.current.style.top = `${position.y}px`;
        
        // Force a reflow to make sure the transition gets disabled
        elementRef.current.offsetHeight;
        
        // Re-enable transitions after a short delay
        setTimeout(() => {
          if (elementRef.current) {
            elementRef.current.style.transition = 'left 0.3s ease-out, top 0.3s ease-out';
          }
        }, 10);
      }
      
      prevPositionRef.current = position;
      return;
    }
    
    // Apply transition and update position
    if (elementRef.current) {
      elementRef.current.style.transition = 'left 0.3s ease-out, top 0.3s ease-out';
      elementRef.current.style.left = `${position.x}px`;
      elementRef.current.style.top = `${position.y}px`;
    }
    
    prevPositionRef.current = position;
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [position]);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            ref={elementRef}
            className={cn(
              "absolute z-10 transform transition-opacity duration-100 ease-out", 
              className
            )}
            style={position ? 
              { 
                left: `${prevPositionRef.current?.x || position.x}px`, 
                top: `${prevPositionRef.current?.y || position.y}px`,
                transform: 'translate(-50%, -50%)'
              } : undefined}
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
