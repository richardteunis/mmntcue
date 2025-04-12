
import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimelineCue, TimelineTrack } from './TrackList';

interface CueTimelineProps {
  tracks: TimelineTrack[];
  timelineScale: number;
  selectedCue: string | null;
  currentTime: string;
  getPlayheadPosition: () => number;
  snapToGrid: boolean;
  onCueClick: (cueId: string) => void;
  onCueDragStart: (e: React.DragEvent, cueId: string, trackId: string) => void;
  onCueDragEnd: (e: React.DragEvent) => void;
  onTimelineClick: (e: React.MouseEvent) => void;
}

const CueTimeline: React.FC<CueTimelineProps> = ({
  tracks,
  timelineScale,
  selectedCue,
  currentTime,
  getPlayheadPosition,
  snapToGrid,
  onCueClick,
  onCueDragStart,
  onCueDragEnd,
  onTimelineClick
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Helper to show grid lines - we need to display more for the snap functionality
  const gridLines = () => {
    const lines = [];
    const count = timelineScale < 1 ? 120 : 60;
    const interval = timelineScale < 1 ? 2.5 : 5;
    
    for (let i = 0; i < count; i++) {
      const isMajor = i % interval === 0;
      lines.push(
        <div 
          key={i} 
          className="absolute top-0 bottom-0 border-l border-border/30"
          style={{ 
            left: `${i * (100 * timelineScale) / interval}px`,
            borderWidth: isMajor ? '1px' : '0.5px',
            borderColor: isMajor ? 'var(--border)' : 'var(--border-30)',
            opacity: isMajor ? 0.5 : 0.2
          }}
        />
      );
    }
    return lines;
  };

  return (
    <div className="flex-1 overflow-hidden relative">
      <div
        ref={timelineRef}
        className="h-full relative"
        onClick={onTimelineClick}
      >
        {/* Timeline header with time markers */}
        <div className="h-8 border-b border-border sticky top-0 z-10 bg-background flex items-end px-4">
          {Array.from({ length: 60 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute bottom-0 h-8 flex flex-col items-center justify-end"
              style={{ 
                left: `${i * (100 * timelineScale)}px`,
                width: timelineScale < 0.8 && i % 5 !== 0 ? '1px' : '2px'
              }}
            >
              <div className={cn(
                "bg-border",
                i % 5 === 0 ? "h-3 w-0.5" : "h-2 w-0.5"
              )} />
              {i % 5 === 0 && (
                <span className="text-xs text-muted-foreground mt-1">
                  {Math.floor(i / 5)}:00
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Playhead indicator */}
        <div 
          className="absolute top-8 bottom-0 w-0.5 bg-accent z-20"
          style={{ 
            left: `${getPlayheadPosition()}px`,
            height: 'calc(100% - 2rem)'
          }}
        />

        {/* Cue tracks */}
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4" style={{ minWidth: '1500px' }}>
            {tracks.map(track => (
              <div 
                key={track.id} 
                className={cn(
                  "relative rounded-md border border-border transition-all duration-200",
                  track.expanded ? "h-16" : "h-8",
                  "bg-muted/30"
                )}
                data-track-id={track.id}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const cueType = e.dataTransfer.getData('cueType');
                  const cueId = e.dataTransfer.getData('cueId');
                  const sourceTrackId = e.dataTransfer.getData('sourceTrackId');
                  
                  if (cueType || (cueId && sourceTrackId)) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const newPosition = e.clientX - rect.left;
                    
                    if (cueType) {
                      // Create a new cue
                      console.log('Creating new cue of type:', cueType, 'at position:', newPosition, 'on track:', track.id);
                    } else if (cueId && sourceTrackId) {
                      // Move existing cue
                      console.log('Moving cue:', cueId, 'from track:', sourceTrackId, 'to track:', track.id, 'at position:', newPosition);
                    }
                  }
                }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  {/* Time grid lines */}
                  {gridLines()}

                  {/* Cues - always visible regardless of track expansion state */}
                  {track.cues.map((cue: TimelineCue) => (
                    <div
                      key={cue.id}
                      className={cn(
                        "absolute rounded-md border cursor-move flex items-center px-2 overflow-hidden transition-all",
                        selectedCue === cue.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50",
                        cue.type === 'audio' && "bg-runway-teal/20 border-runway-teal",
                        cue.type === 'video' && "bg-runway-success/20 border-runway-success",
                        cue.type === 'lighting' && "bg-runway-highlight/20 border-runway-highlight",
                        cue.type === 'stage' && "bg-runway-warning/20 border-runway-warning",
                      )}
                      style={{
                        left: `${cue.position}px`,
                        width: `${cue.width * timelineScale}px`,
                        minWidth: '50px',
                        top: '4px',
                        height: track.expanded ? 'calc(100% - 8px)' : 'calc(100% - 8px)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCueClick(cue.id);
                      }}
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        console.log('Drag start for cue:', cue.id, 'on track:', track.id);
                        e.dataTransfer.setData('cueId', cue.id);
                        e.dataTransfer.setData('sourceTrackId', track.id);
                        e.dataTransfer.effectAllowed = 'move';
                        onCueDragStart(e, cue.id, track.id);
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation();
                        console.log('Drag end');
                        onCueDragEnd(e);
                      }}
                    >
                      <span className="truncate text-sm font-medium">{cue.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default CueTimeline;
