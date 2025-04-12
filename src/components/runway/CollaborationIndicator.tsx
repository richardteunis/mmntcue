
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
    if (!position || !prevPositionRef.current || !elementRef.current) {
      prevPositionRef.current = position;
      return;
    }
    
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const startPosition = prevPositionRef.current;
    const endPosition = position;
    const startTime = performance.now();
    const duration = 200; // ms
    
    const animatePosition = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use a smooth easing function
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      if (elementRef.current) {
        const currentX = startPosition.x + (endPosition.x - startPosition.x) * easeProgress;
        const currentY = startPosition.y + (endPosition.y - startPosition.y) * easeProgress;
        
        elementRef.current.style.left = `${currentX}px`;
        elementRef.current.style.top = `${currentY}px`;
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animatePosition);
      } else {
        prevPositionRef.current = endPosition;
      }
    };
    
    animationRef.current = requestAnimationFrame(animatePosition);
    
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
