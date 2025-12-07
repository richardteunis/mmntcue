import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineRulerProps {
  scale: number;
  showGrid?: boolean;
  gridType?: 'seconds' | 'beats' | 'bars' | 'frames';
  className?: string;
}

const TimelineRuler: React.FC<TimelineRulerProps> = ({ 
  scale, 
  showGrid = true, 
  gridType = 'seconds',
  className 
}) => {
  const generateTimeMarkers = () => {
    const markers = [];
    const totalMinutes = 60;
    const baseInterval = 60; // Base interval in seconds
    
    // Adjust interval based on scale
    let interval = baseInterval;
    if (scale >= 2) interval = 30;
    if (scale >= 3) interval = 15;
    if (scale < 0.75) interval = 120;
    if (scale < 0.5) interval = 300;

    for (let i = 0; i <= totalMinutes * 60; i += interval) {
      const hours = Math.floor(i / 3600);
      const minutes = Math.floor((i % 3600) / 60);
      const seconds = i % 60;
      
      const position = (i / 0.6) * scale;
      
      // Only render markers within reasonable bounds
      if (position > 3000) break;
      
      const isMainMarker = i % 300 === 0; // Every 5 minutes
      const isMinuteMarker = i % 60 === 0;
      
      markers.push(
        <div
          key={i}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: `${position}px` }}
        >
          <div 
            className={cn(
              "w-px bg-border/50",
              isMainMarker ? "h-4" : isMinuteMarker ? "h-3" : "h-2"
            )}
          />
          {(isMinuteMarker || scale >= 2) && (
            <span className={cn(
              "text-[10px] font-mono text-muted-foreground mt-0.5",
              isMainMarker && "text-foreground font-medium"
            )}>
              {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
            </span>
          )}
        </div>
      );

      // Add sub-markers for finer grid
      if (showGrid && scale >= 1.5 && interval >= 30) {
        for (let j = 1; j < interval / 10; j++) {
          const subPos = ((i + j * 10) / 0.6) * scale;
          if (subPos > 3000) break;
          markers.push(
            <div
              key={`${i}-sub-${j}`}
              className="absolute top-0 w-px h-1.5 bg-border/30"
              style={{ left: `${subPos}px` }}
            />
          );
        }
      }
    }
    
    return markers;
  };

  return (
    <div 
      className={cn(
        "relative h-8 bg-card/80 border-b border-border",
        "backdrop-blur-sm sticky top-0 z-20",
        className
      )}
    >
      {generateTimeMarkers()}
    </div>
  );
};

export default TimelineRuler;
