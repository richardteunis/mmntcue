import React, { useMemo } from 'react';
import { Cue } from '@/types/cue';
import { CueStatus, ShowControlState, ShowStatus } from '@/hooks/useShowState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipForward,
  Clock,
  AlertTriangle,
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
  onGo: () => void;
  onStandby: () => void;
  onHold: () => void;
  onResume: () => void;
  onSkipCue: (cueId: string) => void;
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

// Format over/under time
const formatOverUnder = (seconds: number): string => {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = Math.floor(abs % 60);
  const sign = seconds > 0 ? '+' : '-';
  if (mins > 0) {
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${sign}${secs}s`;
};

const NextCuePanel: React.FC<NextCuePanelProps> = ({
  nextCue,
  nextCueIndex,
  upcomingCues,
  controlState,
  showTiming,
  getCueStatus,
  onGo,
  onStandby,
  onHold,
  onResume,
  onSkipCue,
  isExpanded = true,
  onToggleExpand,
  className
}) => {
  const TrackIcon = nextCue ? getTrackIcon(nextCue.type) : FileText;

  // Status color classes
  const statusColors = useMemo(() => {
    switch (showTiming.status) {
      case 'on_time': return 'text-muted-foreground';
      case 'ahead': return 'text-runway-success';
      case 'behind': return 'text-runway-warning';
      case 'significantly_behind': return 'text-destructive';
    }
  }, [showTiming.status]);

  const statusLabel = useMemo(() => {
    switch (showTiming.status) {
      case 'on_time': return 'ON TIME';
      case 'ahead': return 'RUNNING AHEAD';
      case 'behind': return 'RUNNING BEHIND';
      case 'significantly_behind': return 'SIGNIFICANTLY BEHIND';
    }
  }, [showTiming.status]);

  // Control button styles based on state
  const goButtonStyles = useMemo(() => {
    switch (controlState) {
      case 'standby':
        return 'bg-runway-success hover:bg-runway-success/90 animate-pulse';
      case 'hold':
        return 'bg-destructive hover:bg-destructive/90';
      default:
        return 'bg-runway-success hover:bg-runway-success/90';
    }
  }, [controlState]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={cn(
        "bg-card border border-border rounded-lg shadow-lg overflow-hidden",
        className
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Next Cue
              </span>
              {nextCue && (
                <Badge variant="outline" className="text-xs font-mono">
                  #{nextCueIndex + 1}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Show timing status */}
              <div className={cn("flex items-center gap-1.5 text-xs font-medium", statusColors)}>
                <Clock className="h-3.5 w-3.5" />
                <span>{statusLabel}</span>
                {showTiming.overUnder !== 0 && (
                  <span className="font-mono">{formatOverUnder(showTiming.overUnder)}</span>
                )}
              </div>
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
            {/* Next Cue Details */}
            {nextCue ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TrackIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground capitalize">
                        {nextCue.track}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ⏱️ {formatDuration(nextCue.duration)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold truncate">{nextCue.name}</h3>
                    {nextCue.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {nextCue.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* GO Button */}
                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    className={cn(
                      "flex-1 h-14 text-lg font-bold transition-all",
                      goButtonStyles
                    )}
                    onClick={controlState === 'hold' ? onResume : onGo}
                    disabled={!nextCue}
                  >
                    {controlState === 'hold' ? (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        RESUME
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        GO
                      </>
                    )}
                    <span className="text-xs ml-2 opacity-70">[Space]</span>
                  </Button>

                  <Button
                    variant={controlState === 'standby' ? 'default' : 'outline'}
                    size="lg"
                    className={cn(
                      "h-14",
                      controlState === 'standby' && "bg-runway-warning text-black hover:bg-runway-warning/90"
                    )}
                    onClick={onStandby}
                    disabled={controlState === 'standby'}
                  >
                    <Pause className="h-5 w-5 mr-1" />
                    Standby
                    <span className="text-xs ml-1 opacity-70">[S]</span>
                  </Button>

                  <Button
                    variant={controlState === 'hold' ? 'default' : 'outline'}
                    size="lg"
                    className={cn(
                      "h-14",
                      controlState === 'hold' && "bg-destructive hover:bg-destructive/90"
                    )}
                    onClick={onHold}
                    disabled={controlState === 'hold'}
                  >
                    <AlertTriangle className="h-5 w-5 mr-1" />
                    Hold
                    <span className="text-xs ml-1 opacity-70">[H]</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-14"
                    onClick={() => onSkipCue(nextCue.id)}
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>No upcoming cues</p>
              </div>
            )}

            {/* Coming Up Section */}
            {upcomingCues.length > 1 && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Coming up:
                </p>
                <div className="space-y-1.5">
                  {upcomingCues.slice(1, 4).map((cue, idx) => {
                    const Icon = getTrackIcon(cue.type);
                    return (
                      <div
                        key={cue.id}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span className="font-mono text-xs w-6">
                          #{nextCueIndex + idx + 2}
                        </span>
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate flex-1">{cue.name}</span>
                        <span className="text-xs font-mono">
                          ({formatDuration(cue.duration)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default NextCuePanel;
