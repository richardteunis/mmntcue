import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ShowMode } from './ShowOperationsBar';

interface ModeHeaderProps {
  mode: ShowMode;
  className?: string;
}

const MODE_CONFIG = {
  planning: {
    label: 'Planning',
    subtitle: 'Build & structure the show',
    icon: '📋',
    color: 'bg-primary/10 border-primary/30 text-primary',
    accentColor: 'text-primary',
  },
  rehearsal: {
    label: 'Rehearsal',
    subtitle: 'Test and capture issues',
    icon: '🎭',
    color: 'bg-runway-warning/10 border-runway-warning/30 text-runway-warning',
    accentColor: 'text-runway-warning',
  },
  live: {
    label: 'Live',
    subtitle: 'Execute — equipment active',
    icon: '🔴',
    color: 'bg-destructive/10 border-destructive/30 text-destructive',
    accentColor: 'text-destructive',
  },
};

const ModeHeader: React.FC<ModeHeaderProps> = ({ mode, className }) => {
  const config = MODE_CONFIG[mode];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs uppercase font-semibold px-2 py-0.5 transition-all duration-300",
          config.color
        )}
      >
        {config.icon} {config.label}
      </Badge>
      <span className={cn("text-xs", config.accentColor, "opacity-70")}>
        {config.subtitle}
      </span>
    </div>
  );
};

export default ModeHeader;
