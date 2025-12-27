import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ShowHealthIndicatorProps {
  totalDuration: number; // in seconds
  targetDuration?: number; // in seconds
  cueCount: number;
  className?: string;
}

type HealthStatus = 'healthy' | 'tight' | 'overloaded';

const getHealthStatus = (
  totalDuration: number, 
  targetDuration: number,
  cueCount: number
): { status: HealthStatus; reason: string } => {
  const ratio = totalDuration / targetDuration;
  
  if (cueCount === 0) {
    return { status: 'healthy', reason: 'No cues yet — show is empty' };
  }
  
  if (ratio <= 0.9) {
    return { status: 'healthy', reason: 'Show is on track with room to spare' };
  }
  
  if (ratio <= 1.05) {
    return { status: 'tight', reason: 'Show is running close to target duration' };
  }
  
  const overMinutes = Math.round((totalDuration - targetDuration) / 60);
  return { 
    status: 'overloaded', 
    reason: `Show is ${overMinutes} minute${overMinutes !== 1 ? 's' : ''} over target` 
  };
};

const HEALTH_CONFIG = {
  healthy: {
    label: 'On Track',
    icon: CheckCircle2,
    className: 'bg-runway-success/20 text-runway-success border-runway-success/30',
  },
  tight: {
    label: 'Tight',
    icon: AlertTriangle,
    className: 'bg-runway-warning/20 text-runway-warning border-runway-warning/30',
  },
  overloaded: {
    label: 'Overloaded',
    icon: AlertCircle,
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

const ShowHealthIndicator: React.FC<ShowHealthIndicatorProps> = ({
  totalDuration,
  targetDuration = 7200, // Default 2 hours
  cueCount,
  className,
}) => {
  const { status, reason } = getHealthStatus(totalDuration, targetDuration, cueCount);
  const config = HEALTH_CONFIG[status];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] uppercase font-semibold px-2 py-0.5 cursor-help",
            config.className,
            className
          )}
        >
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{reason}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ShowHealthIndicator;
