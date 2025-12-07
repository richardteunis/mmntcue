import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ZoomControlsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  className?: string;
}

const ZOOM_PRESETS = [
  { label: 'Fit to Window', value: 1 },
  { label: '15 seconds', value: 3 },
  { label: '30 seconds', value: 2 },
  { label: '1 minute', value: 1.5 },
  { label: '5 minutes', value: 0.5 },
];

const ZoomControls: React.FC<ZoomControlsProps> = ({ scale, onScaleChange, className }) => {
  const handleZoomIn = () => {
    onScaleChange(Math.min(scale * 1.25, 4));
  };

  const handleZoomOut = () => {
    onScaleChange(Math.max(scale / 1.25, 0.25));
  };

  return (
    <div className={cn("flex items-center gap-1 bg-muted/50 rounded-lg p-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom Out</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 min-w-[60px] font-mono text-xs"
          >
            {Math.round(scale * 100)}%
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {ZOOM_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.label}
              onClick={() => onScaleChange(preset.value)}
              className={cn(
                "cursor-pointer",
                scale === preset.value && "bg-primary/10"
              )}
            >
              <Maximize2 className="h-3.5 w-3.5 mr-2 opacity-50" />
              {preset.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ZoomControls;
