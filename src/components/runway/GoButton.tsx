import React, { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Pause, AlertTriangle } from 'lucide-react';
import { ShowControlState } from '@/hooks/useShowState';
import { Cue } from '@/types/cue';

interface GoButtonProps {
  nextCue: Cue | null;
  nextCueIndex: number;
  controlState: ShowControlState;
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
  onGo,
  onStandby,
  onHold,
  onResume,
  className,
  variant = 'inline',
  disabled = false
}) => {
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

  // State-based styling
  const stateStyles = useMemo(() => {
    switch (buttonState) {
      case 'ready':
        return {
          bg: 'bg-runway-success hover:bg-runway-success/90',
          text: 'text-white',
          animation: 'animate-pulse',
          icon: Play,
          label: 'GO',
          sublabel: nextCue ? `#${nextCueIndex + 1} ${nextCue.name.slice(0, 25)}${nextCue.name.length > 25 ? '...' : ''}` : '',
          hint: 'Press [Space] to GO'
        };
      case 'standby':
        return {
          bg: 'bg-runway-warning hover:bg-runway-warning/90',
          text: 'text-black',
          animation: 'animate-[pulse_1s_ease-in-out_infinite]',
          icon: Pause,
          label: 'READY',
          sublabel: nextCue ? `#${nextCueIndex + 1} ${nextCue.name.slice(0, 25)}${nextCue.name.length > 25 ? '...' : ''}` : '',
          hint: 'Press [Space] to GO'
        };
      case 'hold':
        return {
          bg: 'bg-destructive hover:bg-destructive/90',
          text: 'text-white',
          animation: '',
          icon: Pause,
          label: 'ON HOLD',
          sublabel: 'Show Paused',
          hint: 'Press [Space] to Resume'
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
  }, [buttonState, nextCue, nextCueIndex]);

  const Icon = stateStyles.icon;
  const isDisabled = buttonState === 'disabled';

  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2",
        className
      )}>
        {/* Main GO Button - THE ONLY PRIMARY ACTION */}
        <Button
          size="lg"
          disabled={isDisabled}
          className={cn(
            "h-24 px-10 gap-4 shadow-2xl rounded-2xl transition-all font-bold",
            stateStyles.bg,
            stateStyles.text,
            stateStyles.animation,
            isDisabled && "cursor-not-allowed opacity-50"
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
          <Icon className="h-8 w-8" />
          <div className="flex flex-col items-start">
            <span className="text-2xl leading-tight">{stateStyles.label}</span>
            <span className="text-sm opacity-80 font-normal max-w-48 truncate">
              {stateStyles.sublabel}
            </span>
          </div>
        </Button>

        <span className="text-xs text-muted-foreground text-center opacity-70 mr-2">
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
        "h-16 px-6 gap-2 transition-all font-bold",
        stateStyles.bg,
        stateStyles.text,
        stateStyles.animation,
        isDisabled && "cursor-not-allowed opacity-50",
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
      <Icon className="h-6 w-6" />
      <div className="flex flex-col items-start">
        <span className="text-lg leading-tight">{stateStyles.label}</span>
        {stateStyles.sublabel && (
          <span className="text-xs opacity-70 font-normal">
            {stateStyles.sublabel}
          </span>
        )}
      </div>
    </Button>
  );
};

export default GoButton;
