import React from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ViewMode } from '@/types/cue';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange, className }) => {
  const views = [
    { mode: 'timeline' as ViewMode, icon: LayoutGrid, label: 'Timeline View', shortcut: 'Ctrl+1' },
    { mode: 'table' as ViewMode, icon: Table2, label: 'Table View', shortcut: 'Ctrl+2' },
  ];

  return (
    <div className={cn("flex items-center bg-muted/50 rounded-lg p-0.5", className)}>
      {views.map(({ mode, icon: Icon, label, shortcut }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === mode ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 gap-1.5 text-xs transition-all",
                viewMode === mode 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onViewModeChange(mode)}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label} ({shortcut})</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default ViewToggle;
