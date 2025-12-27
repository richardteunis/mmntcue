import React, { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Play, 
  Pause, 
  AlertTriangle, 
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { ShowStatus, ShowControlState } from '@/hooks/useShowState';

export type ShowMode = 'planning' | 'rehearsal' | 'live';

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
  mode?: ShowMode;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onModeChange?: (mode: ShowMode) => void;
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
  mode = 'planning',
  isPlaying,
  onPlayPause,
  onReset,
  onModeChange,
  className
}) => {
  const [wallClock, setWallClock] = useState(new Date());
  const [confirmLiveMode, setConfirmLiveMode] = useState(false);
  const [pendingMode, setPendingMode] = useState<ShowMode | null>(null);

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

  // Mode styling
  const getModeStyles = (m: ShowMode) => {
    switch (m) {
      case 'live':
        return { 
          icon: '🔴', 
          label: 'LIVE', 
          bg: 'bg-destructive', 
          text: 'text-white',
          border: 'border-destructive'
        };
      case 'rehearsal':
        return { 
          icon: '🎭', 
          label: 'REHEARSAL', 
          bg: 'bg-runway-warning', 
          text: 'text-black',
          border: 'border-runway-warning'
        };
      default:
        return { 
          icon: '📋', 
          label: 'PLANNING', 
          bg: 'bg-primary', 
          text: 'text-primary-foreground',
          border: 'border-primary'
        };
    }
  };

  const currentModeStyle = getModeStyles(mode);

  const handleModeSelect = (newMode: ShowMode) => {
    if (newMode === 'live' && mode !== 'live') {
      setPendingMode(newMode);
      setConfirmLiveMode(true);
    } else {
      onModeChange?.(newMode);
    }
  };

  const confirmModeChange = () => {
    if (pendingMode) {
      onModeChange?.(pendingMode);
    }
    setConfirmLiveMode(false);
    setPendingMode(null);
  };

  return (
    <>
      {/* Mode Banner - Prominent at top */}
      <div className={cn(
        "w-full py-1.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold",
        mode === 'live' && "bg-destructive/20 border-b border-destructive/30",
        mode === 'rehearsal' && "bg-runway-warning/20 border-b border-runway-warning/30",
        mode === 'planning' && "bg-primary/10 border-b border-primary/20"
      )}>
        <span>{currentModeStyle.icon}</span>
        <span className={cn(
          mode === 'live' && "text-destructive",
          mode === 'rehearsal' && "text-runway-warning",
          mode === 'planning' && "text-primary"
        )}>
          {currentModeStyle.label} MODE
        </span>
        {mode === 'planning' && (
          <span className="text-xs text-muted-foreground font-normal ml-2">
            — Changes will not affect live show
          </span>
        )}
        {mode === 'rehearsal' && (
          <span className="text-xs text-muted-foreground font-normal ml-2">
            — Cues fire but don't trigger hardware
          </span>
        )}
        {mode === 'live' && (
          <span className="text-xs text-white/70 font-normal ml-2">
            — Equipment control active
          </span>
        )}
      </div>

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
            disabled={mode === 'planning'}
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

        {/* Right: Mode switcher and wall clock */}
        <div className="flex items-center gap-3">
          {/* Mode switcher dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1.5 font-semibold",
                  currentModeStyle.border
                )}
              >
                {currentModeStyle.icon} {currentModeStyle.label}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleModeSelect('planning')}
                className={mode === 'planning' ? 'bg-primary/10' : ''}
              >
                📋 Planning
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleModeSelect('rehearsal')}
                className={mode === 'rehearsal' ? 'bg-runway-warning/10' : ''}
              >
                🎭 Rehearsal
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleModeSelect('live')}
                className={cn(
                  mode === 'live' ? 'bg-destructive/10' : '',
                  "text-destructive font-semibold"
                )}
              >
                🔴 Live
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Confirmation Dialog for Live Mode */}
      <AlertDialog open={confirmLiveMode} onOpenChange={setConfirmLiveMode}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Switch to Live Mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Switching to LIVE mode will enable real equipment control. 
              Cues will trigger actual hardware and systems.
              <br /><br />
              <strong className="text-destructive">
                ⚠️ This action affects live production equipment.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMode(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmModeChange}
              className="bg-destructive hover:bg-destructive/90"
            >
              Go Live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ShowTimingBar;
