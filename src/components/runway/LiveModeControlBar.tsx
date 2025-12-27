import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Hand, 
  SkipForward, 
  RotateCcw, 
  MessageSquareWarning,
  Phone
} from 'lucide-react';
import { ShowControlState } from '@/hooks/useShowState';

interface LiveModeControlBarProps {
  controlState: ShowControlState;
  onHold: () => void;
  onResume: () => void;
  onSkip: () => void;
  onGoBack: () => void;
  onOpsAlert: () => void;
  onStageLink?: () => void;
  disabled?: boolean;
  className?: string;
}

const LiveModeControlBar: React.FC<LiveModeControlBarProps> = ({
  controlState,
  onHold,
  onResume,
  onSkip,
  onGoBack,
  onOpsAlert,
  onStageLink,
  disabled = false,
  className
}) => {
  const isOnHold = controlState === 'hold';

  return (
    <div className={cn(
      "w-full px-4 py-3 bg-card border-t-2 border-border",
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Emergency Controls
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex items-center gap-3">
        {/* Hold/Resume Button */}
        {isOnHold ? (
          <Button
            size="lg"
            onClick={onResume}
            disabled={disabled}
            className="h-12 px-6 bg-runway-success hover:bg-runway-success/90 text-white font-bold"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            RESUME SHOW
          </Button>
        ) : (
          <Button
            size="lg"
            variant="destructive"
            onClick={onHold}
            disabled={disabled}
            className="h-12 px-6 font-bold"
          >
            <Hand className="h-5 w-5 mr-2" />
            HOLD
          </Button>
        )}

        {/* Skip Button */}
        <Button
          size="lg"
          variant="outline"
          onClick={onSkip}
          disabled={disabled || isOnHold}
          className="h-12 px-6 font-semibold"
        >
          <SkipForward className="h-5 w-5 mr-2" />
          SKIP
        </Button>

        {/* Go Back Button */}
        <Button
          size="lg"
          variant="outline"
          onClick={onGoBack}
          disabled={disabled || isOnHold}
          className="h-12 px-6 font-semibold"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          GO BACK
        </Button>

        {/* Separator */}
        <div className="h-10 w-px bg-border mx-2" />

        {/* StageLink */}
        {onStageLink && (
          <Button
            size="lg"
            variant="secondary"
            onClick={onStageLink}
            disabled={disabled}
            className="h-12 px-6 font-semibold"
          >
            <Phone className="h-5 w-5 mr-2" />
            STAGELINK
          </Button>
        )}

        {/* Ops Alert */}
        <Button
          size="lg"
          variant="outline"
          onClick={onOpsAlert}
          disabled={disabled}
          className="h-12 px-6 font-semibold border-runway-warning text-runway-warning hover:bg-runway-warning/10"
        >
          <MessageSquareWarning className="h-5 w-5 mr-2" />
          OPS ALERT
        </Button>
      </div>
    </div>
  );
};

export default LiveModeControlBar;
