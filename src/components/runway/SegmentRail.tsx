import React, { useMemo, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  Clock,
  Check,
  X,
} from 'lucide-react';

// Segment definition
export interface Segment {
  id: string;
  name: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  targetDuration?: number; // optional target in seconds
  color?: string;
}

// Cue info for calculating segment status
interface CueInfo {
  id: string;
  startTime: number;
  duration: number;
  type: string;
}

interface SegmentRailProps {
  segments: Segment[];
  cues?: CueInfo[];
  pixelsPerSecond: number;
  trackLabelWidth: number;
  onSegmentClick?: (segmentId: string) => void;
  onSegmentUpdate?: (segmentId: string, newDuration: number) => void;
  className?: string;
}

type SegmentStatus = 'empty' | 'balanced' | 'overloaded';

// Format duration in seconds to readable string
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Parse duration string (MM:SS or H:MM:SS) to seconds
const parseDuration = (durationStr: string): number => {
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return 0;
};

const SegmentRail: React.FC<SegmentRailProps> = ({
  segments,
  cues = [],
  pixelsPerSecond,
  trackLabelWidth,
  onSegmentClick,
  onSegmentUpdate,
  className
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState('');
  const [resizingSegment, setResizingSegment] = useState<{ id: string; startX: number; originalWidth: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate segment stats
  const segmentStats = useMemo(() => {
    return segments.map(segment => {
      // Find cues in this segment
      const segmentCues = cues.filter(cue => {
        const cueEnd = cue.startTime + cue.duration;
        // Cue is in segment if it overlaps
        return cue.startTime < segment.endTime && cueEnd > segment.startTime;
      });

      const cueCount = segmentCues.length;
      const actualDuration = segment.endTime - segment.startTime;
      
      // Calculate total cue duration in this segment
      const totalCueDuration = segmentCues.reduce((sum, cue) => {
        const cueStart = Math.max(cue.startTime, segment.startTime);
        const cueEnd = Math.min(cue.startTime + cue.duration, segment.endTime);
        return sum + (cueEnd - cueStart);
      }, 0);

      // Determine status
      let status: SegmentStatus = 'balanced';
      if (cueCount === 0) {
        status = 'empty';
      } else if (segment.targetDuration && actualDuration > segment.targetDuration * 1.2) {
        status = 'overloaded';
      } else if (totalCueDuration > actualDuration * 0.9) {
        // If cues fill more than 90% of segment, it's tight
        status = 'overloaded';
      }

      return {
        ...segment,
        cueCount,
        actualDuration,
        totalCueDuration,
        status,
      };
    });
  }, [segments, cues]);

  const handleStartEdit = useCallback((segmentId: string, duration: number) => {
    setEditingSegmentId(segmentId);
    setEditDuration(formatDuration(duration));
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingSegmentId) return;
    const newDuration = parseDuration(editDuration);
    if (newDuration >= 30) { // Minimum 30 seconds
      onSegmentUpdate?.(editingSegmentId, newDuration);
    }
    setEditingSegmentId(null);
    setEditDuration('');
  }, [editingSegmentId, editDuration, onSegmentUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditingSegmentId(null);
    setEditDuration('');
  }, []);

  // Handle drag resize
  const handleResizeStart = useCallback((e: React.MouseEvent, segmentId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingSegment({ id: segmentId, startX: e.clientX, originalWidth: currentWidth });
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingSegment || !containerRef.current) return;
    
    const deltaX = e.clientX - resizingSegment.startX;
    const newWidth = Math.max(60, resizingSegment.originalWidth + deltaX);
    const newDuration = Math.max(30, Math.round(newWidth / pixelsPerSecond));
    
    // Update in real-time would require more complex state management
    // For now, we'll update on mouse up
  }, [resizingSegment, pixelsPerSecond]);

  const handleResizeEnd = useCallback((e: MouseEvent) => {
    if (!resizingSegment) return;
    
    const deltaX = e.clientX - resizingSegment.startX;
    const newWidth = Math.max(60, resizingSegment.originalWidth + deltaX);
    const newDuration = Math.max(30, Math.round(newWidth / pixelsPerSecond));
    
    onSegmentUpdate?.(resizingSegment.id, newDuration);
    setResizingSegment(null);
  }, [resizingSegment, pixelsPerSecond, onSegmentUpdate]);

  // Attach global mouse listeners for resize
  React.useEffect(() => {
    if (resizingSegment) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingSegment, handleResizeMove, handleResizeEnd]);

  const getStatusIcon = (status: SegmentStatus) => {
    switch (status) {
      case 'empty':
        return <MinusCircle className="h-3 w-3 text-muted-foreground" />;
      case 'balanced':
        return <CheckCircle2 className="h-3 w-3 text-runway-success" />;
      case 'overloaded':
        return <AlertCircle className="h-3 w-3 text-runway-warning" />;
    }
  };

  const getStatusBg = (status: SegmentStatus) => {
    switch (status) {
      case 'empty':
        return 'bg-muted/30 border-muted-foreground/20';
      case 'balanced':
        return 'bg-runway-success/10 border-runway-success/30';
      case 'overloaded':
        return 'bg-runway-warning/10 border-runway-warning/30';
    }
  };

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex h-8 border-b border-border bg-muted/20", className)}>
      {/* Spacer for track labels */}
      <div 
        className="flex-shrink-0 bg-card border-r border-border flex items-center justify-center"
        style={{ width: trackLabelWidth }}
      >
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Segments
        </span>
      </div>

      {/* Segments */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {segmentStats.map((segment, index) => {
          const left = segment.startTime * pixelsPerSecond;
          const width = (segment.endTime - segment.startTime) * pixelsPerSecond;
          const isEditing = editingSegmentId === segment.id;

          return (
            <div key={segment.id}>
              {isEditing ? (
                // Inline edit mode
                <div
                  className={cn(
                    "absolute top-1 bottom-1 rounded-md border",
                    "flex items-center gap-1 px-1 overflow-hidden",
                    "bg-primary/10 border-primary"
                  )}
                  style={{
                    left,
                    width: Math.max(width, 120),
                    zIndex: 10,
                  }}
                >
                  <span className="text-xs font-medium truncate max-w-[60px]">
                    {segment.name}
                  </span>
                  <Input
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="h-5 w-14 text-[10px] px-1 py-0"
                    placeholder="MM:SS"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit();
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute top-1 bottom-1 rounded-md border cursor-pointer transition-all group",
                        "hover:brightness-110 hover:shadow-sm",
                        "flex items-center justify-center gap-1.5 px-2 overflow-hidden",
                        getStatusBg(segment.status)
                      )}
                      style={{
                        left,
                        width: Math.max(width, 60),
                        backgroundColor: segment.color ? `${segment.color}20` : undefined,
                        borderColor: segment.color ? `${segment.color}40` : undefined,
                      }}
                      onClick={() => onSegmentClick?.(segment.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(segment.id, segment.actualDuration);
                      }}
                    >
                      {getStatusIcon(segment.status)}
                      <span className="text-xs font-medium truncate">
                        {segment.name}
                      </span>
                      {width > 100 && (
                        <span 
                          className="text-[10px] text-muted-foreground flex items-center gap-0.5 cursor-text hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(segment.id, segment.actualDuration);
                          }}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {formatDuration(segment.actualDuration)}
                        </span>
                      )}
                      
                      {/* Resize handle on right edge */}
                      {onSegmentUpdate && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-primary/30 hover:bg-primary/50 transition-opacity"
                          onMouseDown={(e) => handleResizeStart(e, segment.id, width)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{segment.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(segment.actualDuration)}
                        </span>
                        <span>{segment.cueCount} cues</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Double-click or click duration to edit • Drag right edge to resize
                      </p>
                      {segment.status === 'empty' && (
                        <p className="text-xs text-muted-foreground">No cues in this segment</p>
                      )}
                      {segment.status === 'overloaded' && (
                        <p className="text-xs text-runway-warning">Segment may be overloaded</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SegmentRail;
