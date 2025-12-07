import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Lock, 
  Unlock,
  GripVertical,
  Music,
  Video,
  Lightbulb,
  Mic,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface TrackHeaderProps {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  expanded: boolean;
  muted?: boolean;
  locked?: boolean;
  cueCount: number;
  onToggleExpand: () => void;
  onToggleMute: () => void;
  onToggleLock: () => void;
  compact?: boolean;
}

const TRACK_COLORS = {
  audio: { bg: 'bg-runway-teal/20', border: 'border-runway-teal', icon: 'text-runway-teal', badge: 'bg-runway-teal' },
  video: { bg: 'bg-runway-success/20', border: 'border-runway-success', icon: 'text-runway-success', badge: 'bg-runway-success' },
  lighting: { bg: 'bg-runway-highlight/20', border: 'border-runway-highlight', icon: 'text-runway-highlight', badge: 'bg-runway-highlight' },
  stage: { bg: 'bg-runway-warning/20', border: 'border-runway-warning', icon: 'text-runway-warning', badge: 'bg-runway-warning' },
};

const TRACK_ICONS = {
  audio: Music,
  video: Video,
  lighting: Lightbulb,
  stage: Mic,
};

const TrackHeader: React.FC<TrackHeaderProps> = ({
  id,
  name,
  type,
  expanded,
  muted,
  locked,
  cueCount,
  onToggleExpand,
  onToggleMute,
  onToggleLock,
  compact = false,
}) => {
  const colors = TRACK_COLORS[type];
  const Icon = TRACK_ICONS[type];

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 border-b border-border group",
        compact ? "h-8" : "h-10",
        colors.bg,
        `border-l-2 ${colors.border}`
      )}
    >
      {/* Drag Handle */}
      <div className="opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Expand/Collapse */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-0"
        onClick={onToggleExpand}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Track Icon & Type Badge */}
      <div className={cn("flex items-center justify-center h-6 w-6 rounded", colors.bg)}>
        <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
      </div>

      {/* Track Name */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-medium text-sm truncate flex-1 max-w-[120px]">{name}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{name}</TooltipContent>
      </Tooltip>

      {/* Cue Count Badge */}
      {cueCount > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-mono">
          {cueCount}
        </Badge>
      )}

      {/* Track Controls */}
      <div className="flex items-center gap-0.5 ml-auto opacity-60 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 p-0", muted && "text-destructive")}
              onClick={onToggleMute}
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{muted ? 'Unmute' : 'Mute'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 p-0", locked && "text-runway-warning")}
              onClick={onToggleLock}
            >
              {locked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Unlock className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{locked ? 'Unlock' : 'Lock'}</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Rename Track</DropdownMenuItem>
            <DropdownMenuItem>Duplicate Track</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Delete Track</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TrackHeader;
