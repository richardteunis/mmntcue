import React, { useMemo, useState, useEffect } from 'react';
import { Cue } from '@/types/cue';
import { CueStatus, ShowControlState, ShowStatus } from '@/hooks/useShowState';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Video,
  Music,
  Lightbulb,
  Square,
  Mic2,
  FileText
} from 'lucide-react';

interface NextCuePanelProps {
  nextCue: Cue | null;
  nextCueIndex: number;
  upcomingCues: Cue[];
  controlState: ShowControlState;
  showTiming: {
    overUnder: number;
    status: ShowStatus;
  };
  getCueStatus: (cueId: string) => CueStatus;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

// Helper to get track icon
const getTrackIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'audio': return Music;
    case 'video': return Video;
    case 'lighting': return Lightbulb;
    case 'stage': return Square;
    case 'vog': return Mic2;
    case 'ops_note': return FileText;
    default: return FileText;
  }
};

// Format time string
const formatDuration = (duration: string): string => {
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return duration;
};

// Parse time string to seconds
const parseTimeToSeconds = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return parts[0] || 0;
};

// Format seconds to countdown
const formatCountdown = (seconds: number): string => {
  if (seconds <= 0) return 'NOW';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) {
    return `in ${m}:${s.toString().padStart(2, '0')}`;
  }
  return `in ${s} seconds`;
};

const NextCuePanel: React.FC<NextCuePanelProps> = ({
  nextCue,
  nextCueIndex,
  upcomingCues,
  controlState,
  showTiming,
  getCueStatus,
  isExpanded = true,
  onToggleExpand,
  className
}) => {
  const TrackIcon = nextCue ? getTrackIcon(nextCue.type) : FileText;
  const [countdown, setCountdown] = useState<number>(0);

  // Calculate countdown to next cue
  useEffect(() => {
    if (!nextCue) return;
    
    const startSeconds = parseTimeToSeconds(nextCue.start_time);
    // This would need current playback time - for now showing static
    setCountdown(startSeconds);
  }, [nextCue]);

  // Status color and label
  const statusInfo = useMemo(() => {
    switch (showTiming.status) {
      case 'on_time': 
        return { label: 'ON TIME', color: 'text-muted-foreground', bgColor: 'bg-muted/50' };
      case 'ahead': 
        return { label: 'AHEAD', color: 'text-runway-success', bgColor: 'bg-runway-success/20' };
      case 'behind': 
        return { label: 'BEHIND', color: 'text-runway-warning', bgColor: 'bg-runway-warning/20' };
      case 'significantly_behind': 
        return { label: 'LATE', color: 'text-destructive', bgColor: 'bg-destructive/20' };
    }
  }, [showTiming.status]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={cn(
        "bg-card border border-border rounded-lg shadow-lg overflow-hidden",
        className
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Next Cue
            </span>
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 space-y-4">
            {/* Next Cue Details - READ ONLY */}
            {nextCue ? (
              <div className="space-y-3">
                {/* Cue Number and Status */}
                <div className="flex items-start justify-between gap-4">
                  <span className="text-3xl font-bold text-foreground">
                    #{nextCueIndex + 1}
                  </span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold uppercase px-2 py-0.5",
                      statusInfo.color,
                      statusInfo.bgColor
                    )}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Track and Duration */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrackIcon className="h-4 w-4" />
                  <span className="capitalize">{nextCue.track}</span>
                  <span>•</span>
                  <span className="font-mono">{formatDuration(nextCue.duration)}</span>
                </div>

                {/* Cue Name */}
                <h3 className="text-lg font-semibold text-foreground leading-tight">
                  {nextCue.name}
                </h3>

                {/* Start Time and Countdown */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>
                    <span className="text-xs uppercase tracking-wide">Fires at: </span>
                    <span className="font-mono">{nextCue.start_time}</span>
                  </div>
                  <div className="text-xs">
                    ({formatCountdown(countdown)})
                  </div>
                </div>

                {/* Notes if present */}
                {nextCue.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded px-3 py-2 italic">
                    {nextCue.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No upcoming cues</p>
                <p className="text-xs mt-1">Add cues to the timeline to get started</p>
              </div>
            )}

            {/* Coming Up Section */}
            {upcomingCues.length > 1 && (
              <>
                <div className="border-t border-border my-3" />
                
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                    Coming Up
                  </p>
                  <div className="space-y-2">
                    {upcomingCues.slice(1, 5).map((cue, idx) => {
                      const Icon = getTrackIcon(cue.type);
                      return (
                        <div
                          key={cue.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span className="font-mono text-xs w-6 text-right">
                            #{nextCueIndex + idx + 2}
                          </span>
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate flex-1">{cue.name}</span>
                          <span className="text-xs font-mono opacity-70">
                            ({formatDuration(cue.duration)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default NextCuePanel;
