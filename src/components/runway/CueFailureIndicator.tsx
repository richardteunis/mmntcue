import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, SkipForward, RotateCcw } from 'lucide-react';

export type CueFailureState = 'delayed' | 'skipped' | 'retried' | null;

interface CueFailureIndicatorProps {
  state: CueFailureState;
  className?: string;
}

const FAILURE_CONFIG = {
  delayed: {
    label: 'Delayed',
    icon: AlertTriangle,
    className: 'bg-runway-warning/20 text-runway-warning border-runway-warning/30',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    className: 'bg-muted text-muted-foreground border-border',
  },
  retried: {
    label: 'Retried',
    icon: RotateCcw,
    className: 'bg-primary/20 text-primary border-primary/30',
  },
};

const CueFailureIndicator: React.FC<CueFailureIndicatorProps> = ({
  state,
  className,
}) => {
  if (!state) return null;
  
  const config = FAILURE_CONFIG[state];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] uppercase font-semibold px-1.5 py-0",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
};

export default CueFailureIndicator;
