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
  ChevronDown,
  Radio,
  Users,
  Calendar,
  FileText,
  LayoutGrid
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
  showName?: string;
  cueCount?: number;
  lastEdited?: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onModeChange?: (mode: ShowMode) => void;
  onEndShow?: () => void;
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
  showName,
  cueCount = 0,
  lastEdited,
  isPlaying,
  onPlayPause,
  onReset,
  onModeChange,
  onEndShow,
  className
}) => {
  const [wallClock, setWallClock] = useState(new Date());
  const [confirmLiveMode, setConfirmLiveMode] = useState(false);
  const [confirmEndShow, setConfirmEndShow] = useState(false);
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
        return { text: 'STANDBY', color: 'bg-runway-warning text-black', icon: Pause };
      case 'hold':
        return { text: 'HOLD', color: 'bg-destructive', icon: AlertTriangle };
      case 'go':
        return { text: 'RUNNING', color: 'bg-runway-success', icon: Play };
      default:
        return null;
    }
  }, [controlState]);

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

  const handleEndShow = () => {
    setConfirmEndShow(true);
  };

  // ==================== PLANNING MODE ====================
  // Simplified for design focus - emphasizes total runtime, hides playback controls
  if (mode === 'planning') {
    return (
      <>
        {/* Planning Mode Banner - Calm, structure-focused */}
        <div className="w-full py-2 px-4 flex items-center justify-between bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium">
              <LayoutGrid className="h-3 w-3 mr-1.5" />
              PLANNING
            </Badge>
            <span className="text-xs text-muted-foreground">Build & structure the show</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Total Runtime - PRIMARY focus in planning */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase">Total</span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {formatTime(totalDuration)}
              </span>
            </div>
            
            {/* Cue count */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{cueCount} Cues</span>
            </div>

            {/* Wall clock - minimal */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border pl-4">
              <span className="font-mono tabular-nums">
                {wallClock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>

            {/* Mode Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  Start Rehearsal
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => handleModeSelect('rehearsal')}>
                  🎭 Start Rehearsal
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleModeSelect('live')}
                  className="text-destructive font-semibold"
                >
                  🔴 Go Live
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Confirmation Dialogs */}
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
  }

  // ==================== REHEARSAL MODE ====================
  if (mode === 'rehearsal') {
    return (
      <>
        {/* Rehearsal Mode Banner */}
        <div className="w-full py-1.5 px-4 flex items-center justify-center gap-2 bg-runway-warning/20 border-b border-runway-warning/30">
          <Badge className="bg-runway-warning text-black px-3 py-0.5 text-xs font-bold">
            🎭 REHEARSAL
          </Badge>
          <span className="text-xs text-runway-warning font-medium">
            Cues will not trigger equipment
          </span>
        </div>

        {/* Timing Bar */}
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
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onReset}>
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
              <span className="text-muted-foreground">/</span>
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {formatTime(totalDuration)}
              </span>
            </div>
          </div>

          {/* Center: Status */}
          <div className="flex items-center gap-4">
            {controlIndicator && (
              <Badge className={cn("text-xs font-bold uppercase px-3 py-1", controlIndicator.color)}>
                <controlIndicator.icon className="h-3 w-3 mr-1.5" />
                {controlIndicator.text}
              </Badge>
            )}

            <div className={cn("flex items-center gap-2 px-3 py-1 rounded", statusStyles.bg)}>
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

          {/* Right: Mode switcher and clock */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-runway-warning/50">
                  Switch Mode
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleModeSelect('planning')}>
                  📋 Return to Planning
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleModeSelect('live')}
                  className="text-destructive font-semibold"
                >
                  🔴 Go Live
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm tabular-nums">
                {wallClock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmLiveMode} onOpenChange={setConfirmLiveMode}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Switch to Live Mode?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Switching to LIVE mode will enable real equipment control.
                <br /><br />
                <strong className="text-destructive">⚠️ This action affects live production equipment.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingMode(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmModeChange} className="bg-destructive hover:bg-destructive/90">
                Go Live
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ==================== LIVE MODE ====================
  return (
    <>
      {/* Live Mode Banner - RED, PROMINENT */}
      <div className="w-full py-2 px-4 flex items-center justify-between bg-destructive border-b border-destructive">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-white animate-pulse" />
            <span className="text-white font-bold text-sm uppercase tracking-wide">
              🔴 LIVE MODE — Equipment Active
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleEndShow}
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
        >
          End Show
        </Button>
      </div>

      {/* Enhanced Timing Bar for Live */}
      <div className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 bg-card border-b-2 border-border",
        className
      )}>
        {/* Left: Current time - LARGER */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase">Current</span>
            <span className="font-mono text-2xl font-bold tabular-nums">
              {formatTime(currentTimeSeconds)}
            </span>
          </div>
          <span className="text-muted-foreground text-lg">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase">Total</span>
            <span className="font-mono text-lg text-muted-foreground tabular-nums">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Center: Status - MORE PROMINENT */}
        <div className="flex items-center gap-4">
          {controlIndicator && (
            <Badge className={cn(
              "text-sm font-bold uppercase px-4 py-1.5",
              controlIndicator.color,
              controlState === 'hold' && "animate-pulse"
            )}>
              <controlIndicator.icon className="h-4 w-4 mr-2" />
              {controlIndicator.text}
            </Badge>
          )}

          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            statusStyles.bg,
            showTiming.status === 'significantly_behind' && "animate-pulse"
          )}>
            <span className={cn("text-sm font-bold uppercase", statusStyles.color)}>
              {statusStyles.text}
            </span>
            {showTiming.overUnder !== 0 && (
              <span className={cn("font-mono text-lg font-bold", statusStyles.color)}>
                {formatOverUnder(showTiming.overUnder)}
              </span>
            )}
          </div>

          {/* Live indicator */}
          <Badge className="bg-destructive text-white px-3 py-1 animate-pulse">
            <Radio className="h-3 w-3 mr-1.5" />
            LIVE
          </Badge>
        </div>

        {/* Right: Clock - LARGER */}
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="font-mono text-xl font-semibold tabular-nums">
            {wallClock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
        </div>
      </div>

      {/* End Show Confirmation */}
      <AlertDialog open={confirmEndShow} onOpenChange={setConfirmEndShow}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Live Show?</AlertDialogTitle>
            <AlertDialogDescription>
              This will exit live mode and return to planning. 
              Make sure all cues have been fired and the show is complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Show</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onEndShow?.();
              onModeChange?.('planning');
              setConfirmEndShow(false);
            }}>
              End Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ShowTimingBar;
