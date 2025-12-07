import React from 'react';
import { ViewMode } from '@/types/cue';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === 'timeline' && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange('timeline')}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Timeline</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === 'table' && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange('table')}
      >
        <Table2 className="h-4 w-4" />
        <span className="hidden sm:inline">Table</span>
      </Button>
    </div>
  );
};

export default ViewToggle;
