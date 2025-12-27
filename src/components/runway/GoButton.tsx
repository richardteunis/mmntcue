import React, { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Pause } from 'lucide-react';
import { ShowControlState } from '@/hooks/useShowState';
import { Cue } from '@/types/cue';
import { ShowMode } from './ShowOperationsBar';

interface GoButtonProps {
  nextCue: Cue | null;
  nextCueIndex: number;
  controlState: ShowControlState;
  mode?: ShowMode;
  onGo: () => void;
  onStandby: () => void;
  onHold: () => void;
  onResume: () => void;
  className?: string;
  variant?: 'floating' | 'inline';
  disabled?: boolean;
}

const GoButton: React.FC<GoButtonProps> = ({
  nextCue,
  nextCueIndex,
  controlState,
  mode = 'rehearsal',
  onGo,
  onStandby,
  onHold,
  onResume,
  className,
  variant = 'inline',
  disabled = false
}) => {
  const isLiveMode = mode === 'live';

  // Keyboard shortcuts - ONLY this button responds to Space/Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Spacebar or Enter triggers GO/Resume
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (disabled) return;
        
        if (controlState === 'hold') {
          onResume();
        } else if (nextCue) {
          onGo();
        }
      }

      // H key for Hold
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        if (controlState !== 'hold') {
          onHold();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlState, nextCue, onGo, onHold, onResume, disabled]);

  // Determine button state
  const buttonState = useMemo(() => {
    if (disabled || (!nextCue && controlState !== 'hold')) {
      return 'disabled';
    }
    if (controlState === 'hold') {
      return 'hold';
    }
    if (controlState === 'standby') {
      return 'standby';
    }
    return 'ready';
  }, [controlState, nextCue, disabled]);

  // State-based styling - LARGER for live mode
  const stateStyles = useMemo(() => {
    const cueName = nextCue?.name || '';
    const truncatedName = cueName.length > (isLiveMode ? 30 : 25) 
      ? cueName.slice(0, isLiveMode ? 30 : 25) + '...' 
      : cueName;

    switch (buttonState) {
      case 'ready':
        return {
          bg: 'bg-runway-success hover:bg-runway-success/90',
          text: 'text-white',
          animation: 'animate-pulse',
          icon: Play,
          label: 'GO',
          sublabel: nextCue ? `#${nextCueIndex + 1} ${truncatedName}` : '',
          hint: 'Press [SPACE] to GO'
        };
      case 'standby':
        return {
          bg: 'bg-runway-warning hover:bg-runway-warning/90',
          text: 'text-black',
          animation: 'animate-[pulse_1s_ease-in-out_infinite]',
          icon: Pause,
          label: 'READY',
          sublabel: nextCue ? `#${nextCueIndex + 1} ${truncatedName}` : '',
          hint: 'Press [SPACE] to GO'
        };
      case 'hold':
        return {
          bg: 'bg-destructive hover:bg-destructive/90',
          text: 'text-white',
          animation: '',
          icon: Pause,
          label: 'ON HOLD',
          sublabel: 'Show Paused',
          hint: 'Press [SPACE] to Resume'
        };
      case 'disabled':
      default:
        return {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          animation: '',
          icon: Play,
          label: 'GO',
          sublabel: 'No cues ready',
          hint: 'Add cues to timeline'
        };
    }
  }, [buttonState, nextCue, nextCueIndex, isLiveMode]);

  const Icon = stateStyles.icon;
  const isDisabled = buttonState === 'disabled';

  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed z-50 flex flex-col items-end gap-2",
        isLiveMode ? "bottom-8 right-8" : "bottom-6 right-6",
        className
      )}>
        {/* Main GO Button */}
        <Button
          size="lg"
          disabled={isDisabled}
          className={cn(
            "shadow-2xl rounded-2xl transition-all font-bold",
            stateStyles.bg,
            stateStyles.text,
            stateStyles.animation,
            isDisabled && "cursor-not-allowed opacity-50",
            // Size based on mode
            isLiveMode 
              ? "h-32 px-12 gap-5" // HUGE in live mode
              : "h-24 px-10 gap-4"
          )}
          onClick={() => {
            if (isDisabled) return;
            if (controlState === 'hold') {
              onResume();
            } else {
              onGo();
            }
          }}
        >
          <Icon className={cn(isLiveMode ? "h-12 w-12" : "h-8 w-8")} />
          <div className="flex flex-col items-start">
            <span className={cn(
              "leading-tight font-extrabold",
              isLiveMode ? "text-4xl" : "text-2xl"
            )}>
              {stateStyles.label}
            </span>
            <span className={cn(
              "opacity-80 font-normal truncate",
              isLiveMode ? "text-base max-w-64" : "text-sm max-w-48"
            )}>
              {stateStyles.sublabel}
            </span>
          </div>
        </Button>

        <span className={cn(
          "text-muted-foreground text-center opacity-70 mr-2",
          isLiveMode ? "text-sm" : "text-xs"
        )}>
          {stateStyles.hint}
        </span>
      </div>
    );
  }

  // Inline variant (smaller)
  return (
    <Button
      size="lg"
      disabled={isDisabled}
      className={cn(
        "transition-all font-bold",
        stateStyles.bg,
        stateStyles.text,
        stateStyles.animation,
        isDisabled && "cursor-not-allowed opacity-50",
        isLiveMode ? "h-20 px-8 gap-3" : "h-16 px-6 gap-2",
        className
      )}
      onClick={() => {
        if (isDisabled) return;
        if (controlState === 'hold') {
          onResume();
        } else {
          onGo();
        }
      }}
    >
      <Icon className={cn(isLiveMode ? "h-8 w-8" : "h-6 w-6")} />
      <div className="flex flex-col items-start">
        <span className={cn("leading-tight", isLiveMode ? "text-2xl" : "text-lg")}>
          {stateStyles.label}
        </span>
        {stateStyles.sublabel && (
          <span className={cn("opacity-70 font-normal", isLiveMode ? "text-sm" : "text-xs")}>
            {stateStyles.sublabel}
          </span>
        )}
      </div>
    </Button>
  );
};

export default GoButton;
