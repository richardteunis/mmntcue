import React, { useEffect } from 'react';
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
  variant = 'inline'
}) => {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (controlState === 'hold') {
          onResume();
        } else if (nextCue) {
          onGo();
        }
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onStandby();
      }

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        onHold();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlState, nextCue, onGo, onStandby, onHold, onResume]);

  const buttonStyles = cn(
    "transition-all font-bold",
    controlState === 'standby' && "animate-pulse",
    controlState === 'hold' ? "bg-destructive hover:bg-destructive/90" : "bg-runway-success hover:bg-runway-success/90",
    variant === 'floating' && "shadow-2xl rounded-2xl",
    className
  );

  const content = (
    <>
      {controlState === 'hold' ? (
        <>
          <Play className="h-6 w-6" />
          <div className="flex flex-col items-start">
            <span className="text-lg leading-tight">RESUME</span>
            {nextCue && (
              <span className="text-xs opacity-70 font-normal">
                #{nextCueIndex + 1} {nextCue.name.slice(0, 20)}{nextCue.name.length > 20 ? '...' : ''}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <Play className="h-6 w-6" />
          <div className="flex flex-col items-start">
            <span className="text-lg leading-tight">GO</span>
            {nextCue && (
              <span className="text-xs opacity-70 font-normal">
                #{nextCueIndex + 1} {nextCue.name.slice(0, 20)}{nextCue.name.length > 20 ? '...' : ''}
              </span>
            )}
          </div>
        </>
      )}
    </>
  );

  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col gap-2",
        className
      )}>
        {/* Status indicators */}
        <div className="flex gap-2 justify-end">
          <Button
            variant={controlState === 'standby' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "shadow-lg",
              controlState === 'standby' && "bg-runway-warning text-black hover:bg-runway-warning/90"
            )}
            onClick={onStandby}
            disabled={controlState === 'standby' || !nextCue}
          >
            <Pause className="h-4 w-4 mr-1" />
            Standby
          </Button>
          <Button
            variant={controlState === 'hold' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "shadow-lg",
              controlState === 'hold' && "bg-destructive hover:bg-destructive/90"
            )}
            onClick={onHold}
            disabled={controlState === 'hold'}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Hold
          </Button>
        </div>

        {/* Main GO Button */}
        <Button
          size="lg"
          className={cn(
            buttonStyles,
            "h-20 px-8 gap-3"
          )}
          onClick={controlState === 'hold' ? onResume : onGo}
          disabled={!nextCue && controlState !== 'hold'}
        >
          {content}
        </Button>

        <span className="text-xs text-muted-foreground text-center opacity-70">
          Press [Space] to GO
        </span>
      </div>
    );
  }

  return (
    <Button
      size="lg"
      className={cn(
        buttonStyles,
        "h-16 px-6 gap-2"
      )}
      onClick={controlState === 'hold' ? onResume : onGo}
      disabled={!nextCue && controlState !== 'hold'}
    >
      {content}
    </Button>
  );
};

export default GoButton;
