
import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimelineCue } from './TrackList';

interface CueTimelineProps {
  tracks: any[];
  timelineScale: number;
  selectedCue: string | null;
  currentTime: string;
  getPlayheadPosition: () => number;
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
  onCueClick,
  onCueDragStart,
  onCueDragEnd,
  onTimelineClick
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

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
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4" style={{ minWidth: '1500px' }}>
            {tracks.filter(track => track.expanded).map(track => (
              <div 
                key={track.id} 
                className="relative h-16 rounded-md bg-muted/30 border border-border"
              >
                <div className="absolute inset-0 overflow-hidden">
                  {/* Time grid lines */}
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute top-0 bottom-0 border-l border-border/30"
                      style={{ 
                        left: `${i * (100 * timelineScale)}px`,
                      }}
                    />
                  ))}

                  {/* Cues */}
                  {track.cues.map((cue: TimelineCue) => (
                    <div
                      key={cue.id}
                      className={cn(
                        "absolute top-2 h-12 rounded-md border cursor-pointer flex items-center px-2 overflow-hidden",
                        selectedCue === cue.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50",
                        cue.type === 'audio' && "bg-runway-teal/20 border-runway-teal",
                        cue.type === 'video' && "bg-runway-success/20 border-runway-success",
                        cue.type === 'lighting' && "bg-runway-highlight/20 border-runway-highlight",
                        cue.type === 'stage' && "bg-runway-warning/20 border-runway-warning"
                      )}
                      style={{
                        left: `${cue.position}px`,
                        width: `${cue.width * timelineScale}px`,
                        minWidth: '50px'
                      }}
                      onClick={() => onCueClick(cue.id)}
                      draggable
                      onDragStart={(e) => onCueDragStart(e, cue.id, track.id)}
                      onDragEnd={onCueDragEnd}
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
