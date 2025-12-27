import React, { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Play, 
  Pause, 
  AlertTriangle, 
  RefreshCw,
  Settings
} from 'lucide-react';
import { ShowStatus, ShowControlState } from '@/hooks/useShowState';

interface ShowTimingBarProps {
  currentTimeSeconds: number;
  totalDuration: number;
  showTiming: {
    scheduledElapsed: number;
    actualElapsed: number;
    overUnder: number;
    status: ShowStatus;
  };
  controlState: ShowControlState;
  isRehearsalMode: boolean;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onToggleRehearsalMode: () => void;
  className?: string;
}

// Format seconds to HH:MM:SS
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
  return `${sign}0:${secs.toString().padStart(2, '0')}`;
};

const ShowTimingBar: React.FC<ShowTimingBarProps> = ({
  currentTimeSeconds,
  totalDuration,
  showTiming,
  controlState,
  isRehearsalMode,
  isPlaying,
  onPlayPause,
  onReset,
  onToggleRehearsalMode,
  className
}) => {
  const [wallClock, setWallClock] = useState(new Date());

  // Update wall clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setWallClock(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Status styling
  const statusStyles = useMemo(() => {
    switch (showTiming.status) {
      case 'on_time':
        return { text: 'ON TIME', color: 'text-muted-foreground', bg: 'bg-muted/50' };
      case 'ahead':
        return { text: 'AHEAD', color: 'text-runway-success', bg: 'bg-runway-success/20' };
      case 'behind':
        return { text: 'BEHIND', color: 'text-runway-warning', bg: 'bg-runway-warning/20' };
      case 'significantly_behind':
        return { text: 'LATE', color: 'text-destructive', bg: 'bg-destructive/20' };
    }
  }, [showTiming.status]);

  // Control state indicator
  const controlIndicator = useMemo(() => {
    switch (controlState) {
      case 'standby':
        return { text: 'STANDBY', color: 'bg-runway-warning', icon: Pause };
      case 'hold':
        return { text: 'HOLD', color: 'bg-destructive', icon: AlertTriangle };
      case 'go':
        return { text: 'RUNNING', color: 'bg-runway-success', icon: Play };
      default:
        return null;
    }
  }, [controlState]);

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 px-4 py-2 bg-card/80 border-b border-border backdrop-blur-sm",
      className
    )}>
      {/* Left: Playback controls and current time */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onReset}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset to start</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase">Current</span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {formatTime(currentTimeSeconds)}
          </span>
        </div>

        <span className="text-muted-foreground">/</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase">Total</span>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {/* Center: Control state and Over/Under */}
      <div className="flex items-center gap-4">
        {/* Control state indicator */}
        {controlIndicator && (
          <Badge 
            className={cn(
              "text-xs font-bold uppercase px-3 py-1",
              controlIndicator.color,
              controlState === 'hold' && "animate-pulse"
            )}
          >
            <controlIndicator.icon className="h-3 w-3 mr-1.5" />
            {controlIndicator.text}
          </Badge>
        )}

        {/* Over/Under display */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded",
          statusStyles.bg
        )}>
          <span className={cn("text-xs font-semibold uppercase", statusStyles.color)}>
            {statusStyles.text}
          </span>
          {showTiming.overUnder !== 0 && (
            <span className={cn("font-mono text-sm font-bold", statusStyles.color)}>
              {formatOverUnder(showTiming.overUnder)}
            </span>
          )}
        </div>
      </div>

      {/* Right: Wall clock and rehearsal mode */}
      <div className="flex items-center gap-3">
        {/* Rehearsal mode toggle */}
        <Button
          variant={isRehearsalMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleRehearsalMode}
          className={cn(
            "h-7 text-xs gap-1.5",
            isRehearsalMode && "bg-runway-warning text-black hover:bg-runway-warning/90"
          )}
        >
          {isRehearsalMode ? '🎭 REHEARSAL' : 'LIVE'}
        </Button>

        {/* Wall clock */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm tabular-nums">
            {wallClock.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: true 
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShowTimingBar;
