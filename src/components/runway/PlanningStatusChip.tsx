import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react';

interface PlanningStatusChipProps {
  totalDuration: number; // in seconds
  targetDuration?: number; // optional target in seconds
  cueCount: number;
  transitionCount?: number;
  onClickDetails?: () => void;
  className?: string;
}

type PlanningStatus = 'balanced' | 'tight' | 'over_runtime' | 'empty';

interface StatusInfo {
  status: PlanningStatus;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}

// Format duration
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const PlanningStatusChip: React.FC<PlanningStatusChipProps> = ({
  totalDuration,
  targetDuration,
  cueCount,
  transitionCount = 0,
  onClickDetails,
  className
}) => {
  const statusInfo = useMemo<StatusInfo>(() => {
    // Empty show
    if (cueCount === 0) {
      return {
        status: 'empty',
        label: 'Empty',
        description: 'No cues added yet',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        icon: Clock,
      };
    }

    // If we have a target, check against it
    if (targetDuration) {
      const diff = totalDuration - targetDuration;
      const percentOver = (diff / targetDuration) * 100;

      if (diff > 0) {
        // Over target
        return {
          status: 'over_runtime',
          label: `Over by ${formatDuration(diff)}`,
          description: `Show is ${formatDuration(diff)} over target runtime of ${formatDuration(targetDuration)}`,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          icon: XCircle,
        };
      } else if (percentOver > -5) {
        // Within 5% of target - tight
        return {
          status: 'tight',
          label: 'Tight',
          description: `Within ${formatDuration(Math.abs(diff))} of target. Consider adding buffer time.`,
          color: 'text-runway-warning',
          bgColor: 'bg-runway-warning/10',
          icon: AlertTriangle,
        };
      }
    }

    // Check for tight transitions (less than 5s between cues)
    if (transitionCount > 0) {
      return {
        status: 'tight',
        label: 'Tight Transitions',
        description: `${transitionCount} transition${transitionCount > 1 ? 's' : ''} under 5 seconds`,
        color: 'text-runway-warning',
        bgColor: 'bg-runway-warning/10',
        icon: AlertTriangle,
      };
    }

    // Default balanced state
    return {
      status: 'balanced',
      label: 'Balanced',
      description: 'Show structure looks good',
      color: 'text-runway-success',
      bgColor: 'bg-runway-success/10',
      icon: CheckCircle2,
    };
  }, [totalDuration, targetDuration, cueCount, transitionCount]);

  const Icon = statusInfo.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer transition-colors gap-1.5 px-2.5 py-1",
            statusInfo.bgColor,
            statusInfo.color,
            "border-current/20 hover:opacity-80",
            className
          )}
          onClick={onClickDetails}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{statusInfo.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm font-medium">{statusInfo.label}</p>
        <p className="text-xs text-muted-foreground mt-1">{statusInfo.description}</p>
        {onClickDetails && (
          <p className="text-xs text-primary mt-2">Click to view details</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default PlanningStatusChip;
