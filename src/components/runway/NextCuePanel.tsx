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
  FileText,
  CheckCircle2
} from 'lucide-react';
import { ShowMode } from './ShowOperationsBar';

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
  mode?: ShowMode;
  lastFiredCue?: Cue | null;
  lastFiredAt?: Date | null;
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

// Format countdown with color indication
const getCountdownInfo = (seconds: number): { text: string; color: string } => {
  if (seconds <= 0) return { text: 'NOW', color: 'text-destructive' };
  
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  
  let text: string;
  if (m > 0) {
    text = `${m}:${s.toString().padStart(2, '0')}`;
  } else {
    text = `${s}s`;
  }
  
  // Color based on urgency
  if (seconds < 10) return { text, color: 'text-destructive' };
  if (seconds < 30) return { text, color: 'text-runway-warning' };
  if (seconds < 60) return { text, color: 'text-runway-success' };
  return { text, color: 'text-muted-foreground' };
};

// Format time ago
const formatTimeAgo = (date: Date | null): string => {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ago`;
};

const NextCuePanel: React.FC<NextCuePanelProps> = ({
  nextCue,
  nextCueIndex,
  upcomingCues,
  controlState,
  showTiming,
  getCueStatus,
  mode = 'rehearsal',
  lastFiredCue,
  lastFiredAt,
  isExpanded = true,
  onToggleExpand,
  className
}) => {
  const TrackIcon = nextCue ? getTrackIcon(nextCue.type) : FileText;
  const [countdown, setCountdown] = useState<number>(0);
  const [now, setNow] = useState(new Date());

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      if (nextCue) {
        const startSeconds = parseTimeToSeconds(nextCue.start_time);
        setCountdown(startSeconds);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextCue]);

  // Status info
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

  const countdownInfo = getCountdownInfo(countdown);
  const isLiveMode = mode === 'live';

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={cn(
        "bg-card border-r border-border overflow-hidden flex flex-col h-full",
        isLiveMode && "border-r-2 border-primary/30",
        className
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className={cn(
            "w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors",
            isLiveMode && "bg-primary/10"
          )}>
            <span className={cn(
              "font-semibold uppercase tracking-widest",
              isLiveMode ? "text-sm text-primary" : "text-xs text-muted-foreground"
            )}>
              {isLiveMode ? '━━ NEXT CUE ━━' : 'Next Cue'}
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

        <CollapsibleContent className="flex-1 overflow-auto">
          <div className={cn(
            "p-4 space-y-4",
            isLiveMode && "p-5 space-y-5"
          )}>
            {/* Next Cue Details */}
            {nextCue ? (
              <div className="space-y-3">
                {/* Cue Number and Status */}
                <div className="flex items-start justify-between gap-4">
                  <span className={cn(
                    "font-bold text-foreground",
                    isLiveMode ? "text-5xl" : "text-3xl"
                  )}>
                    #{nextCueIndex + 1}
                  </span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "font-semibold uppercase px-2 py-0.5",
                      statusInfo.color,
                      statusInfo.bgColor,
                      isLiveMode ? "text-sm" : "text-xs"
                    )}
                  >
                    <Clock className={cn("mr-1", isLiveMode ? "h-4 w-4" : "h-3 w-3")} />
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Track and Duration */}
                <div className={cn(
                  "flex items-center gap-2 text-muted-foreground",
                  isLiveMode ? "text-base" : "text-sm"
                )}>
                  <TrackIcon className={cn(isLiveMode ? "h-5 w-5" : "h-4 w-4")} />
                  <span className="capitalize font-medium">{nextCue.track}</span>
                  <span>•</span>
                  <span className="font-mono">{formatDuration(nextCue.duration)}</span>
                </div>

                {/* Cue Name */}
                <h3 className={cn(
                  "font-semibold text-foreground leading-tight",
                  isLiveMode ? "text-2xl" : "text-lg"
                )}>
                  {nextCue.name}
                </h3>

                {/* Countdown Timer - PROMINENT in live mode */}
                {isLiveMode && (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Fires In
                    </div>
                    <div className={cn(
                      "font-mono font-bold",
                      countdownInfo.color,
                      countdown < 30 ? "text-4xl" : "text-3xl"
                    )}>
                      {countdownInfo.text}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      At: {nextCue.start_time}
                    </div>
                  </div>
                )}

                {/* Simple countdown for rehearsal */}
                {!isLiveMode && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <span className="text-xs uppercase tracking-wide">Fires at: </span>
                      <span className="font-mono">{nextCue.start_time}</span>
                    </div>
                  </div>
                )}

                {/* Notes - Expanded in live mode */}
                {nextCue.notes && (
                  <div className={cn(
                    "bg-muted/30 rounded px-3 py-2",
                    isLiveMode && "bg-primary/5 border border-primary/20 px-4 py-3"
                  )}>
                    <div className={cn(
                      "text-xs uppercase tracking-wide text-muted-foreground mb-1",
                      isLiveMode && "text-primary font-semibold"
                    )}>
                      📝 Notes
                    </div>
                    <p className={cn(
                      "text-muted-foreground",
                      isLiveMode ? "text-base" : "text-sm"
                    )}>
                      {nextCue.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No upcoming cues</p>
                <p className="text-xs mt-1">Add cues to the timeline</p>
              </div>
            )}

            {/* Coming Up Section */}
            {upcomingCues.length > 1 && (
              <>
                <div className="border-t border-border my-3" />
                
                <div>
                  <p className={cn(
                    "text-muted-foreground uppercase tracking-widest mb-3",
                    isLiveMode ? "text-sm font-semibold" : "text-xs"
                  )}>
                    Coming Up
                  </p>
                  <div className="space-y-2">
                    {upcomingCues.slice(1, isLiveMode ? 5 : 4).map((cue, idx) => {
                      const Icon = getTrackIcon(cue.type);
                      return (
                        <div
                          key={cue.id}
                          className={cn(
                            "flex items-center gap-2 text-muted-foreground",
                            isLiveMode ? "text-base" : "text-sm"
                          )}
                        >
                          <span className={cn(
                            "font-mono text-right",
                            isLiveMode ? "text-sm w-8" : "text-xs w-6"
                          )}>
                            #{nextCueIndex + idx + 2}
                          </span>
                          <Icon className={cn("flex-shrink-0", isLiveMode ? "h-4 w-4" : "h-3.5 w-3.5")} />
                          <span className="truncate flex-1">{cue.name}</span>
                          <span className={cn("font-mono opacity-70", isLiveMode ? "text-sm" : "text-xs")}>
                            {formatDuration(cue.duration)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Last Fired Section - Live mode only */}
            {isLiveMode && lastFiredCue && (
              <>
                <div className="border-t border-border my-3" />
                
                <div className="bg-runway-success/10 rounded-lg p-3">
                  <p className="text-xs text-runway-success uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Last Fired
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-muted-foreground">
                      #{nextCueIndex}
                    </span>
                    <span className="text-foreground font-medium truncate">
                      {lastFiredCue.name}
                    </span>
                  </div>
                  {lastFiredAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ✓ Completed {formatTimeAgo(lastFiredAt)}
                    </p>
                  )}
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
